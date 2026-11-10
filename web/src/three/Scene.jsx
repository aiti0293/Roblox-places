import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Environment, Lightformer } from '@react-three/drei'
import * as THREE from 'three'
import Tower from './Tower'
import Surroundings from './Surroundings'
import FloorPlan from './FloorPlan'
import { PALETTE, sceneState } from '../config'

const C = (hex) => new THREE.Color(hex)
const SKY_TOP = C(PALETTE.skyTop)
const SKY_LOW = C(PALETTE.skyLow)
const PAPER = C(PALETTE.paper)
const G_TOP = C(PALETTE.greenTop)
const G_LOW = C(PALETTE.greenLow)

function SkyDome() {
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
        uniforms: { top: { value: SKY_TOP.clone() }, low: { value: SKY_LOW.clone() } },
        vertexShader: /* glsl */ `
          varying vec3 vDir;
          void main() {
            vDir = normalize(position);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }`,
        fragmentShader: /* glsl */ `
          uniform vec3 top; uniform vec3 low; varying vec3 vDir;
          void main() {
            float h = smoothstep(-0.05, 0.55, vDir.y);
            gl_FragColor = vec4(mix(low, top, h), 1.0);
            #include <colorspace_fragment>
          }`,
      }),
    [],
  )
  const ref = useRef()
  const { scene, camera } = useThree()
  const top = useMemo(() => new THREE.Color(), [])
  const low = useMemo(() => new THREE.Color(), [])

  useFrame(() => {
    const s = sceneState
    top.copy(SKY_TOP).lerp(PAPER, s.bgPaper).lerp(G_TOP, s.bgGreen)
    low.copy(SKY_LOW).lerp(PAPER, s.bgPaper).lerp(G_LOW, s.bgGreen)
    mat.uniforms.top.value.copy(top)
    mat.uniforms.low.value.copy(low)
    ref.current.position.copy(camera.position)
    scene.fog.color.copy(low)
    scene.fog.density = 0.0016 + s.bgPaper * 0.05 + s.bgGreen * 0.0022
  })

  return (
    <mesh ref={ref} material={mat} renderOrder={-1} frustumCulled={false}>
      <sphereGeometry args={[1200, 32, 16]} />
    </mesh>
  )
}

