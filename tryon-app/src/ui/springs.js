/** Shared springs so every motion in the app feels like one hand. */
export const spring = {
  soft: { type: 'spring', stiffness: 220, damping: 28, mass: 0.9 },
  snappy: { type: 'spring', stiffness: 420, damping: 34 },
  bouncy: { type: 'spring', stiffness: 500, damping: 22 },
  // gallery: fast settle, no wobble — feels like a native photo viewer
  slide: { type: 'spring', stiffness: 320, damping: 36, mass: 0.8 },
}
