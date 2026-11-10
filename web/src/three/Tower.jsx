import { useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import {
  FLOORS,
  FLOOR_H,
  TOWER_W,
  TOWER_D,
  TOWER_H,
  ZONE_BASE_END,
  ZONE_TOP_START,
  PALETTE,
  sceneState,
} from '../config'

// Column layouts per facade, measured off the drone footage:
// w = punched window, l = full-height loggia with railing, s = solid panel.
const FRONT = [
  ['w', 1.8], ['s', 1.2], ['w', 1.8], ['s', 0.9], ['l', 5.2], ['s', 0.5],
  ['l', 5.2], ['s', 0.9], ['w', 1.8], ['s', 1.2], ['w', 1.8],
]
const SIDE = [['w', 1.6], ['s', 1.0], ['l', 4.6], ['s', 0.6], ['w', 1.6], ['s', 1.0], ['w', 1.6]]

const FACES = [
  { rotY: 0, n: [0, 0, 1], t: [1, 0, 0], half: TOWER_D / 2, width: TOWER_W, cols: FRONT },
  { rotY: Math.PI / 2, n: [1, 0, 0], t: [0, 0, -1], half: TOWER_W / 2, width: TOWER_D, cols: SIDE },
  { rotY: Math.PI, n: [0, 0, -1], t: [-1, 0, 0], half: TOWER_D / 2, width: TOWER_W, cols: [...FRONT].reverse() },
  { rotY: -Math.PI / 2, n: [-1, 0, 0], t: [0, 0, 1], half: TOWER_W / 2, width: TOWER_D, cols: [...SIDE].reverse() },
]

function seeded(seed) {
  let s = seed
  return () => {
    s = (s * 16807) % 2147483647
    return (s - 1) / 2147483646
  }
}

function buildInstances() {
  const glass = []
  const lit = []
  const frames = []
  const rails = []
  const stripes = []
  const rnd = seeded(7)

  for (const f of FACES) {
    const total = f.cols.reduce((a, c) => a + c[1], 0)
    let u = -total / 2
    const cols = f.cols.map(([type, w]) => {
      const c = { type, w, u: u + w / 2 }
      u += w
      return c
    })

    const place = (list, cu, y, off, sx, sy, sz) => {
      list.push({
        p: [
          f.n[0] * (f.half + off) + f.t[0] * cu,
          y,
          f.n[2] * (f.half + off) + f.t[2] * cu,
        ],
        r: f.rotY,
        s: [sx, sy, sz],
      })
    }

    // Dark vertical "keys" running through the light middle zone.
    for (const c of cols) {
      if (c.type === 's' && c.w >= 1.0) {
        const y0 = ZONE_BASE_END * FLOOR_H
        const y1 = ZONE_TOP_START * FLOOR_H
        place(stripes, c.u, (y0 + y1) / 2, 0.015, c.w * 0.62, y1 - y0, 0.03)
      }
    }

    for (let i = 0; i < FLOORS; i++) {
      const y0 = i * FLOOR_H
      const isBase = i < ZONE_BASE_END
      for (const c of cols) {
        if (c.type === 's') continue
        if (c.type === 'w' && !isBase) {
          const h = 1.95
          const yc = y0 + 0.85 + h / 2
          place(rnd() < 0.26 ? lit : glass, c.u, yc, 0.03, c.w, h, 0.04)
          place(frames, c.u, yc, 0.06, 0.07, h, 0.05) // mullion
          place(frames, c.u, y0 + 0.82, 0.07, c.w + 0.14, 0.08, 0.12) // sill
        } else {
          // loggia or shopfront: full height glazing
          const h = FLOOR_H - 0.32
          const yc = y0 + 0.3 + h / 2
          place(rnd() < 0.26 ? lit : glass, c.u, yc, 0.03, c.w, h, 0.04)
          const bays = Math.max(1, Math.round(c.w / 1.3))
          for (let b = 0; b <= bays; b++) {
            const bu = c.u - c.w / 2 + (b * c.w) / bays
            place(frames, bu, yc, 0.06, 0.06, h, 0.05)
          }
          place(frames, c.u, y0 + 0.14, 0.14, c.w + 0.2, 0.28, 0.28) // slab edge
          if (!isBase) place(rails, c.u, y0 + 0.3 + 0.55, 0.26, c.w - 0.1, 1.1, 0.03)
        }
      }
    }
  }
  return { glass, lit, frames, rails, stripes }
}

function Instances({ items, material, castShadow = false }) {
  const ref = useRef()
  const geo = useMemo(() => new THREE.BoxGeometry(1, 1, 1), [])
  useLayoutEffect(() => {
    const d = new THREE.Object3D()
    items.forEach((it, i) => {
      d.position.set(...it.p)
      d.rotation.set(0, it.r, 0)
      d.scale.set(...it.s)
      d.updateMatrix()
      ref.current.setMatrixAt(i, d.matrix)
    })
    ref.current.instanceMatrix.needsUpdate = true
    ref.current.computeBoundingSphere()
  }, [items])
  return (
    <instancedMesh ref={ref} args={[geo, material, items.length]} castShadow={castShadow} frustumCulled={false} />
  )
}

export default function Tower({ clippingPlanes }) {
  const group = useRef()
  const data = useMemo(buildInstances, [])

  const mats = useMemo(() => {
    const common = { clippingPlanes, clipShadows: true }
    return {
      base: new THREE.MeshStandardMaterial({ color: PALETTE.facadeBase, roughness: 0.85, ...common }),
      mid: new THREE.MeshStandardMaterial({ color: PALETTE.facadeMid, roughness: 0.75, ...common }),
      top: new THREE.MeshStandardMaterial({ color: PALETTE.facadeTop, roughness: 0.7, ...common }),
      stripe: new THREE.MeshStandardMaterial({ color: PALETTE.stripe, roughness: 0.7, ...common }),
      frame: new THREE.MeshStandardMaterial({ color: PALETTE.frame, roughness: 0.5, metalness: 0.4, ...common }),
      rail: new THREE.MeshStandardMaterial({
        color: '#1E2125', roughness: 0.6, metalness: 0.3, transparent: true, opacity: 0.82, ...common,
      }),
      glass: new THREE.MeshStandardMaterial({
        color: PALETTE.glass, roughness: 0.12, metalness: 0.62, envMapIntensity: 1.4, ...common,
      }),
      lit: new THREE.MeshStandardMaterial({
        color: PALETTE.glass, roughness: 0.12, metalness: 0.62, envMapIntensity: 1.4,
        emissive: new THREE.Color('#FFC98A'), emissiveIntensity: 0, ...common,
      }),
      roof: new THREE.MeshStandardMaterial({ color: '#8A8E93', roughness: 0.8, ...common }),
    }
  }, [clippingPlanes])

  useFrame(() => {
    group.current.visible = sceneState.towerVis > 0.01
    mats.lit.emissiveIntensity = sceneState.night * 1.6
    mats.lit.metalness = 0.75 - sceneState.night * 0.5
  })

  const baseH = ZONE_BASE_END * FLOOR_H
  const midH = (ZONE_TOP_START - ZONE_BASE_END) * FLOOR_H
  const topH = TOWER_H - ZONE_TOP_START * FLOOR_H
  const coreW = TOWER_W - 0.02
  const coreD = TOWER_D - 0.02

  return (
    <group ref={group}>
      <mesh material={mats.base} position={[0, baseH / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[coreW, baseH, coreD]} />
      </mesh>
      <mesh material={mats.mid} position={[0, baseH + midH / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[coreW, midH, coreD]} />
      </mesh>
      <mesh material={mats.top} position={[0, TOWER_H - topH / 2 + 1.2 / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[coreW, topH + 1.2, coreD]} />
      </mesh>
      {/* rooftop plant rooms */}
      <mesh material={mats.top} position={[-4, TOWER_H + 2.6, -1.5]} castShadow>
        <boxGeometry args={[9, 3.2, 7]} />
      </mesh>
      <mesh material={mats.roof} position={[5, TOWER_H + 1.9, 2]} castShadow>
        <boxGeometry args={[4, 1.8, 3]} />
      </mesh>
      <mesh material={mats.frame} position={[8.5, TOWER_H + 3.2, -4]}>
        <cylinderGeometry args={[0.08, 0.08, 4, 6]} />
      </mesh>
      <Instances items={data.stripes} material={mats.stripe} />
      <Instances items={data.glass} material={mats.glass} />
      <Instances items={data.lit} material={mats.lit} />
      <Instances items={data.frames} material={mats.frame} />
      <Instances items={data.rails} material={mats.rail} />
    </group>
  )
}
