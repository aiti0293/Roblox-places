/**
 * Настройки 3D-манекена.
 *
 * По умолчанию — наш запечённый гладкий манекен (npm run bake).
 * Свою модель кладите в public/models/ и укажите путь здесь.
 */
export const AVATAR_URL = './models/mannequin.glb'

/**
 * Соответствие параметров фигуры и морф-таргетов (shape keys из Blender).
 * Ключ — имя морфа в GLB, значение — функция от дельт (см. bodyDeltas)
 * → вес 0…1. Отрицательные/положительные направления — раздельные морфы,
 * т.к. three.js не умеет отрицательные влияния «из коробки» корректно
 * для всех экспортёров.
 *
 * Подправьте имена под вашу модель — остальной код трогать не нужно.
 * Одежда с теми же shape keys будет деформироваться вместе с телом.
 */
import { ARMS_OUT, BASE_ARM_ANGLE, armAngleFor } from '../lib/pose'
import { BASE_BODY } from '../lib/body'

const pos = (v) => Math.max(0, v)
const neg = (v) => Math.max(0, -v)

export const MORPH_MAP = {
  Bust_Plus: (d) => pos(d.bust),
  Bust_Minus: (d) => neg(d.bust),
  Waist_Plus: (d) => pos(d.waist),
  Waist_Minus: (d) => neg(d.waist),
  Hips_Plus: (d) => pos(d.hips),
  Hips_Minus: (d) => neg(d.hips),
  // Отведение рук: ровно настолько, чтобы руки не касались боков.
  // В чужой GLB такого морфа может не быть — тогда он просто пропускается.
  Arms_Out: (d) =>
    (armAngleFor({ bust: BASE_BODY.bust + d.bust * 30, waist: BASE_BODY.waist + d.waist * 30, hips: BASE_BODY.hips + d.hips * 30 }) - BASE_ARM_ANGLE) /
    ARMS_OUT,
}
