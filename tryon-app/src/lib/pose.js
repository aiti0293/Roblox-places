import { BASE_BODY } from './body.js'

/**
 * Общая для запекания и приложения «анатомия»: размеры корпуса по
 * обхватам и угол, на который руки отводятся от тела.
 */

/** Угол (рад) морфа Arms_Out: вес 1 = руки отведены на столько от базы. */
export const ARMS_OUT = 0.25

/** Полуоси эллипса по обхвату C (м) и соотношению глубина/ширина k. */
export function ellipseFromGirth(C, k) {
  const a = C / (2 * Math.PI * Math.sqrt((1 + k * k) / 2))
  return { a, b: a * k }
}

export function bodyFrame(body) {
  const dB = (body.bust - BASE_BODY.bust) / 30
  const dW = (body.waist - BASE_BODY.waist) / 30
  const dH = (body.hips - BASE_BODY.hips) / 30
  const dAll = (dB + dW + dH) / 3
  const hip = ellipseFromGirth(body.hips / 100, 0.74)
  const waist = ellipseFromGirth(body.waist / 100, 0.72)
  const bust = ellipseFromGirth(body.bust / 100, 0.7)
  const ribA = bust.a * 0.9
  const upA = 0.152 + (bust.a - 0.167) * 0.55
  const sx = 0.158 + (bust.a - 0.167) * 0.45
  const kArm = 1 + Math.max(-0.4, dAll) * 0.4
  return { dB, dW, dH, dAll, hip, waist, bust, ribA, upA, sx, kArm, shX: sx + 0.012, shY: 1.33 }
}

/**
 * Руки почти вертикальны; угол растёт ровно настолько, чтобы рука
 * не касалась бёдер, талии (локтем) и боков грудной клетки.
 */
export function armAngleFor(body) {
  const f = bodyFrame(body)
  const thighOuter = f.hip.a * 0.93
  const ribSide = Math.max(f.ribA, f.upA) + 0.008
  // зазор считается от поверхности предплечья (радиус ≈ 3.3 см), а не от оси
  const needHip = Math.atan2(Math.max(f.hip.a, thighOuter) + 0.033 * Math.sqrt(f.kArm) + 0.018 - f.shX, f.shY - 0.88)
  const needRib = Math.atan2(ribSide + 0.02 - f.shX, f.shY - 1.15)
  const needWaist = Math.atan2(f.waist.a + 0.045 * f.kArm + 0.02 - f.shX, f.shY - 1.04)
  return Math.max(0.05, needHip, needRib, needWaist)
}

export const BASE_ARM_ANGLE = armAngleFor(BASE_BODY)
