// Shared constants for the scene and the scroll choreography.

export const FLOORS = 25
export const FLOOR_H = 3.1
export const TOWER_W = 26 // x
export const TOWER_D = 17 // z
export const TOWER_H = FLOORS * FLOOR_H

// Floor zones, read off the real facade: dark brick plinth, light middle, graphite crown.
export const ZONE_BASE_END = 2 // floors [0, 2)
export const ZONE_TOP_START = 19 // floors [19, 25)

export const PLAN_FLOOR = 18 // the floor that gets "extracted" into the clay plan (1-based label)
export const PLAN_Y = (PLAN_FLOOR - 1) * FLOOR_H

// Total scroll length in viewport heights. The master timeline uses the same unit,
// so timeline time === scrollY / innerHeight.
export const SCROLL_VH = 1300
export const TIMELINE_END = SCROLL_VH - 100

// Chapter anchors (in vh) for navigation.
export const ANCHORS = {
  top: 0,
  facade: 130,
  views: 430,
  plans: 700,
  contact: TIMELINE_END,
}

// Brand palette sampled from дом-мичурин.рф screenshots.
export const PALETTE = {
  skyTop: '#4F86C6',
  skyLow: '#CFDDE7',
  paper: '#F3F3F1',
  greenTop: '#1B2820',
  greenLow: '#26372D',
  facadeTop: '#6E737A',
  facadeMid: '#E3E5E7',
  facadeBase: '#4B4240',
  stripe: '#7C8188',
  frame: '#2B2E33',
  glass: '#4A5560',
  clay: '#F4F5F1',
  clayFloor: '#E2EDDE',
  focus: '#CBDFA2',
  brand: '#26372D',
  sage: '#CBDFA2',
  taupe: '#9F7E64',
  terracotta: '#9F7E64',
  plant: '#425A4C',
}

// The mutable scene state the master GSAP timeline writes to and the R3F loop reads from.
// Camera is described in cylindrical coordinates around a target point.
export const sceneState = {
  az: 0.42, // camera azimuth around target, radians
  r: 165, // horizontal distance from target
  camY: 26,
  tgtX: -22,
  tgtY: 41,
  tgtZ: 0,
  clipLow: -10, // tower clipping: keep y >= clipLow
  clipHigh: 200, // keep y <= clipHigh
  towerVis: 1,
  planGrow: 0,
  planVis: 0,
  room: -1, // focused room index (float while tweening)
  bgPaper: 0,
  bgGreen: 0,
  night: 0,
  intro: 1, // load-in offset, tweened to 0 once
}

// Real 1-room flat (1К, 39,10 м²) from the developer's catalogue.
export const FLAT = { type: '1К', total: '39,10', living: '14,50', area: '37,04' }

export const ROOMS = [
  {
    id: 'kitchen',
    area: '13,89',
    title: 'Кухня-гостиная',
    text: 'Кухня вдоль стены, обеденный стол у окна и выход на лоджию — центр жизни квартиры.',
    center: [7.0, 6.0],
  },
  {
    id: 'room',
    area: '14,50',
    title: 'Спальня',
    text: 'Отдельная комната с окном в пол: место под двуспальную кровать, шкаф и рабочий стол.',
    center: [3.75, 6.25],
  },
  {
    id: 'bath',
    area: '4,31',
    title: 'Санузел',
    text: 'Совмещённый санузел с ванной и местом под стиральную машину.',
    center: [7.0, 2.75],
  },
  {
    id: 'loggia',
    area: '4,11',
    title: 'Лоджия',
    text: 'Остеклённая лоджия при кухне — утренний кофе с видом на зелёный двор.',
    center: [7.05, 9.25],
  },
]

export const OFFICE = {
  address: 'ул. Стофато, 26 стр',
  hours: ['Пн–Пт с 9:00 до 19:00', 'Сб–Вс выходной'],
  phone: '+7 (383) 228-37-62',
  phoneHref: 'tel:+73832283762',
  email: 'op@nova-1.ru',
}
