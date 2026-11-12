import { Suspense, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { ContactShadows, Environment, Lightformer } from '@react-three/drei'
import { easing } from 'maath'
import { Avatar } from './Avatar'
import { useViewStore } from '../store/useViewStore'

/** Студийный свет из Lightformer'ов — без загрузки HDR с CDN. */
function StudioEnvironment() {
  return (
    <Environment resolution={256} frames={1}>
      <color attach="background" args={['#f3ebe4']} />
      <Lightformer form="rect" intensity={2.2} color="#fff4ea" position={[0, 4, 3]} scale={[6, 3, 1]} target={[0, 1, 0]} />
      <Lightformer form="rect" intensity={1.6} color="#ffe6d2" position={[-4, 2, 2]} scale={[2, 5, 1]} target={[0, 1, 0]} />
      <Lightformer form="rect" intensity={1.2} color="#eef1ff" position={[4, 2.5, -3]} scale={[2, 5, 1]} target={[0, 1, 0]} />
      <Lightformer form="ring" intensity={0.6} color="#fff" position={[0, -2, 2]} scale={4} target={[0, 1, 0]} />
    </Environment>
  )
}

/**
 * Камера подбирает дистанцию так, чтобы манекен целиком помещался
 * и в узкой колонке, и на широком экране.
 */
function FitCamera({ width = 0.82, height = 1.92, centerY = 0.08 }) {
  const { camera, size } = useThree()
  useFrame((_, dt) => {
    const t = Math.tan((camera.fov * Math.PI) / 360)
    const aspect = size.width / size.height
    const dist = Math.max(height / 2 / t, width / 2 / (t * aspect))
    easing.damp3(camera.position, [0, centerY + dist * 0.16, dist], 0.25, dt)
    camera.lookAt(0, centerY, 0)
  })
  return null
}

/** Поворот манекена: цель из стора (кнопки и свайп), плавное догоняние. */
function Turntable({ children }) {
  const ref = useRef()
  useFrame((_, dt) => easing.damp(ref.current.rotation, 'y', useViewStore.getState().angle, 0.28, Math.min(dt, 0.05)))
  return <group ref={ref}>{children}</group>
}

export function Scene() {
  return (
    <Canvas shadows dpr={[1, 2]} camera={{ position: [0, 0.6, 4], fov: 26, near: 0.1, far: 50 }} gl={{ antialias: true, alpha: true }}>
      <ambientLight intensity={0.15} />
      <directionalLight position={[-2, 4, 3]} intensity={1.5} color="#fff3e8" castShadow shadow-mapSize={[1024, 1024]} shadow-bias={-0.0004} />
      <FitCamera />

      <Suspense fallback={null}>
        <StudioEnvironment />
        <group position={[0, -0.78, 0]}>
          <Turntable>
            <Avatar />
          </Turntable>
          <mesh position={[0, -0.02, 0]} receiveShadow>
            <cylinderGeometry args={[0.42, 0.44, 0.04, 64]} />
            <meshStandardMaterial color="#d8c6b8" roughness={0.75} />
          </mesh>
          <ContactShadows position={[0, 0.001, 0]} opacity={0.55} scale={1.6} blur={2.4} far={1.2} resolution={512} color="#6b5546" />
        </group>
      </Suspense>
    </Canvas>
  )
}