function CameraRig({ reducedMotion }) {
  const { camera, size } = useThree()
  const target = useMemo(() => new THREE.Vector3(), [])
  const look = useMemo(() => new THREE.Vector3(0, 40, 0), [])
  const pos = useMemo(() => new THREE.Vector3(60, 30, 80), [])
  const mouse = useRef({ x: 0, y: 0, sx: 0, sy: 0 })
  const first = useRef(true)

  useEffect(() => {
    if (reducedMotion) return undefined
    const onMove = (e) => {
      if (e.pointerType === 'touch') return
      mouse.current.x = (e.clientX / window.innerWidth) * 2 - 1
      mouse.current.y = (e.clientY / window.innerHeight) * 2 - 1
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    return () => window.removeEventListener('pointermove', onMove)
  }, [reducedMotion])

  useFrame((_, dt) => {
    const s = sceneState
    const aspect = size.width / size.height
    const portrait = aspect < 0.9
    // On portrait screens the tower is centred and the camera backs off to fit it.
    const shift = portrait ? 0.08 : 1
    // backs off more for the tall tower than for the flat plan
    const fit = portrait ? 1.55 - s.bgPaper * 0.2 : 1
    const r = s.r * (1 + s.intro * 0.35) * fit
    target.set(s.tgtX * shift, s.tgtY, s.tgtZ)
    const desired = new THREE.Vector3(
      target.x + Math.sin(s.az) * r,
      s.camY + s.intro * 12,
      target.z + Math.cos(s.az) * r,
    )

    // mouse parallax: camera drifts slightly, scaled by distance
    const m = mouse.current
    const k = 1 - Math.pow(0.002, dt)
    m.sx += (m.x - m.sx) * k
    m.sy += (m.y - m.sy) * k
    const par = r * 0.035
    desired.x += Math.cos(s.az) * m.sx * par
    desired.z -= Math.sin(s.az) * m.sx * par
    desired.y -= m.sy * par * 0.6

    // critically-damped follow on top of Lenis inertia gives the heavy, filmic feel
    const damp = first.current || reducedMotion ? 1 : 1 - Math.pow(0.0009, dt)
    first.current = false
    pos.lerp(desired, damp)
    look.lerp(target, damp)
    camera.position.copy(pos)
    camera.lookAt(look)
  })
  return null
}

const HEMI_SKY = C('#DCE8F5')
const HEMI_GROUND = C('#6F7466')
const WARM_SKY = C('#FFFDF8')
const WARM_GROUND = C('#D8D0C3')

function Lights({ shadows }) {
  const sun = useRef()
  const hemi = useRef()
  useFrame(() => {
    const s = sceneState
    // daylight on the tower, neutral studio light on the clay plan, dusk at the end
    sun.current.intensity = (2.6 + s.bgPaper * 0.6) * (1 - s.night * 0.85)
    hemi.current.intensity = 0.9 + s.bgPaper * 0.5 - s.night * 0.5
    hemi.current.color.copy(HEMI_SKY).lerp(WARM_SKY, s.bgPaper)
    hemi.current.groundColor.copy(HEMI_GROUND).lerp(WARM_GROUND, s.bgPaper)
  })
  return (
    <>
      <hemisphereLight ref={hemi} args={['#DCE8F5', '#6F7466', 0.9]} />
      <directionalLight
        ref={sun}
        position={[-60, 110, 70]}
        intensity={2.6}
        castShadow={shadows}
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-70}
        shadow-camera-right={70}
        shadow-camera-top={90}
        shadow-camera-bottom={-40}
        shadow-camera-near={10}
        shadow-camera-far={300}
        shadow-bias={-0.0004}
        shadow-normalBias={0.04}
      />
    </>
  )
}

export default function Scene({ lite = false, reducedMotion = false }) {
  const clippingPlanes = useMemo(
    () => [new THREE.Plane(new THREE.Vector3(0, 1, 0), 10), new THREE.Plane(new THREE.Vector3(0, -1, 0), 200)],
    [],
  )
  useFrame(() => {
    clippingPlanes[0].constant = -sceneState.clipLow
    clippingPlanes[1].constant = sceneState.clipHigh
  })

  return (
    <>
      <fogExp2 attach="fog" args={[PALETTE.skyLow, 0.0016]} />
      <SkyDome />
      <Lights shadows={!lite} />
      <Environment resolution={lite ? 64 : 256} frames={1}>
        {/* bright sky reflected in the glazing, with a few soft "clouds" */}
        <mesh scale={100}>
          <sphereGeometry args={[1, 32, 16]} />
          <meshBasicMaterial color="#A9B9C8" side={THREE.BackSide} />
        </mesh>
        <Lightformer form="rect" intensity={2.2} color="#FFFFFF" position={[0, 6, -12]} scale={[18, 4, 1]} />
        <Lightformer form="rect" intensity={1.4} color="#F4F7FB" position={[-12, 3, 6]} rotation-y={Math.PI / 2} scale={[14, 3, 1]} />
        <Lightformer form="rect" intensity={1.2} color="#FFFFFF" position={[12, 2, 4]} rotation-y={-Math.PI / 2} scale={[10, 2, 1]} />
        <Lightformer form="rect" intensity={0.6} color="#C9D3DA" position={[0, -6, 0]} rotation-x={-Math.PI / 2} scale={[40, 40, 1]} />
      </Environment>
      <Tower clippingPlanes={clippingPlanes} />
      <Surroundings lite={lite} />
      <FloorPlan shadows={!lite} />
      <CameraRig reducedMotion={reducedMotion} />
    </>
  )
}
