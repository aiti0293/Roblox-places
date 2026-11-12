import { ellipsoid, loft, roundCone, smax, smin } from './sdf.js'
import { armAngleFor, bodyFrame } from '../../lib/pose.js'

const mix = (a, b, t) => a + (b - a) * t
const clamp01 = (v) => Math.min(1, Math.max(0, v))

export const ALL_GROUPS = ['torso', 'breasts', 'glutes', 'neck', 'shoulders', 'arms', 'hands', 'legs', 'feet']

/**
 * Женская фигура как одно гладкое поле расстояний.
 * Рост здесь не участвует (масштаб по Y делается на GPU).
 *
 * Поза: прямая, руки свободно опущены вдоль тела. Угол отведения рук
 * минимальный — ровно такой, чтобы рука не «врастала» в бёдра/бока
 * при данной фигуре (у полных фигур чуть больше).
 *
 * @param body   обхваты, см: { bust, waist, hips }
 * @param opts.groups  какие части тела включить (для одежды)
 * @param opts.offset  «надуть» поверхность на N метров (толщина одежды)
 * @param opts.clip    (x,y,z) => d — отрезать всё, где d > 0 (подол, горловина)
 * @param opts.sleeveClip — то же для рук; по умолчанию рукав — до запястья
 * @param opts.armAngle  принудительный угол рук (для морфов)
 */
