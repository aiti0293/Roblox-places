import { ellipsoid, loft, roundCone, smax, smin } from './sdf.js'
import { BASE_BODY } from '../../lib/body.js'

const mix = (a, b, t) => a + (b - a) * t

/** Полуоси эллипса по обхвату C (м) и соотношению глубина/ширина k. */
function ellipseFromGirth(C, k) {
  const a = C / (2 * Math.PI * Math.sqrt((1 + k * k) / 2))
  return { a, b: a * k }
}

/**
 * Женская фигура как одно гладкое поле расстояний.
 * Рост здесь не участвует (масштаб по Y делается на GPU) — все размеры
 * в «системе» базового роста 166 см.
 *
 * @param {{bust:number, waist:number, hips:number}} body обхваты, см
 * @returns {(x:number,y:number,z:number)=>number}
 */
export function makeBodySdf(body) {
  const dB = (body.bust - BASE_BODY.bust) / 30
  const dW = (body.waist - BASE_BODY.waist) / 30
  const dH = (body.hips - BASE_BODY.hips) / 30
  const dAll = (dB + dW + dH) / 3 // общая «полнота» — для рук и шеи

  const hip = ellipseFromGirth(body.hips / 100, 0.74)
  const waist = ellipseFromGirth(body.waist / 100, 0.72)
  const bust = ellipseFromGirth(body.bust / 100, 0.7)

  // ── корпус: таз → талия → грудная клетка → основание шеи ──────────
  const ribA = bust.a * 0.9
  const ribF = bust.b * 0.84
  const ribB = bust.b * 0.92
  const upA = 0.152 + (bust.a - 0.167) * 0.55
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

  const parts = [] // [примитив, радиус сплавления]
  const add = (p, k) => parts.push([p, k])

  // ── грудь ─────────────────────────────────────────────────────────
  // мягкая каплевидная форма, большая часть объёма — за счёт грудной клетки
  const bs = Math.max(0.7, 1 + dB * 0.3)
  for (const s of [-1, 1]) {
    add(
      ellipsoid([s * (0.056 + bust.a * 0.18), 1.19 - dB * 0.015, ribF * 0.6], [0.062 * bs, 0.058 * bs, 0.05 * bs], s * 0.15),
      0.075,
    )
  }

  // ── ягодицы ───────────────────────────────────────────────────────
  const gs = Math.max(0.6, 1 + dH * 0.45)
  for (const s of [-1, 1]) {
    add(ellipsoid([s * hip.a * 0.36, 0.875, -hip.b * 0.48], [0.088 * gs, 0.095 * gs, 0.078 * gs]), 0.06)
  }

  // ── шея, трапеции, плечи ──────────────────────────────────────────
  const neckR = 0.049 * (1 + dAll * 0.15)
  add(roundCone([0, 1.36, -0.016], [0, 1.53, 0.004], neckR * 1.08, neckR), 0.05)
  const sx = 0.158 + (bust.a - 0.167) * 0.45 // плечевой сустав
  const kArm = 1 + Math.max(-0.4, dAll) * 0.4
  for (const s of [-1, 1]) {
    add(roundCone([0, 1.39, -0.022], [s * sx, 1.348, -0.016], 0.05, 0.042 * kArm), 0.06)
    add(ellipsoid([s * (sx + 0.006), 1.322, -0.012], [0.05 * kArm, 0.058 * kArm, 0.05 * kArm]), 0.04)
  }

  // ── руки: плечо → локоть → запястье → кисть ───────────────────────
  // поза «лёгкая А»: руки отведены так, чтобы не касаться бёдер даже
  // у самых крупных фигур — геометрия рук не зависит от обхватов
  const t1 = 0.17, t2 = 0.25
  for (const s of [-1, 1]) {
    const sh = [s * (sx + 0.012), 1.33, -0.014]
    const el = [sh[0] + s * Math.sin(t1) * 0.29, sh[1] - Math.cos(t1) * 0.29, -0.03]
    const wr = [el[0] + s * Math.sin(t2) * 0.245, el[1] - Math.cos(t2) * 0.245, 0.005]
    add(roundCone(sh, el, 0.045 * kArm, 0.031 * Math.sqrt(kArm)), 0.03)
    // бицепс/трицепс — лёгкий объём верхней трети
    add(ellipsoid([mix(sh[0], el[0], 0.42), mix(sh[1], el[1], 0.42), -0.022], [0.04 * kArm, 0.1, 0.041 * kArm], -s * t1), 0.04)
    add(roundCone(el, wr, 0.033 * Math.sqrt(kArm), 0.024), 0.03)
    add(ellipsoid([mix(el[0], wr[0], 0.3), mix(el[1], wr[1], 0.3), -0.012], [0.032 * Math.sqrt(kArm), 0.08, 0.033], -s * t2), 0.035)
    // кисть: ладонь к бедру, пальцы слегка собраны
    const hc = [wr[0] + s * Math.sin(t2) * 0.07, wr[1] - Math.cos(t2) * 0.07, wr[2] + 0.006]
    add(ellipsoid(hc, [0.022, 0.072, 0.04], -s * t2), 0.035)
  }

  // ── ноги ──────────────────────────────────────────────────────────
  const thighR = hip.a * 0.47
  const kLeg = 1 + Math.max(-0.4, dH) * 0.25
  for (const s of [-1, 1]) {
    const hj = [s * hip.a * 0.46, 0.86, 0]
    const kn = [s * 0.072, 0.475, 0.012]
    const an = [s * 0.07, 0.085, -0.012]
    add(roundCone(hj, kn, thighR, 0.046 * kLeg), 0.07)
    add(ellipsoid([s * (hip.a * 0.46 + 0.006), 0.66, 0.012], [thighR * 0.92, 0.17, thighR * 0.9]), 0.05) // квадрицепс
    add(roundCone(kn, an, 0.045 * kLeg, 0.03), 0.03)
    add(ellipsoid([s * 0.073, 0.315, -0.016], [0.046 * kLeg, 0.11, 0.047 * kLeg]), 0.04) // икра
    // стопа
    add(roundCone([s * 0.07, 0.045, -0.035], [s * 0.082, 0.024, 0.125], 0.034, 0.024), 0.035)
  }

  // проверка дальних частей — по ограничивающей сфере (быстро)
  const prims = parts.map(([p, k]) => ({ p, k, cx: p.cx, cy: p.cy, cz: p.cz, r: p.bound + k }))

  return function sdf(x, y, z) {
    let d = torso.d(Math.abs(x), y, z)
    for (let i = 0; i < prims.length; i++) {
      const q = prims[i]
      const far = Math.hypot(x - q.cx, y - q.cy, z - q.cz) - q.r
      if (far > d) continue
      d = smin(d, q.p.d(x, y, z), q.k)
    }
    d = smax(d, y - 1.49, 0.012) // аккуратный срез шеи
    d = smax(d, -y, 0.004) // стопы стоят на полу
    return d
  }
}
