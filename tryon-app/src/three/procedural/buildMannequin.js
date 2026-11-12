import { BASE_BODY } from '../../lib/body.js'
import { ARMS_OUT } from '../../lib/pose.js'

/**
 * Строит гладкий манекен: одна сплошная сетка + морф-таргеты.
 *
 * 1. Поле базовой фигуры полигонизуется методом Surface Nets.
 * 2. Вершины «прилипают» к точной поверхности и равномерно
 *    расправляются (релаксация) — без ступенек и вытянутых треугольников.
 * 3. Для каждого морфа та же сетка проецируется на поверхность изменённой
 *    фигуры → одинаковая топология, как у shape keys из Blender.
 * Нормали — из градиента поля, поэтому затенение идеально гладкое.
 */

/** Какой морф = какое изменение обхватов (см). Должно совпадать с MORPH_MAP. */
export const MORPH_TARGETS = {
  Bust_Plus: { bust: +30 },
  Bust_Minus: { bust: -30 },
  Waist_Plus: { waist: +30 },
  Waist_Minus: { waist: -30 },
  Hips_Plus: { hips: +30 },
  Hips_Minus: { hips: -30 },
}

const BOUNDS = { min: [-0.38, -0.01, -0.2], max: [0.38, 1.505, 0.21] }

/**
 * @param make (body, extra) => makeBodySdf(body, { …, ...extra }) — тело или одежда
 */
export function buildMorphMesh(make, { cell = 0.0075, bounds = BOUNDS } = {}) {
  const base = make(BASE_BODY)
  const { positions, index } = surfaceNets(base.sdf, bounds, cell)
  const vCount = positions.length / 3
  const neighbors = buildNeighbors(index, vCount)

  project(base.sdf, positions, 6)
  for (let it = 0; it < 4; it++) {
    relax(positions, neighbors, 0.5)
    project(base.sdf, positions, 3)
  }
  const normals = gradientNormals(base.sdf, positions)

  // принадлежность вершин рукам (0…1): руки и корпус морфятся раздельно
  const armW = new Float32Array(vCount)
  const armS = new Int8Array(vCount)
  for (let v = 0; v < vCount; v++) {
    const r = base.armWeight(positions[v * 3], positions[v * 3 + 1], positions[v * 3 + 2])
    armW[v] = r.w
    armS[v] = r.side
  }

  // Размерные морфы считаются с руками в базовой позе; отведение рук —
  // отдельный морф Arms_Out (точный поворот на ARMS_OUT вокруг плеча).
  const jobs = Object.entries(MORPH_TARGETS).map(([name, delta]) => [
    name,
    make({ ...BASE_BODY, ...Object.fromEntries(Object.entries(delta).map(([k, v]) => [k, BASE_BODY[k] + v])) }, { armAngle: base.armAngle }),
    0,
  ])
  jobs.push(['Arms_Out', make(BASE_BODY, { armAngle: base.armAngle + ARMS_OUT }), ARMS_OUT])

  const morphs = {}
  for (const [name, target, dA] of jobs) {
    const p = positions.slice()
    const nrm = normals.slice()

    // 1) руки — как жёсткое целое: поворот вокруг плеча + сдвиг плеча
    for (let v = 0; v < vCount; v++) {
      const w = armW[v]
      if (w <= 0) continue
      const s = armS[v]
      const pb = base.pivots[s], pt = target.pivots[s]
      const a = s * dA, c = Math.cos(a), sn = Math.sin(a)
      const i = v * 3
      const lx = p[i] - pb[0], ly = p[i + 1] - pb[1]
      p[i] += (lx * c - ly * sn + pt[0] - p[i]) * w
      p[i + 1] += (lx * sn + ly * c + pt[1] - p[i + 1]) * w
      p[i + 2] += (pt[2] - pb[2]) * w
      const nx = nrm[i], ny = nrm[i + 1]
      nrm[i] += (nx * c - ny * sn - nx) * w
      nrm[i + 1] += (nx * sn + ny * c - ny) * w
    }

    // 2) сдвиг до новой поверхности строго вдоль нормали; корпус — к
    //    полю корпуса, руки — к полю рук (они не «цепляются» друг за друга)
    const pR = p.slice(), pA = p.slice()
    projectAlong(target.sdfRest, pR, nrm, 10, (v) => armW[v] < 1)
    projectAlong(target.sdfArm, pA, nrm, 10, (v) => armW[v] > 0)
    const nR = gradientNormals(target.sdfRest, pR)
    const nA = gradientNormals(target.sdfArm, pA)
    const n = new Float32Array(p.length)
    for (let v = 0; v < vCount; v++) {
      const w = armW[v], i = v * 3
      let l = 0
      for (let c = 0; c < 3; c++) {
        p[i + c] = pR[i + c] + (pA[i + c] - pR[i + c]) * w
        n[i + c] = nR[i + c] + (nA[i + c] - nR[i + c]) * w
        l += n[i + c] * n[i + c]
      }
      l = Math.sqrt(l) || 1
      for (let c = 0; c < 3; c++) n[i + c] /= l
    }
    for (let i = 0; i < p.length; i++) {
      p[i] -= positions[i]
      n[i] -= normals[i]
    }
    morphs[name] = { position: p, normal: n }
  }

  return { positions, normals, index, morphs }
}

