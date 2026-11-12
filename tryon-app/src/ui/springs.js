/** Единые пружины для всего интерфейса — движения выглядят «одной рукой». */
export const spring = {
  soft: { type: 'spring', stiffness: 220, damping: 28, mass: 0.9 },
  snappy: { type: 'spring', stiffness: 420, damping: 32 },
  bouncy: { type: 'spring', stiffness: 500, damping: 22 },
}