export function makeBodySdf(body, { groups = ALL_GROUPS, offset = 0, clip = null, sleeveClip = null, armAngle: forcedAngle } = {}) {
  const has = new Set(groups)
  const { dB, dH, dAll, hip, waist, bust, ribA, upA, sx, kArm, shX, shY } = bodyFrame(body)

  // ── корпус ────────────────────────────────────────────────────────
  const ribF = bust.b * 0.84
  const ribB = bust.b * 0.92
  const torso = loft([
    [0.74, hip.a * 0.5, hip.b * 0.5, hip.b * 0.55],
    [0.8, hip.a * 0.86, hip.b * 0.8, hip.b * 0.88],
    [0.875, hip.a * 0.985, hip.b * 0.86, hip.b * 0.94],
    [0.93, hip.a * 0.98, hip.b * 0.9, hip.b * 0.9],
    [0.99, mix(hip.a, waist.a, 0.62), mix(hip.b * 0.92, waist.b * 1.04, 0.6), mix(hip.b * 0.88, waist.b * 0.96, 0.6)],
    [1.05, waist.a, waist.b * 1.02, waist.b * 0.96],
    [1.12, mix(waist.a, ribA, 0.72), mix(waist.b, ribF, 0.7), mix(waist.b, ribB, 0.75)],
    [1.2, ribA, ribF, ribB],
    [1.29, upA, 0.08 + (bust.b - 0.117) * 0.45, 0.085 + (bust.b - 0.117) * 0.4, -0.004],
    [1.365, 0.105, 0.058, 0.07, -0.01],
    [1.4, 0.06, 0.048, 0.05, -0.01],
  ])

  const parts = [] // { p, k, g (группа), side }
  const add = (g, p, k, side = 0) => has.has(g) && parts.push({ p, k, g, side })

  // ── грудь ─────────────────────────────────────────────────────────
  const bs = Math.max(0.7, 1 + dB * 0.3)
  for (const s of [-1, 1]) {
    add('breasts', ellipsoid([s * (0.056 + bust.a * 0.18), 1.19 - dB * 0.015, ribF * 0.6], [0.062 * bs, 0.058 * bs, 0.05 * bs], s * 0.15), 0.075)
  }

  // ── ягодицы ───────────────────────────────────────────────────────
  const gs = Math.max(0.6, 1 + dH * 0.45)
  for (const s of [-1, 1]) {
    add('glutes', ellipsoid([s * hip.a * 0.36, 0.875, -hip.b * 0.48], [0.088 * gs, 0.095 * gs, 0.078 * gs]), 0.06)
  }

  // ── шея, трапеции, плечи ──────────────────────────────────────────
  const neckR = 0.049 * (1 + dAll * 0.15)
  add('neck', roundCone([0, 1.36, -0.016], [0, 1.53, 0.004], neckR * 1.08, neckR), 0.05)
  for (const s of [-1, 1]) {
    add('shoulders', roundCone([0, 1.39, -0.022], [s * sx, 1.348, -0.016], 0.05, 0.042 * kArm), 0.06)
    add('shoulders', ellipsoid([s * (sx + 0.006), 1.322, -0.012], [0.05 * kArm, 0.058 * kArm, 0.05 * kArm]), 0.04)
  }

  // ── руки: прямые, вдоль тела (угол — см. lib/pose.js) ──────────────
  const armAngle = forcedAngle ?? armAngleFor(body)
  const pivots = {}
  for (const s of [-1, 1]) {
    const sa = Math.sin(armAngle), ca = Math.cos(armAngle)
    const sh = [s * shX, shY, -0.014]
    const el = [sh[0] + s * sa * 0.29, sh[1] - ca * 0.29, -0.028]
    const wr = [el[0] + s * sa * 0.245, el[1] - ca * 0.245, 0.006] // локоть чуть расслаблен
    pivots[s] = sh
    add('arms', roundCone(sh, el, 0.045 * kArm, 0.031 * Math.sqrt(kArm)), 0.03, s)
    add('arms', ellipsoid([mix(sh[0], el[0], 0.42), mix(sh[1], el[1], 0.42), -0.022], [0.04 * kArm, 0.1, 0.041 * kArm], -s * armAngle), 0.04, s)
    add('arms', roundCone(el, wr, 0.033 * Math.sqrt(kArm), 0.024), 0.03, s)
    add('arms', ellipsoid([mix(el[0], wr[0], 0.3), mix(el[1], wr[1], 0.3), -0.014], [0.032 * Math.sqrt(kArm), 0.08, 0.033], -s * armAngle), 0.035, s)
    const hc = [wr[0] + s * sa * 0.07, wr[1] - ca * 0.07, wr[2] + 0.004]
    add('hands', ellipsoid(hc, [0.021, 0.072, 0.04], -s * armAngle), 0.035, s)
  }

  // ── ноги ──────────────────────────────────────────────────────────
  const thighR = hip.a * 0.47
  const kLeg = 1 + Math.max(-0.4, dH) * 0.25
  for (const s of [-1, 1]) {
    const hj = [s * hip.a * 0.46, 0.86, 0]
    const kn = [s * 0.074, 0.475, 0.012]
    const an = [s * 0.072, 0.085, -0.012]
    add('legs', roundCone(hj, kn, thighR, 0.046 * kLeg), 0.07)
    add('legs', ellipsoid([s * (hip.a * 0.46 + 0.006), 0.66, 0.012], [thighR * 0.92, 0.17, thighR * 0.9]), 0.05)
    add('legs', roundCone(kn, an, 0.045 * kLeg, 0.03), 0.03)
    add('legs', ellipsoid([s * 0.075, 0.315, -0.016], [0.046 * kLeg, 0.11, 0.047 * kLeg]), 0.04)
    add('feet', roundCone([s * 0.072, 0.045, -0.035], [s * 0.084, 0.024, 0.125], 0.034, 0.024), 0.035)
  }

  const prims = parts.map((q) => ({ ...q, cx: q.p.cx, cy: q.p.cy, cz: q.p.cz, r: q.p.bound + q.k }))
  const useTorso = has.has('torso')

  // руки отдельно от корпуса: у одежды подол режет корпус, но не рукава
  const isArm = (q) => q.g === 'arms' || q.g === 'hands'
  const restPrims = prims.filter((q) => !isArm(q))
  const armPrims = prims.filter(isArm)
  const union = (list, d, x, y, z) => {
    for (let i = 0; i < list.length; i++) {
      const q = list[i]
      if (Math.hypot(x - q.cx, y - q.cy, z - q.cz) - q.r > d) continue
      d = smin(d, q.p.d(x, y, z), q.k)
    }
    return d
  }

  const finish = (d, y) => smax(smax(d, y - 1.49, 0.012), -y, 0.004) // срез шеи, пол

  function sdfRest(x, y, z) {
    let d = union(restPrims, useTorso ? torso.d(Math.abs(x), y, z) : 1, x, y, z) - offset
    if (clip) d = smax(d, clip(x, y, z), 0.01) // скруглённый край ткани
    return finish(d, y)
  }
  function sdfArm(x, y, z) {
    let d = union(armPrims, 1, x, y, z) - offset
    if (sleeveClip) d = smax(d, sleeveClip(x, y, z), 0.01)
    return finish(d, y)
  }
  // у тела рука плавно «вырастает» из плеча (и только там — иначе кисть
  // «склеивается» с бедром); у одежды рукав и полочка — отдельные куски
  const kJoin = (y) => (offset > 0 ? 0.008 : 0.004 + 0.026 * clamp01((y - 1.15) / 0.08))
  const sdf = (x, y, z) => smin(sdfRest(x, y, z), sdfArm(x, y, z), kJoin(y))

  /**
   * Насколько точка «принадлежит» руке (0…1) и какой (side = ±1).
   * Нужно, чтобы при смене фигуры рука поворачивалась как целое,
   * а не «перетекала» по поверхности.
   */
  function armWeight(x, y, z) {
    const side = x < 0 ? -1 : 1
    let dArm = Infinity, dRest = useTorso ? torso.d(Math.abs(x), y, z) : Infinity
    for (const q of prims) {
      const v = q.p.d(x, y, z)
      if ((q.g === 'arms' || q.g === 'hands') && q.side === side) dArm = Math.min(dArm, v)
      else dRest = Math.min(dRest, v)
    }
    return { side, w: dArm === Infinity ? 0 : clamp01(0.5 + (dRest - dArm) / 0.015) }
  }

  return { sdf, sdfRest, sdfArm, armAngle, pivots, armWeight }
}
