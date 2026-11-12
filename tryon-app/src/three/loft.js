import * as THREE from 'three'

/**
 * Гладкая «обечайка» по набору колец-эллипсов.
 * Кольцо: { y, a (полуширина), bf (глубина вперёд), bb (глубина назад), z (смещение) }.
 * Между ключевыми кольцами — сплайн Катмулла–Рома, поэтому силуэт плавный.
 * Топология фиксирована: позиции обновляются на месте без пересоздания буферов.
 */
export class Loft {
  constructor({ keyCount, sub = 6, radial = 48, capTop = true, capBottom = true, lobe = 0 }) {
    this.keyCount = keyCount
    this.sub = sub
    this.radial = radial
    this.lobe = lobe
    this.rings = (keyCount - 1) * sub + 1
    const ringVerts = radial + 1
    const sideCount = this.rings * ringVerts
    const capCount = (capTop ? ringVerts + 1 : 0) + (capBottom ? ringVerts + 1 : 0)

    const positions = new Float32Array((sideCount + capCount) * 3)
    const uvs = new Float32Array((sideCount + capCount) * 2)
    const index = []

    for (let r = 0; r < this.rings - 1; r++) {
      for (let s = 0; s < radial; s++) {
        const a = r * ringVerts + s
        const b = a + ringVerts
        index.push(a, b, a + 1, b, b + 1, a + 1)
      }
    }
    for (let r = 0; r < this.rings; r++) {
      for (let s = 0; s <= radial; s++) {
        const i = r * ringVerts + s
        uvs[i * 2] = s / radial
        uvs[i * 2 + 1] = r / (this.rings - 1)
      }
    }

    // Крышки: центр + отдельное кольцо (свои нормали → чистый срез).
    this.caps = []
    let offset = sideCount
    const addCap = (ringIdx, up) => {
      const center = offset
      const start = offset + 1
      for (let s = 0; s < radial; s++) {
        if (up) index.push(center, start + s, start + s + 1)
        else index.push(center, start + s + 1, start + s)
      }
      this.caps.push({ ringIdx, center, start })
      offset += ringVerts + 1
    }
    if (capBottom) addCap(0, false)
    if (capTop) addCap(this.rings - 1, true)

    this.geometry = new THREE.BufferGeometry()
    this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    this.geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2))
    this.geometry.setIndex(index)
    this.ringVerts = ringVerts
    this.sideCount = sideCount
  }

  /** keys — массив ключевых колец снизу вверх (длина = keyCount). */
  update(keys) {
    const pos = this.geometry.attributes.position.array
    const { sub, radial, ringVerts, lobe } = this
    const ring = { y: 0, a: 0, bf: 0, bb: 0, z: 0 }

    for (let r = 0; r < this.rings; r++) {
      const seg = Math.min(Math.floor(r / sub), keys.length - 2)
      const t = r / sub - seg
      const p0 = keys[Math.max(seg - 1, 0)]
      const p1 = keys[seg]
      const p2 = keys[seg + 1]
      const p3 = keys[Math.min(seg + 2, keys.length - 1)]
      for (const k of ['y', 'a', 'bf', 'bb', 'z']) {
        ring[k] = catmull((p0[k] ?? 0), (p1[k] ?? 0), (p2[k] ?? 0), (p3[k] ?? 0), t)
      }
      // «лепка» груди: лёгкие выпуклости около ±45°, вес задаёт ключ lobeW
      const lobeW = lobe ? catmull(p0.lobe ?? 0, p1.lobe ?? 0, p2.lobe ?? 0, p3.lobe ?? 0, t) : 0

      for (let s = 0; s <= radial; s++) {
        const th = Math.PI + (s / radial) * Math.PI * 2 // шов — на спине
        const sx = Math.sin(th)
        const cz = Math.cos(th)
        const depth = cz > 0 ? ring.bf * (1 + lobeW * Math.sin(2 * th) ** 2 * cz) : ring.bb
        const i = (r * ringVerts + s) * 3
        pos[i] = sx * ring.a
        pos[i + 1] = ring.y
        pos[i + 2] = cz * depth + ring.z
      }
    }

    // крышки повторяют крайние кольца
    for (const cap of this.caps) {
      const base = cap.ringIdx * ringVerts
      let cy = 0, cz = 0
      for (let s = 0; s <= radial; s++) {
        const src = (base + s) * 3
        const dst = (cap.start + s) * 3
        pos[dst] = pos[src]
        pos[dst + 1] = pos[src + 1]
        pos[dst + 2] = pos[src + 2]
        if (s < radial) { cy += pos[src + 1]; cz += pos[src + 2] }
      }
      const c = cap.center * 3
      pos[c] = 0
      pos[c + 1] = cy / radial
      pos[c + 2] = cz / radial
    }

    this.geometry.attributes.position.needsUpdate = true
    this.geometry.computeVertexNormals()
    this.weldSeamNormals()
    this.geometry.computeBoundingSphere()
  }
}

Loft.prototype.weldSeamNormals = function () {
  // первая и последняя вершины кольца совпадают — усредняем нормали,
  // иначе на спине виден шов
  const n = this.geometry.attributes.normal.array
  for (let r = 0; r < this.rings; r++) {
    const i = r * this.ringVerts * 3
    const j = (r * this.ringVerts + this.radial) * 3
    for (let c = 0; c < 3; c++) {
      const avg = (n[i + c] + n[j + c]) / 2
      n[i + c] = avg
      n[j + c] = avg
    }
    const len = Math.hypot(n[i], n[i + 1], n[i + 2]) || 1
    for (let c = 0; c < 3; c++) {
      n[i + c] /= len
      n[j + c] = n[i + c]
    }
  }
  this.geometry.attributes.normal.needsUpdate = true
}

function catmull(p0, p1, p2, p3, t) {
  const t2 = t * t
  const t3 = t2 * t
  return 0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3)
}

/** Полуоси эллипса по обхвату C (м) и соотношению глубина/ширина k. */
export function ellipseFromGirth(C, k) {
  const a = C / (2 * Math.PI * Math.sqrt((1 + k * k) / 2))
  return { a, b: a * k }
}
