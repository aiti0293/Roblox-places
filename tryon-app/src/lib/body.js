/**
 * Вся «математика фигуры» в одном месте.
 *
 * На входе — то, что вводит покупательница (рост/вес или обхваты).
 * На выходе — единый объект BodyShape в сантиметрах, который понимают
 * и манекен-заглушка, и будущая GLB-модель с морф-таргетами.
 */

export const LIMITS = {
  height: { min: 150, max: 185, step: 1, unit: 'см' },
  weight: { min: 45, max: 110, step: 1, unit: 'кг' },
  bust: { min: 80, max: 130, step: 1, unit: 'см' },
  waist: { min: 60, max: 115, step: 1, unit: 'см' },
  hips: { min: 86, max: 136, step: 1, unit: 'см' },
}

/** «Базовая» фигура — под неё сделан нейтральный меш (все морфы = 0). */
export const BASE_BODY = { height: 166, bust: 94, waist: 76, hips: 102 }

const clamp = (v, min, max) => Math.min(max, Math.max(min, v))
const clampTo = (key, v) => clamp(v, LIMITS[key].min, LIMITS[key].max)

/**
 * Оценка обхватов по росту и весу (через ИМТ).
 * Коэффициенты подобраны по усреднённым размерным таблицам
 * для женщин 40+; точность ±1 размер — для примерки достаточно.
 */
export function estimateFromHeightWeight(height, weight) {
  const bmi = weight / (height / 100) ** 2
  const d = bmi - 24
  const h = (height - BASE_BODY.height) * 0.18 // высокие — чуть шире в кости
  return {
    height,
    bust: Math.round(clampTo('bust', 94 + d * 1.7 + h)),
    waist: Math.round(clampTo('waist', 76 + d * 2.4 + h * 0.6)),
    hips: Math.round(clampTo('hips', 102 + d * 1.8 + h)),
  }
}

/** Итоговая фигура из состояния стора (в зависимости от режима ввода). */
export function resolveBody(state) {
  if (state.mode === 'hw') return estimateFromHeightWeight(state.height, state.weight)
  return { height: state.height, bust: state.bust, waist: state.waist, hips: state.hips }
}

/**
 * Российский размер = половина обхвата груди по ГОСТ-таблице
 * (48 → грудь 96, бёдра 104). Берём больший из размеров по груди и по
 * бёдрам и округляем вверх до чётного с допуском 1 см — вещь не должна жать.
 */
const LETTERS = { 42: 'XS', 44: 'S', 46: 'M', 48: 'L', 50: 'XL', 52: 'XXL', 54: '3XL', 56: '4XL', 58: '5XL', 60: '6XL', 62: '6XL', 64: '6XL' }

export function sizeFor(body) {
  const byBust = body.bust / 2
  const byHips = (body.hips - 8) / 2
  const raw = Math.max(byBust, byHips)
  const ru = clamp(Math.ceil((raw - 0.5) / 2) * 2, 42, 64)
  return { ru, intl: LETTERS[ru] }
}

/**
 * Нормализованные отклонения от базы (-1…+1, иногда чуть больше).
 * Именно они превращаются в веса морф-таргетов.
 */
export function bodyDeltas(body) {
  return {
    height: body.height / BASE_BODY.height, // множитель, не дельта
    bust: (body.bust - BASE_BODY.bust) / 30,
    waist: (body.waist - BASE_BODY.waist) / 30,
    hips: (body.hips - BASE_BODY.hips) / 30,
  }
}
