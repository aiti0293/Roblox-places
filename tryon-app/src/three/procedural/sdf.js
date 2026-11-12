/**
 * Примитивы signed distance field (по мотивам iquilezles.org).
 * Всё в метрах. Отрицательно — внутри, положительно — снаружи.
 */

/** Полиномиальное «сплавление» двух форм с радиусом скругления k. */
export function smin(a, b, k) {
  const h = Math.max(k - Math.abs(a - b), 0) / k
  return Math.min(a, b) - h * h * k * 0.25
}

export function smax(a, b, k) {
  return -smin(-a, -b, k)
}

/** Эллипсоид (приближённое расстояние, достаточно точное у поверхности). */
export function ellipsoid(c, r, rot = null) {
  const [rx, ry, rz] = r
  const cosA = rot ? Math.cos(-rot) : 1
  const sinA = rot ? Math.sin(-rot) : 0
  const bound = Math.max(rx, ry, rz)
  return {
    cx: c[0], cy: c[1], cz: c[2], bound,
    d(x, y, z) {
      let px = x - c[0], py = y - c[1]
      const pz = z - c[2]
      if (rot) {
        const tx = px * cosA - py * sinA
        py = px * sinA + py * cosA
        px = tx
      }
      const k0 = Math.hypot(px / rx, py / ry, pz / rz)
      const k1 = Math.hypot(px / (rx * rx), py / (ry * ry), pz / (rz * rz))
      return k1 < 1e-9 ? -Math.min(rx, ry, rz) : (k0 * (k0 - 1)) / k1
    },
  }
}

/** Конус со сферическими концами радиусов r1 → r2 (кости конечностей). */
export function roundCone(a, b, r1, r2) {
  const bax = b[0] - a[0], bay = b[1] - a[1], baz = b[2] - a[2]
  const l2 = bax * bax + bay * bay + baz * baz
  const rr = r1 - r2
  const a2 = l2 - rr * rr
  const il2 = 1 / l2
  const len = Math.sqrt(l2)
  return {
    cx: (a[0] + b[0]) / 2, cy: (a[1] + b[1]) / 2, cz: (a[2] + b[2]) / 2,
    bound: len / 2 + Math.max(r1, r2),
    d(x, y, z) {
      const pax = x - a[0], pay = y - a[1], paz = z - a[2]
      const yy = pax * bax + pay * bay + paz * baz
      const zz = yy - l2
      const qx = pax * l2 - bax * yy, qy = pay * l2 - bay * yy, qz = paz * l2 - baz * yy
      const x2 = qx * qx + qy * qy + qz * qz
      const y2 = yy * yy * l2
      const z2 = zz * zz * l2
      const k = Math.sign(rr) * rr * rr * x2
      if (Math.sign(zz) * a2 * z2 > k) return Math.sqrt(x2 + z2) * il2 - r2
      if (Math.sign(yy) * a2 * y2 < k) return Math.sqrt(x2 + y2) * il2 - r1
      return (Math.sqrt(x2 * a2 * il2) + yy * rr) * il2 - r1
    },
  }
}

/**
 * Вертикальный «лофт» с эллиптическими сечениями (корпус).
 * keys: [y, a (полуширина), bf (глубина вперёд), bb (глубина назад), z (сдвиг)]
 * Между ключами — сплайн Катмулла–Рома, предрасчитанный в таблицу.
 */
export function loft(keys, step = 0.002) {
  const y0 = keys[0][0]
  const y1 = keys[keys.length - 1][0]
  const n = Math.ceil((y1 - y0) / step) + 1
  const A = new Float32Array(n), BF = new Float32Array(n), BB = new Float32Array(n), Z = new Float32Array(n)

  let seg = 0
  for (let i = 0; i < n; i++) {
    const y = Math.min(y0 + i * step, y1)
    while (seg < keys.length - 2 && y > keys[seg + 1][0]) seg++
    const p0 = keys[Math.max(seg - 1, 0)], p1 = keys[seg], p2 = keys[seg + 1], p3 = keys[Math.min(seg + 2, keys.length - 1)]
    const t = (y - p1[0]) / (p2[0] - p1[0])
    A[i] = catmull(p0[1], p1[1], p2[1], p3[1], t)
    BF[i] = catmull(p0[2], p1[2], p2[2], p3[2], t)
    BB[i] = catmull(p0[3], p1[3], p2[3], p3[3], t)
    Z[i] = catmull(p0[4] ?? 0, p1[4] ?? 0, p2[4] ?? 0, p3[4] ?? 0, t)
  }

  return {
    d(x, y, z) {
      const yc = Math.min(y1, Math.max(y0, y))
      const fi = (yc - y0) / step
      const i = Math.min(n - 2, Math.floor(fi))
      const f = fi - i
      const a = A[i] + (A[i + 1] - A[i]) * f
      const pz = z - (Z[i] + (Z[i + 1] - Z[i]) * f)
      const b = pz > 0 ? BF[i] + (BF[i + 1] - BF[i]) * f : BB[i] + (BB[i + 1] - BB[i]) * f
      const k0 = Math.hypot(x / a, pz / b)
      const k1 = Math.hypot(x / (a * a), pz / (b * b))
      const dr = k1 < 1e-9 ? -Math.min(a, b) : (k0 * (k0 - 1)) / k1
      const dy = y < y0 ? y0 - y : y > y1 ? y - y1 : 0
      if (dy === 0) return dr
      return dr > 0 ? Math.hypot(dr, dy) : Math.max(dr, dy)
    },
  }
}

function catmull(p0, p1, p2, p3, t) {
  const t2 = t * t, t3 = t2 * t
  return 0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3)
}
