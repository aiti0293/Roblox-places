/**
 * Каталог. slot — «слой» на манекене: в одном слоте одна вещь
 * (жакет поверх водолазки — можно, две пары брюк — нет).
 * model — запечённая 3D-модель (npm run bake).
 */
export const CATALOG = [
  {
    id: 'jacket-margo',
    name: 'Жакет «Марго»',
    note: 'Шерсть с кашемиром, прямой крой',
    price: 12490,
    slot: 'outer',
    kind: 'jacket',
    color: '#b48a62',
    model: './models/garments/jacket-margo.glb',
  },
  {
    id: 'turtleneck-emma',
    name: 'Водолазка «Эмма»',
    note: 'Тонкий кашемир, не колется',
    price: 5990,
    slot: 'top',
    kind: 'turtleneck',
    color: '#7d2f3d',
    model: './models/garments/turtleneck-emma.glb',
  },
  {
    id: 'trousers-nika',
    name: 'Брюки «Ника»',
    note: 'Высокая посадка, мягкая стрелка',
    price: 6490,
    slot: 'bottom',
    kind: 'trousers',
    color: '#3a3f4b',
    model: './models/garments/trousers-nika.glb',
  },
]

export const formatPrice = (rub) => `${rub.toLocaleString('ru-RU')} ₽`
