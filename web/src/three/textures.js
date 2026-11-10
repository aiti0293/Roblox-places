import * as THREE from 'three'

// Procedural facade textures, drawn once on a canvas. UVs on the tower are in metres,
// so `repeat` is 1 / tile size in metres.

function canvasTexture(size, draw, tileW, tileH, aniso = 8) {
  const c = document.createElement('canvas')
  c.width = size
  c.height = size
  const g = c.getContext('2d')
  draw(g, size)
  const t = new THREE.CanvasTexture(c)
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.repeat.set(1 / tileW, 1 / tileH)
  t.anisotropy = aniso
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

function rnd(seed) {
  let s = seed
  return () => {
    s = (s * 16807) % 2147483647
    return (s - 1) / 2147483646
  }
}

/** Dark clinker brick, 2 m × 1 m tile: 4 bricks across, 13 courses. */
export function brickTexture() {
  return canvasTexture(
    512,
    (g, n) => {
      const r = rnd(11)
      g.fillStyle = '#6B625C' // mortar
      g.fillRect(0, 0, n, n)
      const rows = 13
      const cols = 8
      const bh = n / rows
      const bw = n / cols
      for (let y = 0; y < rows; y++) {
        const off = y % 2 ? bw / 2 : 0
        for (let x = -1; x <= cols; x++) {
          const v = 0.82 + r() * 0.3
          const R = Math.round(78 * v)
          const G = Math.round(66 * v)
          const B = Math.round(63 * v)
          g.fillStyle = `rgb(${R},${G},${B})`
          g.fillRect(x * bw + off + 2, y * bh + 2, bw - 4, bh - 4)
        }
      }
    },
    2,
    1,
  )
}

/** Large-format facade cassettes with fine joints: 1.5 m × 1.5 m tile. */
export function panelTexture(base, joint, seed = 3) {
  return canvasTexture(
    256,
    (g, n) => {
      const r = rnd(seed)
      g.fillStyle = base
      g.fillRect(0, 0, n, n)
      // very subtle per-cassette tone variation
      for (let i = 0; i < 2; i++) {
        for (let j = 0; j < 2; j++) {
          g.fillStyle = `rgba(0,0,0,${0.012 + r() * 0.02})`
          g.fillRect((i * n) / 2, (j * n) / 2, n / 2, n / 2)
        }
      }
      g.fillStyle = joint
      g.fillRect(0, 0, n, 3)
      g.fillRect(0, n / 2, n, 2)
      g.fillRect(0, 0, 3, n)
      g.fillRect(n / 2, 0, 2, n)
    },
    3,
    3,
  )
}