// ─────────────────────────────────────────────────────────────────────

function surfaceNets(sdf, { min, max }, h) {
  const nx = Math.ceil((max[0] - min[0]) / h) + 1
  const ny = Math.ceil((max[1] - min[1]) / h) + 1
  const nz = Math.ceil((max[2] - min[2]) / h) + 1
  const field = new Float32Array(nx * ny * nz)
  const at = (i, j, k) => i + nx * (j + ny * k)

  for (let k = 0; k < nz; k++) {
    const z = min[2] + k * h
    for (let j = 0; j < ny; j++) {
      const y = min[1] + j * h
      for (let i = 0; i < nx; i++) field[at(i, j, k)] = sdf(min[0] + i * h, y, z)
    }
  }

  const cellVert = new Int32Array((nx - 1) * (ny - 1) * (nz - 1)).fill(-1)
  const cAt = (i, j, k) => i + (nx - 1) * (j + (ny - 1) * k)
  const pos = []
  const corners = [[0, 0, 0], [1, 0, 0], [0, 1, 0], [1, 1, 0], [0, 0, 1], [1, 0, 1], [0, 1, 1], [1, 1, 1]]
  const edges = [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]]
  const v = new Float32Array(8)

  for (let k = 0; k < nz - 1; k++)
    for (let j = 0; j < ny - 1; j++)
      for (let i = 0; i < nx - 1; i++) {
        let mask = 0
        for (let c = 0; c < 8; c++) {
          v[c] = field[at(i + corners[c][0], j + corners[c][1], k + corners[c][2])]
          if (v[c] < 0) mask |= 1 << c
        }
        if (mask === 0 || mask === 255) continue
        let sx = 0, sy = 0, sz = 0, cnt = 0
        for (const [a, b] of edges) {
          if (v[a] < 0 === v[b] < 0) continue
          const t = v[a] / (v[a] - v[b])
          sx += corners[a][0] + (corners[b][0] - corners[a][0]) * t
          sy += corners[a][1] + (corners[b][1] - corners[a][1]) * t
          sz += corners[a][2] + (corners[b][2] - corners[a][2]) * t
          cnt++
        }
        cellVert[cAt(i, j, k)] = pos.length / 3
        pos.push(min[0] + (i + sx / cnt) * h, min[1] + (j + sy / cnt) * h, min[2] + (k + sz / cnt) * h)
      }

  // квады вокруг каждого ребра сетки, пересекающего поверхность
  const idx = []
  const quad = (a, b, c, d, flip) => {
    if (a < 0 || b < 0 || c < 0 || d < 0) return
    if (flip) idx.push(a, c, b, a, d, c)
    else idx.push(a, b, c, a, c, d)
  }
  for (let k = 1; k < nz - 1; k++)
    for (let j = 1; j < ny - 1; j++)
      for (let i = 1; i < nx - 1; i++) {
        const inside = field[at(i, j, k)] < 0
        // ребро вдоль X
        if (i < nx - 1 && inside !== field[at(i + 1, j, k)] < 0)
          quad(cellVert[cAt(i, j - 1, k - 1)], cellVert[cAt(i, j, k - 1)], cellVert[cAt(i, j, k)], cellVert[cAt(i, j - 1, k)], !inside)
        // вдоль Y
        if (j < ny - 1 && inside !== field[at(i, j + 1, k)] < 0)
          quad(cellVert[cAt(i - 1, j, k - 1)], cellVert[cAt(i - 1, j, k)], cellVert[cAt(i, j, k)], cellVert[cAt(i, j, k - 1)], !inside)
        // вдоль Z
        if (k < nz - 1 && inside !== field[at(i, j, k + 1)] < 0)
          quad(cellVert[cAt(i - 1, j - 1, k)], cellVert[cAt(i, j - 1, k)], cellVert[cAt(i, j, k)], cellVert[cAt(i - 1, j, k)], !inside)
      }

  return { positions: new Float32Array(pos), index: new Uint32Array(idx) }
}

