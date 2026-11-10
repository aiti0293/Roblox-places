import { useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import {
  FLOORS, TOWER_W, TOWER_D, TOWER_H, PARAPET, GROUND_H, BAY,
  ZONE_BASE_END, ZONE_TOP_START, PALETTE, floorY, floorH, sceneState,
} from '../config'
import { brickTexture, panelTexture } from './textures'

/*
 * Procedural model of the Michurin tower, reconstructed from the drone footage:
 *  - 18 floors, double-height commercial ground floor, dark clinker plinth (floors 1–2),
 *    light cassette facade (3–13), graphite crown (14–18);
 *  - front facade: recessed balcony bay in the middle, flanked by full-height loggia
 *    stacks in projecting portals, punched windows on the wings, corner glazing;
 *  - side facade: a double loggia stack; rooftop plant rooms, vents and a mast.
 *
 * Column types: w = window, s = solid, l = loggia stack, L = double loggia stack,
 *               c = corner glazing, b = recessed balcony bay.
 */
const FRONT = [
  ['c', 1.2], ['s', 1.3], ['w', 1.6], ['s', 1.0], ['w', 1.6], ['s', 0.9], ['l', 3.4],
  ['b', 4.0],
  ['l', 3.4], ['s', 0.9], ['w', 1.6], ['s', 1.0], ['w', 1.6], ['s', 1.3], ['c', 1.2],
]
const SIDE = [['s', 1.2], ['w', 1.6], ['s', 1.4], ['w', 1.6], ['s', 1.6], ['L', 7.0], ['s', 1.2], ['w', 1.6], ['s', 0.8]]
const BACK = [
  ['s', 1.0], ['w', 1.6], ['s', 1.2], ['w', 1.6], ['s', 1.2], ['w', 1.6], ['s', 1.4], ['l', 5.8],
  ['s', 1.4], ['w', 1.6], ['s', 1.2], ['w', 1.6], ['s', 1.2], ['w', 1.6], ['s', 1.0],
]

const FACES = [
  { rotY: 0, n: [0, 0, 1], t: [1, 0, 0], half: TOWER_D / 2, cols: FRONT },
  { rotY: Math.PI / 2, n: [1, 0, 0], t: [0, 0, -1], half: TOWER_W / 2, cols: SIDE },
  { rotY: Math.PI, n: [0, 0, -1], t: [-1, 0, 0], half: TOWER_D / 2, cols: BACK },
  { rotY: -Math.PI / 2, n: [-1, 0, 0], t: [0, 0, 1], half: TOWER_W / 2, cols: [...SIDE].reverse() },
]

const zoneOf = (i) => (i < ZONE_BASE_END ? 'base' : i < ZONE_TOP_START ? 'mid' : 'top')

function seeded(seed) {
  let s = seed
  return () => {
    s = (s * 16807) % 2147483647
    return (s - 1) / 2147483646
  }
}

/* ── massing: merged boxes with UVs in world metres ───────────────────── */

function worldBox(w, h, d, x, y, z) {
  const g = new THREE.BoxGeometry(w, h, d)
  g.translate(x, y, z)
  const p = g.attributes.position
  const n = g.attributes.normal
  const uv = g.attributes.uv
  for (let i = 0; i < p.count; i++) {
    const nx = Math.abs(n.getX(i))
    const ny = Math.abs(n.getY(i))
    if (nx > 0.5) uv.setXY(i, p.getZ(i), p.getY(i))
    else if (ny > 0.5) uv.setXY(i, p.getX(i), p.getZ(i))
    else uv.setXY(i, p.getX(i), p.getY(i))
  }
  return g
}

function buildMassing() {
  const HW = TOWER_W / 2
  const HD = TOWER_D / 2
  const zBack = HD - BAY.depth // face of the recess
  const core = (y0, y1, withInfill) => {
    const h = y1 - y0
    const yc = (y0 + y1) / 2
    const list = [
      worldBox(TOWER_W, h, zBack + HD, 0, yc, (zBack - HD) / 2),
      worldBox(HW + BAY.x0, h, BAY.depth, (-HW + BAY.x0) / 2, yc, (zBack + HD) / 2),
      worldBox(HW - BAY.x1, h, BAY.depth, (HW + BAY.x1) / 2, yc, (zBack + HD) / 2),
    ]
    if (withInfill) list.push(worldBox(BAY.x1 - BAY.x0, h, BAY.depth, (BAY.x0 + BAY.x1) / 2, yc, (zBack + HD) / 2))
    return list
  }
  const yBase = floorY(ZONE_BASE_END)
  const yTop = floorY(ZONE_TOP_START)
  const roof = TOWER_H + PARAPET

  const base = [...core(0, GROUND_H, true), ...core(GROUND_H, yBase, false)]
  const mid = core(yBase, yTop, false)
  const top = [
    ...core(yTop, TOWER_H, false),
    ...core(TOWER_H, roof, true),
    // graphite lining of the recessed bay, full height
    worldBox(BAY.x1 - BAY.x0, roof - GROUND_H, 0.06, 0, (GROUND_H + roof) / 2, zBack + 0.03),
    worldBox(0.06, roof - GROUND_H, BAY.depth, BAY.x0 - 0.03, (GROUND_H + roof) / 2, (zBack + HD) / 2),
    worldBox(0.06, roof - GROUND_H, BAY.depth, BAY.x1 + 0.03, (GROUND_H + roof) / 2, (zBack + HD) / 2),
    // rooftop plant rooms and lift machine room
    worldBox(9, 3.4, 6.5, -3.5, roof + 1.7, -2.5),
    worldBox(4.2, 2.6, 3.4, 5.5, roof + 1.3, -4),
  ]
  // stone cornice bands over the plinth and along the parapet
  const band = (y, h, out) => [
    worldBox(HW + BAY.x0 + out, h, out * 2, (-HW + BAY.x0 - out) / 2, y, HD),
    worldBox(HW - BAY.x1 + out, h, out * 2, (HW + BAY.x1 + out) / 2, y, HD),
    worldBox(TOWER_W + out * 2, h, out * 2, 0, y, -HD),
    worldBox(out * 2, h, TOWER_D, HW, y, 0),
    worldBox(out * 2, h, TOWER_D, -HW, y, 0),
  ]
  const cornice = [...band(yBase, 0.36, 0.14), ...band(GROUND_H, 0.2, 0.1), ...band(roof - 0.12, 0.24, 0.08)]

  const merge = (l) => mergeGeometries(l, false)
  return { base: merge(base), mid: merge(mid), top: merge(top), cornice: merge(cornice) }
}

/* ── facade elements: instanced boxes ─────────────────────────────────── */

function buildFacade() {
  const L = {
    glass: [], glassDark: [], lit: [], frame: [], frameLight: [], slab: [],
    rail: [], spandrel: [], sill: [], ac: [], canopy: [],
  }
  const rnd = seeded(7)
  const glassList = () => (rnd() < 0.22 ? L.lit : L.glass)

  for (const f of FACES) {
    const total = f.cols.reduce((a, c) => a + c[1], 0)
    let u = -total / 2
    const cols = f.cols.map(([type, w]) => {
      const c = { type, w, u: u + w / 2 }
      u += w
      return c
    })
    // place a unit box: u along the facade, y up, off = distance in front of the face plane
    const put = (list, cu, y, off, sx, sy, sz) =>
      list.push({
        p: [f.n[0] * (f.half + off) + f.t[0] * cu, y, f.n[2] * (f.half + off) + f.t[2] * cu],
        r: f.rotY,
        s: [sx, sy, sz],
      })

    // full-height portals around loggia stacks
    for (const c of cols) {
      if (c.type !== 'l' && c.type !== 'L') continue
      const y0 = GROUND_H
      const y1 = TOWER_H + PARAPET
      const xs = [c.u - c.w / 2 + 0.14, c.u + c.w / 2 - 0.14]
      if (c.type === 'L') xs.push(c.u)
      xs.forEach((x) => put(L.frameLight, x, (y0 + y1) / 2, 0.2, 0.28, y1 - y0, 0.4))
      put(L.frameLight, c.u, y1 - 0.15, 0.2, c.w, 0.3, 0.4)
    }

    for (let i = 0; i < FLOORS; i++) {
      const y0 = floorY(i)
      const h = floorH(i)
      const zone = zoneOf(i)

      for (const c of cols) {
        if (c.type === 's') continue

        // ground floor: shopfronts and entrances
        if (i === 0) {
          if (c.type === 'b') {
            put(L.glass, c.u, 1.5, 0.02, 2.2, 2.6, 0.04)
            put(L.frame, c.u, 1.5, 0.05, 0.06, 2.6, 0.08)
            put(L.frame, c.u, 2.83, 0.05, 2.3, 0.08, 0.1)
            put(L.canopy, c.u, 3.4, 0.9, c.w + 0.6, 0.18, 1.8)
            continue
          }
          const gw = c.w - 0.24
          const gh = h - 1.0
          const yc = 0.35 + gh / 2
          put(rnd() < 0.5 ? L.lit : L.glass, c.u, yc, 0.02, gw, gh, 0.04)
          const n = Math.max(1, Math.round(gw / 1.4))
          for (let b = 0; b <= n; b++) put(L.frame, c.u - gw / 2 + (b * gw) / n, yc, 0.05, 0.07, gh, 0.09)
          put(L.frame, c.u, 3.0, 0.05, gw, 0.07, 0.09)
          put(L.frame, c.u, 0.35, 0.05, gw, 0.07, 0.09)
          continue
        }

        if (c.type === 'w') {
          const gw = c.w - 0.12
          const gh = 1.8
          const yc = y0 + 0.8 + gh / 2
          if (zone === 'top') put(L.spandrel, c.u, y0 + h / 2, 0.012, c.w + 0.1, h, 0.02)
          put(glassList(), c.u, yc, 0.02, gw, gh, 0.04)
          put(L.frame, c.u - gw / 2, yc, 0.05, 0.06, gh + 0.06, 0.08)
          put(L.frame, c.u + gw / 2, yc, 0.05, 0.06, gh + 0.06, 0.08)
          put(L.frame, c.u, yc + gh / 2, 0.05, gw, 0.06, 0.08)
          put(L.frame, c.u, yc - gh / 2, 0.05, gw, 0.06, 0.08)
          put(L.frame, c.u, yc, 0.05, 0.05, gh, 0.07)
          put(L.frame, c.u + gw / 4, yc + gh / 2 - 0.55, 0.05, gw / 2, 0.04, 0.06) // fanlight transom
          put(L.sill, c.u, y0 + 0.77, 0.09, c.w + 0.08, 0.06, 0.18)
          continue
        }

        if (c.type === 'l' || c.type === 'L' || c.type === 'c') {
          const inset = c.type === 'c' ? 0.06 : 0.3
          const gw = c.w - inset * 2
          const gh = h - 0.24
          const yc = y0 + 0.22 + gh / 2
          // lower opaque band behind the glass reads as the loggia parapet
          put(L.glassDark, c.u, y0 + 0.22 + 0.5, 0.015, gw, 1.0, 0.03)
          put(glassList(), c.u, yc + 0.5, 0.025, gw, gh - 1.0, 0.035)
          const n = Math.max(2, Math.round(gw / 1.15))
          for (let b = 0; b <= n; b++) put(L.frame, c.u - gw / 2 + (b * gw) / n, yc, 0.05, 0.05, gh, 0.07)
          put(L.frame, c.u, y0 + 1.22, 0.05, gw, 0.05, 0.07)
          put(c.type === 'c' ? L.frame : L.frameLight, c.u, y0 + 0.11, 0.15, c.w, 0.22, 0.3)
          continue
        }

        if (c.type === 'b') {
          // recessed balcony bay: slab, two balcony doors, AC unit, railing at the slab edge
          const back = -BAY.depth + 0.06
          put(L.slab, c.u, y0 + 0.11, -BAY.depth / 2, c.w, 0.22, BAY.depth)
          for (const dx of [-1.05, 1.05]) {
            const yc = y0 + 0.22 + 1.1
            put(glassList(), c.u + dx, yc, back + 0.02, 0.9, 2.2, 0.04)
            put(L.frame, c.u + dx - 0.47, yc, back + 0.05, 0.06, 2.26, 0.08)
            put(L.frame, c.u + dx + 0.47, yc, back + 0.05, 0.06, 2.26, 0.08)
            put(L.frame, c.u + dx, yc + 1.13, back + 0.05, 1.0, 0.06, 0.08)
          }
          put(L.ac, c.u, y0 + 0.55, back + 0.2, 0.8, 0.55, 0.3)
          put(L.rail, c.u, y0 + 1.2, -0.05, c.w - 0.06, 0.05, 0.06)
          put(L.rail, c.u, y0 + 0.32, -0.05, c.w - 0.06, 0.04, 0.04)
          const nb = Math.round(c.w / 0.13)
          for (let b = 0; b <= nb; b++) put(L.rail, c.u - (c.w - 0.1) / 2 + (b * (c.w - 0.1)) / nb, y0 + 0.75, -0.05, 0.018, 0.9, 0.018)
        }
      }
    }
  }
  // side entrance canopy
  L.canopy.push({ p: [TOWER_W / 2 + 0.9, 3.4, -5.2], r: 0, s: [1.8, 0.18, 3.6] })
  return L
}

function Instances({ items, material, castShadow = false, receiveShadow = false }) {
  const ref = useRef()
  const geo = useMemo(() => new THREE.BoxGeometry(1, 1, 1), [])
  useLayoutEffect(() => {
    if (!ref.current) return
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
  if (!items.length) return null
  return (
    <instancedMesh
      ref={ref}
      args={[geo, material, items.length]}
      castShadow={castShadow}
      receiveShadow={receiveShadow}
      frustumCulled={false}
    />
  )
}

export default function Tower({ clippingPlanes, lite = false }) {
  const group = useRef()
  const massing = useMemo(buildMassing, [])
  const facade = useMemo(buildFacade, [])

  const mats = useMemo(() => {
    const common = { clippingPlanes, clipShadows: true }
    const std = (o) => new THREE.MeshStandardMaterial({ ...common, ...o })
    return {
      base: std({ map: brickTexture(), color: '#A39A95', roughness: 0.92 }),
      mid: std({ map: panelTexture(PALETTE.facadeMid, '#C6CACE', 3), roughness: 0.78 }),
      top: std({ map: panelTexture(PALETTE.facadeTop, '#5A5F65', 5), roughness: 0.72 }),
      cornice: std({ color: '#3A3431', roughness: 0.85 }),
      frame: std({ color: PALETTE.frame, roughness: 0.45, metalness: 0.5 }),
      frameLight: std({ color: '#B4B8BD', roughness: 0.6, metalness: 0.15 }),
      slab: std({ color: '#9A9EA3', roughness: 0.85 }),
      rail: std({ color: '#1F2226', roughness: 0.5, metalness: 0.5 }),
      spandrel: std({ color: '#3E4247', roughness: 0.6 }),
      sill: std({ color: '#D3D6D9', roughness: 0.5, metalness: 0.3 }),
      ac: std({ color: '#D5D8DB', roughness: 0.6 }),
      canopy: std({ color: '#2E3135', roughness: 0.5, metalness: 0.4 }),
      glass: std({ color: PALETTE.glass, roughness: 0.08, metalness: 0.7, envMapIntensity: 1.5 }),
      glassDark: std({ color: '#2A3138', roughness: 0.25, metalness: 0.5, envMapIntensity: 0.8 }),
      lit: std({
        color: PALETTE.glass, roughness: 0.08, metalness: 0.7, envMapIntensity: 1.5,
        emissive: new THREE.Color('#FFC98A'), emissiveIntensity: 0,
      }),
      roofMetal: std({ color: '#B8BEC4', roughness: 0.35, metalness: 0.75 }),
    }
  }, [clippingPlanes])

  useFrame(() => {
    group.current.visible = sceneState.towerVis > 0.01
    mats.lit.emissiveIntensity = sceneState.night * 1.7
    mats.lit.metalness = 0.7 - sceneState.night * 0.5
  })

  const roof = TOWER_H + PARAPET
  const shadow = !lite

  return (
    <group ref={group}>
      <mesh geometry={massing.base} material={mats.base} castShadow={shadow} receiveShadow />
      <mesh geometry={massing.mid} material={mats.mid} castShadow={shadow} receiveShadow />
      <mesh geometry={massing.top} material={mats.top} castShadow={shadow} receiveShadow />
      <mesh geometry={massing.cornice} material={mats.cornice} castShadow={shadow} />

      {/* rooftop: silver ventilation drums, mast */}
      {[[7.5, 4.5], [9.2, 4.5], [10.9, 4.5]].map(([x, z]) => (
        <mesh key={x} material={mats.roofMetal} position={[x, roof + 0.8, z]} castShadow={shadow}>
          <cylinderGeometry args={[0.7, 0.7, 1.6, 20]} />
        </mesh>
      ))}
      <mesh material={mats.frame} position={[-6.5, roof + 3.4 + 3, -1]}>
        <cylinderGeometry args={[0.07, 0.1, 6, 6]} />
      </mesh>
      {[1.2, 2.4].map((dy) => (
        <mesh key={dy} material={mats.frame} position={[-6.5, roof + 3.4 + 3 + dy, -1]}>
          <boxGeometry args={[1.2, 0.05, 0.05]} />
        </mesh>
      ))}
      <mesh material={mats.slab} position={[-3.5, roof + 3.45, -2.5]}>
        <boxGeometry args={[9.2, 0.1, 6.7]} />
      </mesh>

      <Instances items={facade.spandrel} material={mats.spandrel} />
      <Instances items={facade.glass} material={mats.glass} />
      <Instances items={facade.glassDark} material={mats.glassDark} />
      <Instances items={facade.lit} material={mats.lit} />
      <Instances items={facade.frame} material={mats.frame} />
      <Instances items={facade.frameLight} material={mats.frameLight} castShadow={shadow} receiveShadow />
      <Instances items={facade.slab} material={mats.slab} castShadow={shadow} receiveShadow />
      <Instances items={facade.rail} material={mats.rail} />
      <Instances items={facade.sill} material={mats.sill} />
      <Instances items={facade.ac} material={mats.ac} />
      <Instances items={facade.canopy} material={mats.canopy} castShadow={shadow} />
    </group>
  )
}
