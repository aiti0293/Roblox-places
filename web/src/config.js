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

export const PALETTE = {
  skyTop: '#4F86C6',
  skyLow: '#CFDDE7',
  paper: '#F3F1EC',
  greenTop: '#12241E',
  greenLow: '#203A32',
  facadeTop: '#6E737A',
  facadeMid: '#E3E5E7',
  facadeBase: '#4B4240',
  stripe: '#7C8188',
  frame: '#2B2E33',
  glass: '#5A6E80',
  clay: '#ECE9E4',
  clayFloor: '#E6E2DB',
  focus: '#D6BE9C',
  brand: '#203A32',
  terracotta: '#C2704F',
  plant: '#4E6B57',
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

export const ROOMS = [
  {
    id: 'living',
    kicker: 'Комната 01 · 32 м²',
    title: 'Кухня-гостиная',
    text: 'Светлое пространство на две стороны: кухонный остров, обеденная зона на шестерых и выход на лоджию.',
    center: [5.25, 6.05],
  },
  {
    id: 'bedroom',
    kicker: 'Комната 02 · 19 м²',
    title: 'Спальня с гардеробной',
    text: 'Тихая сторона квартиры. Встроенная система хранения вдоль стены и окно в пол с видом на кроны деревьев.',
    center: [10.75, 6.35],
  },
  {
    id: 'bath',
    kicker: 'Комната 03 · 10 м²',
    title: 'Ванная комната',
    text: 'Отдельностоящая ванна, двойная раковина и место под стиральную машину — без компромиссов по площади.',
    center: [10.75, 3.1],
  },
  {
    id: 'loggia',
    kicker: 'Комната 04 · 6 м²',
    title: 'Видовая лоджия',
    text: 'Панорамное остекление от пола до потолка. С 18 этажа — весь город до горизонта.',
    center: [5.5, 9.1],
  },
]
