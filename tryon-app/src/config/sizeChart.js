/**
 * Size chart — the ONLY place to tune size recommendations.
 *
 * How it works:
 *   1. Find the height band the customer falls into (`heightBands`).
 *   2. In that band, take the first size whose weight limit (kg, inclusive)
 *      is >= the customer's weight.
 *
 * To adjust to real store measurements, just edit the numbers below.
 * Example from the brief: height 160–165 and weight 50–55 → size 44.
 */
export const SIZE_CHART = {
  sizes: [42, 44, 46, 48, 50, 52],

  // International letter shown next to the Russian size
  letters: { 42: 'XS', 44: 'S', 46: 'M', 48: 'L', 50: 'XL', 52: 'XXL' },

  heightBands: [
    // maxWeight[i] — the heaviest weight (kg) that still fits sizes[i]
    { label: 'до 159 см', minHeight: 0, maxHeight: 159, maxWeight: [46, 52, 58, 65, 72, 80] },
    { label: '160–165 см', minHeight: 160, maxHeight: 165, maxWeight: [49, 55, 61, 68, 75, 83] },
    { label: '166–171 см', minHeight: 166, maxHeight: 171, maxWeight: [52, 58, 64, 71, 78, 86] },
    { label: '172 см и выше', minHeight: 172, maxHeight: Infinity, maxWeight: [55, 61, 67, 74, 81, 89] },
  ],
}
