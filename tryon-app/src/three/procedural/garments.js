/**
 * Одежда = «оболочка» тела: те же части тела, раздутые на толщину ткани
 * и обрезанные по линиям подола, рукава и горловины. Поскольку оболочка
 * строится из того же поля, морф-таргеты у неё те же, что у тела, —
 * вещь садится на любую фигуру.
 */
const TOPS = { min: [-0.4, 0.6, -0.22], max: [0.4, 1.5, 0.24] }
const BOTTOMS = { min: [-0.3, 0.05, -0.22], max: [0.3, 1.08, 0.22] }

export const GARMENTS = {
  'jacket-margo': {
    bounds: TOPS,
    groups: ['torso', 'breasts', 'glutes', 'shoulders', 'arms'],
    offset: 0.02, // жакет — верхний слой, с запасом над водолазкой и брюками
    clip: (x, y, z) => {
      // V-образный вырез спереди
      const v = Math.max((1.23 + 1.5 * Math.abs(x) - y) / 1.8, -z)
      return Math.max(0.868 - y, y - 1.425, -v) // подол — по линии бёдер
    },
  },
  'turtleneck-emma': {
    bounds: TOPS,
    groups: ['torso', 'breasts', 'glutes', 'neck', 'shoulders', 'arms'],
    offset: 0.005,
    clip: (x, y) => Math.max(0.86 - y, y - 1.465),
  },
  'trousers-nika': {
    bounds: BOTTOMS,
    groups: ['torso', 'glutes', 'legs'],
    offset: 0.008,
    clip: (x, y) => Math.max(y - 1.035, 0.075 - y),
  },
}
