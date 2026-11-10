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
  walls.push(seg(-10, 2, -7.2, 2), seg(-6.2, 2, -1.2, 2), seg(-0.2, 2, 4.0, 2), seg(5.0, 2, 9.2, 2))
  walls.push(seg(-10, -2, -8, -2), seg(-7, -2, 0.6, -2), seg(1.6, -2, 6, -2), seg(7, -2, 10, -2))
  walls.push(seg(-10, -2, -10, 2), seg(10, -2, 10, 2))
  // apartment party walls
  walls.push(seg(-4, 2, -4, HD, 0.22), seg(2, 2, 2, HD, 0.22))
  walls.push(seg(-5, -HD, -5, -2, 0.22), seg(4, -HD, 4, -2, 0.22))
  walls.push(seg(-HW, 2, -10, 2, 0.22), seg(-HW, -2, -10, -2, 0.22), seg(10, -2, HW, -2, 0.22))
  // featured flat 1К 39,10 м² (x 2..8.5, z 2..8.5), after the catalogue plan
  walls.push(seg(8.5, 2, 8.5, HD, 0.22)) // party wall
  walls.push(seg(5.5, 4.9, 5.5, HD)) // room | kitchen
  walls.push(seg(2, 4, 4.2, 4), seg(5.0, 4, 5.5, 4)) // room door
  walls.push(seg(3.4, 2, 3.4, 4)) // hall closet
  walls.push(seg(5.5, 2, 5.5, 2.5), seg(5.5, 3.3, 5.5, 3.5)) // bath door
  walls.push(seg(5.5, 3.5, 8.5, 3.5)) // bath | kitchen
  walls.push(seg(8.5, 4.8, 12, 4.8), seg(10.5, 2, 10.5, 4.8)) // neighbour
  // neighbours: a few partitions so the floor reads as real flats
  walls.push(seg(-4, 4.4, -1, 4.4), seg(-8.5, 2, -8.5, 5.2), seg(-8.5, 6.2, -8.5, HD))
  walls.push(seg(-HW, 5, -10.5, 5), seg(-5, -5, -1.5, -5), seg(0.5, -5, 4, -5))
  walls.push(seg(8, -HD, 8, -4.5), seg(8, -3.5, 8, -2), seg(-9, -HD, -9, -5), seg(-9, -4, -9, -2))
  return walls
}

// Furniture as clay blocks: [x, z, w, d, h]
const FURNITURE = [
  // kitchen-living
  [8.15, 5.7, 0.6, 2.8, 0.9], [8.15, 3.95, 0.6, 0.6, 1.9], [6.5, 6.5, 0.9, 0.9, 0.75],
  [6.5, 5.75, 0.42, 0.42, 0.85], [6.5, 7.25, 0.42, 0.42, 0.85], [6.3, 8.05, 1.6, 0.6, 0.7],
  // room
  [3.1, 6.4, 2.0, 1.6, 0.5], [2.15, 6.4, 0.1, 1.6, 1.0], [5.15, 6.9, 0.5, 2.0, 2.1], [4.4, 8.1, 1.2, 0.55, 0.75],
  [2.45, 5.25, 0.45, 0.45, 0.5],
  // bath
  [7.65, 2.42, 1.6, 0.7, 0.55], [6.05, 3.15, 0.55, 0.45, 0.85], [6.6, 2.35, 0.4, 0.6, 0.45], [8.15, 3.15, 0.55, 0.55, 0.85],
  // hall
  [2.7, 3.0, 1.3, 1.9, 2.2], [4.5, 2.3, 1.0, 0.4, 0.5],
  // loggia
  [6.4, 9.3, 0.6, 0.6, 0.75], [7.4, 9.3, 0.5, 0.5, 0.5],
  // neighbours
  [11.5, 6.8, 2.0, 1.8, 0.5], [9.6, 7.6, 1.8, 0.8, 0.75], [12.2, 3.0, 0.6, 2.0, 0.9],
  [-7.0, 7.4, 2.6, 0.9, 0.75], [-2.0, 6.8, 1.8, 2.0, 0.5], [-11.2, 7.3, 2.0, 1.8, 0.5], [-1.5, 2.6, 2.0, 0.6, 0.9],
  [-8.0, -7.2, 2.6, 0.9, 0.75], [-3.2, -6.8, 2.0, 1.8, 0.5], [1.5, -7.4, 2.6, 0.9, 0.75], [6.0, -6.9, 1.8, 2.0, 0.5],
  [10.5, -7.3, 2.6, 0.9, 0.75], [-11.5, -7.0, 1.8, 2.0, 0.5],
]

// Core: lifts and stairs as solid volume
const CORE = [[0, 0, 5.6, 3.4, WALL_H]]

// Room floors of the featured flat: [x1, z1, x2, z2] in ROOMS order
const ROOM_FLOORS = [
  [5.57, 3.57, 8.39, 8.5],
  [2.07, 4.07, 5.43, 8.5],
  [5.57, 2.07, 8.39, 3.43],
  [5.6, 8.65, 8.5, 9.85],
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
  // walls in the brand plan green, like the developer's 2D catalogue plans
  const wallMat = useMemo(() => new THREE.MeshStandardMaterial({ color: PALETTE.plant, roughness: 0.85, fog: false }), [])
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
        <meshStandardMaterial color="#E6E9E2" roughness={0.95} fog={false} />
      </mesh>
      {/* loggia slab */}
      <mesh position={[7.05, -0.15, 9.25]} receiveShadow>
        <boxGeometry args={[3.1, 0.3, 1.5]} />
        <meshStandardMaterial color="#E6E9E2" roughness={0.95} fog={false} />
      </mesh>
      {ROOM_FLOORS.map(([x1, z1, x2, z2], i) => (
        <mesh key={ROOMS[i].id} position={[(x1 + x2) / 2, 0.012, (z1 + z2) / 2]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[x2 - x1, z2 - z1]} />
          <meshStandardMaterial ref={(m) => (floorMats.current[i] = m)} color={PALETTE.clayFloor} roughness={0.9} fog={false} />
        </mesh>
      ))}
      <group ref={growGroup}>
        <instancedMesh ref={wallsRef} args={[box, wallMat, wallBoxes.length]} castShadow={shadows} receiveShadow />
        <instancedMesh ref={furnRef} args={[box, clay, furnBoxes.length]} castShadow={shadows} receiveShadow />
        {/* loggia glass railing */}
        <mesh position={[7.05, 0.55, 9.95]}>
          <boxGeometry args={[3.1, 1.1, 0.05]} />
          <meshStandardMaterial color="#BFD3DD" transparent opacity={0.45} roughness={0.1} fog={false} />
        </mesh>
        {/* accents: artwork + plants, like the colour pops in the reference clay model */}
        <mesh position={[2.13, 1.55, 6.4]} rotation={[0, Math.PI / 2, 0]}>
          <boxGeometry args={[1.2, 0.8, 0.05]} />
          <meshStandardMaterial color={PALETTE.terracotta} roughness={0.7} fog={false} />
        </mesh>
        {[[5.0, 8.1], [8.1, 8.1], [12.5, 8.2], [-3.4, 8.0], [-12.4, -8.0]].map(([x, z]) => (
          <mesh key={`${x}${z}`} position={[x, 0.55, z]} castShadow={shadows}>
            <icosahedronGeometry args={[0.38, 1]} />
            <meshStandardMaterial color="#9DB57A" roughness={0.9} flatShading fog={false} />
          </mesh>
        ))}
      </group>
    </group>
  )
}
