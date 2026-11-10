import { useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { sceneState } from '../config'

function seeded(seed) {
  let s = seed
  return () => {
    s = (s * 16807) % 2147483647
    return (s - 1) / 2147483646
  }
}

function useInstanced(ref, items) {
  useLayoutEffect(() => {
    const d = new THREE.Object3D()
    items.forEach((it, i) => {
      d.position.set(...it.p)
      d.rotation.set(0, it.r || 0, 0)
      d.scale.set(...it.s)
      d.updateMatrix()
      ref.current.setMatrixAt(i, d.matrix)
      if (it.c && ref.current.instanceColor !== undefined) ref.current.setColorAt(i, it.c)
    })
    ref.current.instanceMatrix.needsUpdate = true
    if (ref.current.instanceColor) ref.current.instanceColor.needsUpdate = true
  }, [items, ref])
}

// Low-rise context (two-storey barracks, trees, sports court) + a hazy city ring,
// echoing what surrounds the real building in the drone footage.
export default function Surroundings({ lite = false }) {
  const group = useRef()
  const houses = useRef()
  const roofs = useRef()
  const trees = useRef()
  const city = useRef()
  const trunks = useRef()
  const cars = useRef()
  const lamps = useRef()

  const data = useMemo(() => {
    const rnd = seeded(42)
    const near = []
    const roofList = []
    const treeList = []
    const trunkList = []
    const cars = []
    const lamps = []
    const cityList = []
    const houseColors = ['#D9D3C7', '#E3DED3', '#CFC7B8', '#BFB4A2'].map((c) => new THREE.Color(c))

    for (let i = 0; i < (lite ? 14 : 26); i++) {
      const a = rnd() * Math.PI * 2
      const d = 38 + rnd() * 80
      const x = Math.cos(a) * d
      const z = Math.sin(a) * d
      if (x > 14 && x < 64 && z > 6 && z < 44) continue // keep the sports court clear
      const w = 12 + rnd() * 10
      const dd = 8 + rnd() * 4
      const h = 6 + Math.floor(rnd() * 2) * 3
      const r = Math.round(rnd() * 4) * (Math.PI / 2) + (rnd() - 0.5) * 0.2
      near.push({ p: [x, h / 2, z], r, s: [w, h, dd], c: houseColors[Math.floor(rnd() * 4)] })
      roofList.push({ p: [x, h, z], r, s: [w + 0.6, 2.6, dd + 0.6] })
    }
    for (let i = 0; i < (lite ? 90 : 220); i++) {
      const a = rnd() * Math.PI * 2
      const d = 20 + rnd() * 140
      const x = Math.cos(a) * d
      const z = Math.sin(a) * d
      if (Math.abs(x) < 16 && Math.abs(z) < 12) continue
      if (x > 16 && x < 62 && z > 8 && z < 42) continue
      const s = 3.5 + rnd() * 5
      treeList.push({ p: [x, s * 1.05, z], s: [s, s * 1.15, s] })
      treeList.push({ p: [x + (rnd() - 0.5) * s * 0.4, s * 1.55, z + (rnd() - 0.5) * s * 0.4], s: [s * 0.7, s * 0.8, s * 0.7] })
      trunkList.push({ p: [x, s * 0.35, z], s: [0.35, s * 0.7, 0.35] })
    }
    for (let i = 0; i < (lite ? 70 : 180); i++) {
      const a = rnd() * Math.PI * 2
      const d = 340 + rnd() * 380 // beyond the farthest camera orbit (~280)
      const h = 14 + rnd() * rnd() * 70
      const w = 14 + rnd() * 26
      cityList.push({ p: [Math.cos(a) * d, h / 2, Math.sin(a) * d], r: rnd() * Math.PI, s: [w, h, 10 + rnd() * 14] })
    }
    // parking strip along the east side + a few cars on the street
    const carColors = ['#E8E9EA', '#2B2E33', '#8E949B', '#6B1F24', '#1F3A5C', '#C9CCCF'].map((c) => new THREE.Color(c))
    for (let i = 0; i < 9; i++) {
      if (rnd() < 0.2) continue
      cars.push({ p: [20, 0.75, -14 + i * 2.7], r: Math.PI / 2, s: [4.3, 1.5, 1.8], c: carColors[Math.floor(rnd() * 6)] })
    }
    for (let i = 0; i < 6; i++) cars.push({ p: [-28 + i * 6.5, 0.75, -26], r: 0, s: [4.3, 1.5, 1.8], c: carColors[Math.floor(rnd() * 6)] })
    for (const [x, z] of [[-14, 13], [-4, 15], [17, -2], [17, -12], [-17, -4], [-17, 6]]) lamps.push({ p: [x, 2.5, z], s: [0.12, 5, 0.12] })
    return { near, roofList, treeList, trunkList, cityList, cars, lamps }
  }, [lite])

  useInstanced(houses, data.near)
  useInstanced(roofs, data.roofList)
  useInstanced(trees, data.treeList)
  useInstanced(city, data.cityList)
  useInstanced(trunks, data.trunkList)
  useInstanced(cars, data.cars)
  useInstanced(lamps, data.lamps)

  const box = useMemo(() => new THREE.BoxGeometry(1, 1, 1), [])
  const roofGeo = useMemo(() => {
    const g = new THREE.CylinderGeometry(0.5, 0.5, 1, 3, 1)
    g.rotateZ(Math.PI / 2)
    g.rotateX(-Math.PI / 2) // apex up
    g.scale(1, 1 / 1.5, 1 / 1.732)
    g.translate(0, 1 / 3, 0) // base at y = 0, unit height and depth
    return g
  }, [])
  const treeGeo = useMemo(() => new THREE.IcosahedronGeometry(0.5, 1), [])

  useFrame(() => {
    group.current.visible = sceneState.towerVis > 0.01 && sceneState.bgPaper < 0.98
  })

  return (
    <group ref={group}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[900, 48]} />
        <meshStandardMaterial color="#9AA592" roughness={1} />
      </mesh>
      {/* courtyard paving around the tower */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]} receiveShadow>
        <planeGeometry args={[52, 40]} />
        <meshStandardMaterial color="#C9C4BA" roughness={0.95} />
      </mesh>
      {/* sports court: running track + turquoise pitch */}
      <group position={[38, 0.05, 24]} rotation={[0, -0.25, 0]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[40, 28]} />
          <meshStandardMaterial color="#A9564A" roughness={0.9} />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-6, 0.02, 0]} receiveShadow>
          <planeGeometry args={[18, 20]} />
          <meshStandardMaterial color="#7FB5AE" roughness={0.85} />
        </mesh>
        {[[0, 14, 40, 0], [0, -14, 40, 0], [20, 0, 28, Math.PI / 2], [-20, 0, 28, Math.PI / 2]].map(([x, z, l, r]) => (
          <mesh key={`f${x}${z}`} position={[x, 1.5, z]} rotation={[0, r, 0]}>
            <boxGeometry args={[l, 3, 0.05]} />
            <meshStandardMaterial color="#3F6B4A" transparent opacity={0.35} roughness={0.8} />
          </mesh>
        ))}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[9, 0.02, 0]} receiveShadow>
          <planeGeometry args={[12, 20]} />
          <meshStandardMaterial color="#5E9A63" roughness={0.9} />
        </mesh>
      </group>
      <instancedMesh ref={houses} args={[box, undefined, data.near.length]} castShadow receiveShadow>
        <meshStandardMaterial roughness={0.9} />
      </instancedMesh>
      <instancedMesh ref={roofs} args={[roofGeo, undefined, data.roofList.length]} castShadow>
        <meshStandardMaterial color="#8E9196" roughness={0.8} />
      </instancedMesh>
      <instancedMesh ref={trees} args={[treeGeo, undefined, data.treeList.length]} castShadow={!lite}>
        <meshStandardMaterial color="#3E5A3A" roughness={1} flatShading />
      </instancedMesh>
      <instancedMesh ref={trunks} args={[box, undefined, data.trunkList.length]}>
        <meshStandardMaterial color="#4A3D33" roughness={1} />
      </instancedMesh>
      <instancedMesh ref={cars} args={[box, undefined, data.cars.length]} castShadow={!lite}>
        <meshStandardMaterial roughness={0.35} metalness={0.5} />
      </instancedMesh>
      <instancedMesh ref={lamps} args={[box, undefined, data.lamps.length]}>
        <meshStandardMaterial color="#2B2E33" roughness={0.5} metalness={0.5} />
      </instancedMesh>
      {/* dark brick pavilions in front of the tower, as on the 2GIS photo */}
      <mesh position={[-20, 1.6, 16]} castShadow={!lite} receiveShadow>
        <boxGeometry args={[7, 3.2, 5]} />
        <meshStandardMaterial color="#4B4240" roughness={0.9} />
      </mesh>
      <mesh position={[-27, 1.3, 12]} castShadow={!lite} receiveShadow>
        <boxGeometry args={[4, 2.6, 4]} />
        <meshStandardMaterial color="#3F3836" roughness={0.9} />
      </mesh>
      {/* playground pergola + benches */}
      <mesh position={[-9, 2.4, 19]} castShadow={!lite}>
        <boxGeometry args={[6, 0.15, 3]} />
        <meshStandardMaterial color="#2E3135" roughness={0.6} />
      </mesh>
      {[[-11.8, 17.7], [-6.2, 17.7], [-11.8, 20.3], [-6.2, 20.3]].map(([x, z]) => (
        <mesh key={`${x}${z}`} position={[x, 1.2, z]}>
          <boxGeometry args={[0.12, 2.4, 0.12]} />
          <meshStandardMaterial color="#2E3135" />
        </mesh>
      ))}
      {[[-8, 14], [0, 16.5], [-10, -13]].map(([x, z]) => (
        <mesh key={`b${x}${z}`} position={[x, 0.25, z]} castShadow={!lite}>
          <boxGeometry args={[2, 0.5, 0.6]} />
          <meshStandardMaterial color="#8A6B52" roughness={0.8} />
        </mesh>
      ))}
      <instancedMesh ref={city} args={[box, undefined, data.cityList.length]}>
        <meshStandardMaterial color="#C7CCD2" roughness={0.9} />
      </instancedMesh>
    </group>
  )
}