function buildNeighbors(index, vCount) {
  const sets = Array.from({ length: vCount }, () => new Set())
  for (let t = 0; t < index.length; t += 3) {
    const a = index[t], b = index[t + 1], c = index[t + 2]
    sets[a].add(b).add(c)
    sets[b].add(a).add(c)
    sets[c].add(a).add(b)
  }
  const offsets = new Uint32Array(vCount + 1)
  for (let i = 0; i < vCount; i++) offsets[i + 1] = offsets[i] + sets[i].size
  const list = new Uint32Array(offsets[vCount])
  for (let i = 0; i < vCount; i++) list.set([...sets[i]], offsets[i])
  return { offsets, list }
}

const E = 0.0005
function grad(sdf, x, y, z, out) {
  // тетраэдрическая схема: 4 вызова вместо 6
  const a = sdf(x + E, y - E, z - E), b = sdf(x - E, y - E, z + E)
  const c = sdf(x - E, y + E, z - E), d = sdf(x + E, y + E, z + E)
  let gx = a - b - c + d, gy = -a - b + c + d, gz = -a + b - c + d
  const len = Math.hypot(gx, gy, gz) || 1
  out[0] = gx / len
  out[1] = gy / len
  out[2] = gz / len
}

/** Ньютон: шаг вдоль градиента на величину расстояния до поверхности. */
function project(sdf, p, iters) {
  const g = [0, 0, 0]
  for (let i = 0; i < p.length; i += 3) {
    for (let it = 0; it < iters; it++) {
      const d = sdf(p[i], p[i + 1], p[i + 2])
      if (Math.abs(d) < 1e-5) break
      grad(sdf, p[i], p[i + 1], p[i + 2], g)
      p[i] -= g[0] * d
      p[i + 1] -= g[1] * d
      p[i + 2] -= g[2] * d
    }
  }
}

function projectAlong(sdf, p, nrm, iters, filter) {
  const g = [0, 0, 0]
  for (let i = 0; i < p.length; i += 3) {
    if (filter && !filter(i / 3)) continue
    const len = Math.hypot(nrm[i], nrm[i + 1], nrm[i + 2]) || 1
    const nx = nrm[i] / len, ny = nrm[i + 1] / len, nz = nrm[i + 2] / len
    let travel = 0
    for (let it = 0; it < iters; it++) {
      const d = sdf(p[i], p[i + 1], p[i + 2])
      if (Math.abs(d) < 2e-5) break
      grad(sdf, p[i], p[i + 1], p[i + 2], g)
      let den = g[0] * nx + g[1] * ny + g[2] * nz
      if (Math.abs(den) < 0.3) den = den < 0 ? -0.3 : 0.3
      // общий путь ограничен: точка не «перепрыгивает» на соседнюю часть тела
      const t = Math.max(-0.07 - travel, Math.min(0.07 - travel, Math.max(-0.03, Math.min(0.03, d / den))))
      travel += t
      p[i] -= nx * t
      p[i + 1] -= ny * t
      p[i + 2] -= nz * t
    }
  }
}

/** Лапласова релаксация: выравнивает треугольники (затем снова проекция). */
function relax(p, { offsets, list }, w) {
  const src = p.slice()
  for (let v = 0; v < offsets.length - 1; v++) {
    const s = offsets[v], e = offsets[v + 1]
    if (e === s) continue
    let ax = 0, ay = 0, az = 0
    for (let n = s; n < e; n++) {
      const j = list[n] * 3
      ax += src[j]; ay += src[j + 1]; az += src[j + 2]
    }
    const c = e - s, i = v * 3
    p[i] += (ax / c - src[i]) * w
    p[i + 1] += (ay / c - src[i + 1]) * w
    p[i + 2] += (az / c - src[i + 2]) * w
  }
}

function gradientNormals(sdf, p) {
  const n = new Float32Array(p.length)
  const g = [0, 0, 0]
  for (let i = 0; i < p.length; i += 3) {
    grad(sdf, p[i], p[i + 1], p[i + 2], g)
    n[i] = g[0]; n[i + 1] = g[1]; n[i + 2] = g[2]
  }
  return n
}
