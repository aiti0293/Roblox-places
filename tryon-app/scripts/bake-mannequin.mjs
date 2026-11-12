/**
 * Запекает манекен и одежду в public/models/*.glb:
 * гладкая сетка + морф-таргеты (Bust/Waist/Hips _Plus/_Minus),
 * квантование и сжатие meshopt (drei useGLTF распаковывает сам).
 *
 *   npm run bake            — всё
 *   npm run bake -- jacket  — только то, где в имени есть «jacket»
 */
import { mkdirSync, statSync } from 'node:fs'
import { dirname } from 'node:path'
import { Document, NodeIO } from '@gltf-transform/core'
import { EXTMeshoptCompression, KHRMeshQuantization } from '@gltf-transform/extensions'
import { reorder, quantize } from '@gltf-transform/functions'
import { MeshoptEncoder } from 'meshoptimizer'
import { buildMorphMesh } from '../src/three/procedural/buildMannequin.js'
import { makeBodySdf } from '../src/three/procedural/bodySdf.js'
import { GARMENTS } from '../src/three/procedural/garments.js'

const root = new URL('../public/models/', import.meta.url).pathname
const jobs = [
  { name: 'Mannequin', file: 'mannequin.glb', make: (b, x) => makeBodySdf(b, x), opts: {} },
  ...Object.entries(GARMENTS).map(([id, g]) => ({
    name: id,
    file: `garments/${id}.glb`,
    make: (b, x) => makeBodySdf(b, { ...g, ...x }),
    opts: { bounds: g.bounds, cell: 0.008 },
  })),
]
const filter = process.argv[2]

await MeshoptEncoder.ready
for (const job of jobs.filter((j) => !filter || j.file.includes(filter))) {
  const t0 = performance.now()
  const m = buildMorphMesh(job.make, job.opts)
  const out = root + job.file
  mkdirSync(dirname(out), { recursive: true })
  await writeGlb(job.name, m, out)
  console.log(`${job.file}: ${m.positions.length / 3} вершин, ${Math.round(performance.now() - t0)} мс, ${(statSync(out).size / 1024).toFixed(0)} КБ`)
}

async function writeGlb(name, m, out) {
  const doc = new Document()
  const buffer = doc.createBuffer()
  const acc = (type, array) => doc.createAccessor().setType(type).setArray(array).setBuffer(buffer)
  const prim = doc
    .createPrimitive()
    .setAttribute('POSITION', acc('VEC3', m.positions))
    .setAttribute('NORMAL', acc('VEC3', m.normals))
    .setIndices(acc('SCALAR', m.index))
  const names = Object.keys(m.morphs)
  for (const n of names) {
    const t = m.morphs[n]
    prim.addTarget(doc.createPrimitiveTarget(n).setAttribute('POSITION', acc('VEC3', t.position)).setAttribute('NORMAL', acc('VEC3', t.normal)))
  }
  const mesh = doc.createMesh(name).addPrimitive(prim).setWeights(names.map(() => 0)).setExtras({ targetNames: names })
  doc.createScene('Scene').addChild(doc.createNode(name).setMesh(mesh))

  doc.createExtension(KHRMeshQuantization).setRequired(true)
  doc.createExtension(EXTMeshoptCompression).setRequired(true).setEncoderOptions({ method: EXTMeshoptCompression.EncoderMethod.QUANTIZE })
  await doc.transform(reorder({ encoder: MeshoptEncoder }), quantize({ quantizePosition: 14, quantizeNormal: 10 }))
  const io = new NodeIO().registerExtensions([EXTMeshoptCompression, KHRMeshQuantization]).registerDependencies({ 'meshopt.encoder': MeshoptEncoder })
  await io.write(out, doc)
}
