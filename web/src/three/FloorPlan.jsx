import { useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { PALETTE, PLAN_Y, ROOMS, TOWER_W, TOWER_D, sceneState } from '../config'

const HW = TOWER_W / 2
const HD = TOWER_D / 2
const WALL_H = 2.8
const SILL_H = 0.9

// Wall segment helper: [x1, z1, x2, z2, thickness, height]
const seg = (x1, z1, x2, z2, t = 0.14, h = WALL_H) => [x1, z1, x2, z2, t, h]

function buildWalls() {
  const walls = []
  // exterior: sill-height parapet all round + full-height piers between windows
  walls.push(seg(-HW, HD, HW, HD, 0.3, SILL_H), seg(-HW, -HD, HW, -HD, 0.3, SILL_H))
  walls.push(seg(-HW, -HD, -HW, HD, 0.3, SILL_H), seg(HW, -HD, HW, HD, 0.3, SILL_H))
  for (let x = -HW; x <= HW + 0.01; x += 3.25) {
    walls.push(seg(x - 0.35, HD, x + 0.35, HD, 0.3), seg(x - 0.35, -HD, x + 0.35, -HD, 0.3))
  }
  for (let z = -HD; z <= HD + 0.01; z += 2.83) {
    walls.push(seg(-HW, z - 0.35, -HW, z + 0.35, 0.3), seg(HW, z - 0.35, HW, z + 0.35, 0.3))
  }
  // corridor (with door gaps)
  walls.push(seg(-10, 2, -7.2, 2), seg(-6.2, 2, -1.2, 2), seg(-0.2, 2, 2.2, 2), seg(3.2, 2, 10, 2))
  walls.push(seg(-10, -2, -8, -2), seg(-7, -2, 0.6, -2), seg(1.6, -2, 6, -2), seg(7, -2, 10, -2))
  walls.push(seg(-10, -2, -10, 2), seg(10, -2, 10, 2))
  // apartment party walls
  walls.push(seg(-4, 2, -4, HD, 0.22), seg(2, 2, 2, HD, 0.22))
  walls.push(seg(-5, -HD, -5, -2, 0.22), seg(4, -HD, 4, -2, 0.22))
  walls.push(seg(-HW, 2, -10, 2, 0.22), seg(-HW, -2, -10, -2, 0.22), seg(10, -2, HW, -2, 0.22))
  // featured apartment (x 2..13, z 2..8.5)
  walls.push(seg(8.5, 2, 8.5, 2.35), seg(8.5, 3.25, 8.5, 4.6), seg(8.5, 5.5, 8.5, HD))
  walls.push(seg(8.5, 4.2, HW, 4.2))
  walls.push(seg(2, 3.6, 5.2, 3.6))
  // neighbours: a few partitions so the floor reads as real flats
  walls.push(seg(-4, 4.4, -1, 4.4), seg(-8.5, 2, -8.5, 5.2), seg(-8.5, 6.2, -8.5, HD))
  walls.push(seg(-HW, 5, -10.5, 5), seg(-5, -5, -1.5, -5), seg(0.5, -5, 4, -5))
  walls.push(seg(8, -HD, 8, -4.5), seg(8, -3.5, 8, -2), seg(-9, -HD, -9, -5), seg(-9, -4, -9, -2))
  return walls
}

// Furniture as clay blocks: [x, z, w, d, h]
const FURNITURE = [
  // living-kitchen
  [5.0, 8.0, 2.6, 0.9, 0.75], [5.0, 6.8, 1.2, 0.7, 0.38], [2.35, 5.9, 0.6, 3.4, 0.9],
  [3.7, 5.4, 0.9, 1.9, 0.9], [7.0, 4.6, 1.7, 0.9, 0.75],
  [6.55, 4.0, 0.45, 0.45, 0.85], [7.45, 4.0, 0.45, 0.45, 0.85], [6.55, 5.2, 0.45, 0.45, 0.85], [7.45, 5.2, 0.45, 0.45, 0.85],
  [7.9, 7.7, 0.9, 0.9, 0.8],
  // bedroom
  [11.85, 6.6, 2.1, 1.9, 0.5], [12.85, 6.6, 0.12, 1.9, 1.1], [12.6, 5.2, 0.45, 0.45, 0.5], [12.6, 8.0, 0.45, 0.45, 0.5],
  [10.4, 4.65, 3.4, 0.6, 2.2],
  // bath
  [12.1, 2.55, 1.7, 0.8, 0.55], [9.65, 2.35, 1.4, 0.5, 0.85], [10.95, 3.85, 0.42, 0.6, 0.45],
  // hallway
  [3.6, 2.3, 2.4, 0.45, 2.2],
  // loggia
  [4.4, 9.2, 0.6, 0.6, 0.75], [6.4, 9.2, 0.6, 0.6, 0.75], [5.4, 9.2, 0.6, 0.6, 0.5],
  // neighbours
  [-7.0, 7.4, 2.6, 0.9, 0.75], [-2.0, 6.8, 1.8, 2.0, 0.5], [-11.2, 7.3, 2.0, 1.8, 0.5], [-1.5, 2.6, 2.0, 0.6, 0.9],
  [-8.0, -7.2, 2.6, 0.9, 0.75], [-3.2, -6.8, 2.0, 1.8, 0.5], [1.5, -7.4, 2.6, 0.9, 0.75], [6.0, -6.9, 1.8, 2.0, 0.5],
  [10.5, -7.3, 2.6, 0.9, 0.75], [-11.5, -7.0, 1.8, 2.0, 0.5],
]

// Core: lifts and stairs as solid volume
const CORE = [[0, 0, 5.6, 3.4, WALL_H]]

// Room floors of the featured flat: [x1, z1, x2, z2] in ROOMS order
const ROOM_FLOORS = [
  [2.07, 3.67, 8.43, 8.5],
  [8.57, 4.27, 12.85, 8.5],
  [8.57, 2.07, 12.85, 4.13],
  [3, 8.65, 8, 9.75],
]

function useBoxes(ref, boxes) {
  useLayoutEffect(() => {
    const d = new THREE.Object3D()
    boxes.forEach((b, i) => {
      d.position.set(b.x, b.y, b.z)
      d.rotation.set(0, b.ry || 0, 0)
      d.scale.set(b.sx, b.sy, b.sz)
      d.updateMatrix()
      ref.current.setMatrixAt(i, d.matrix)
    })
    ref.current.instanceMatrix.needsUpdate = true
    ref.current.computeBoundingSphere()
  }, [boxes, ref])
}

export default function FloorPlan({ shadows = true }) {
  const group = useRef()
  const growGroup = useRef()
  const wallsRef = useRef()
  const furnRef = useRef()
  const floorMats = useRef([])

  const { wallBoxes, furnBoxes } = useMemo(() => {
    const wallBoxes = buildWalls().map(([x1, z1, x2, z2, t, h]) => {
      const len = Math.hypot(x2 - x1, z2 - z1)
      return {
        x: (x1 + x2) / 2, y: h / 2, z: (z1 + z2) / 2,
        ry: -Math.atan2(z2 - z1, x2 - x1), sx: len + t, sy: h, sz: t,
      }
    })
    const furnBoxes = [...FURNITURE, ...CORE].map(([x, z, w, d, h]) => ({ x, y: h / 2, z, sx: w, sy: h, sz: d }))
    return { wallBoxes, furnBoxes }
  }, [])

  useBoxes(wallsRef, wallBoxes)
  useBoxes(furnRef, furnBoxes)

  const box = useMemo(() => new THREE.BoxGeometry(1, 1, 1), [])
  const clay = useMemo(() => new THREE.MeshStandardMaterial({ color: PALETTE.clay, roughness: 0.92, fog: false }), [])
  const baseColor = useMemo(() => new THREE.Color(PALETTE.clayFloor), [])
  const focusColor = useMemo(() => new THREE.Color(PALETTE.focus), [])

  useFrame(() => {
    const s = sceneState
    group.current.visible = s.planVis > 0.01
    const g = Math.max(0.001, s.planGrow)
    growGroup.current.scale.set(1, g, 1)
    floorMats.current.forEach((m, i) => {
      if (!m) return
      const k = Math.max(0, 1 - Math.abs(s.room - i))
      m.color.copy(baseColor).lerp(focusColor, k)
    })
  })

  return (
    <group ref={group} position={[0, PLAN_Y, 0]}>
      {/* slab */}
      <mesh position={[0, -0.15, 0]} receiveShadow castShadow={shadows}>
        <boxGeometry args={[TOWER_W + 0.4, 0.3, TOWER_D + 0.4]} />
        <meshStandardMaterial color="#E4E0D9" roughness={0.95} fog={false} />
      </mesh>
      {/* loggia slab */}
      <mesh position={[5.5, -0.15, 9.25]} receiveShadow>
        <boxGeometry args={[5.4, 0.3, 1.5]} />
        <meshStandardMaterial color="#E4E0D9" roughness={0.95} fog={false} />
      </mesh>
      {ROOM_FLOORS.map(([x1, z1, x2, z2], i) => (
        <mesh key={ROOMS[i].id} position={[(x1 + x2) / 2, 0.012, (z1 + z2) / 2]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[x2 - x1, z2 - z1]} />
          <meshStandardMaterial ref={(m) => (floorMats.current[i] = m)} color={PALETTE.clayFloor} roughness={0.9} fog={false} />
        </mesh>
      ))}
      <group ref={growGroup}>
        <instancedMesh ref={wallsRef} args={[box, clay, wallBoxes.length]} castShadow={shadows} receiveShadow />
        <instancedMesh ref={furnRef} args={[box, clay, furnBoxes.length]} castShadow={shadows} receiveShadow />
        {/* loggia glass railing */}
        <mesh position={[5.5, 0.55, 9.95]}>
          <boxGeometry args={[5.4, 1.1, 0.05]} />
          <meshStandardMaterial color="#BFD3DD" transparent opacity={0.45} roughness={0.1} fog={false} />
        </mesh>
        {/* accents: artwork + plants, like the colour pops in the reference clay model */}
        <mesh position={[5.0, 1.6, 8.43]}>
          <boxGeometry args={[1.4, 1.0, 0.05]} />
          <meshStandardMaterial color={PALETTE.terracotta} roughness={0.7} fog={false} />
        </mesh>
        {[[2.6, 8.0], [8.1, 4.1], [12.5, 8.2], [-3.4, 8.0], [-12.4, -8.0]].map(([x, z]) => (
          <mesh key={`${x}${z}`} position={[x, 0.55, z]} castShadow={shadows}>
            <icosahedronGeometry args={[0.38, 1]} />
            <meshStandardMaterial color={PALETTE.plant} roughness={0.9} flatShading fog={false} />
          </mesh>
        ))}
      </group>
    </group>
  )
}
