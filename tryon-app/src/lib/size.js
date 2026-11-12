import { SIZE_CHART } from '../config/sizeChart.js'

function findBand(height, chart) {
  return chart.heightBands.find((b) => height >= b.minHeight && height <= b.maxHeight) ?? chart.heightBands[chart.heightBands.length - 1]
}

/**
 * Recommended Russian clothing size (42…52) for the given weight (kg)
 * and height (cm). Outside the chart the nearest size is returned —
 * use `getSizeFit` to tell the customer about it.
 */
export function getRecommendedSize(weight, height, chart = SIZE_CHART) {
  const band = findBand(height, chart)
  const i = band.maxWeight.findIndex((limit) => weight <= limit)
  return i === -1 ? chart.sizes[chart.sizes.length - 1] : chart.sizes[i]
}

/**
 * Full recommendation for the UI.
 * fit: 'ok' — inside the chart; 'above' — heavier than the largest size
 * allows (nearest size shown, advise to check with a consultant).
 */
export function getSizeFit(weight, height, chart = SIZE_CHART) {
  const band = findBand(height, chart)
  const size = getRecommendedSize(weight, height, chart)
  const fit = weight > band.maxWeight[band.maxWeight.length - 1] ? 'above' : 'ok'
  return { size, letter: chart.letters[size], fit }
}
