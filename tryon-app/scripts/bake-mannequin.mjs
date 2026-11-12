/**
 * Запекает процедурный манекен в public/models/mannequin.glb:
 * одна гладкая сетка + морф-таргеты (Bust/Waist/Hips _Plus/_Minus),
 * квантование и сжатие meshopt (drei useGLTF распаковывает сам).
 *
 *   npm run bake
 */
import { Document, NodeIO } from '@gltf-transform/core'
import { EXTMeshoptCompression, KHRMeshQuantization } from '@gltf-transform/extensions'
import { reorder, quantize } from '@gltf-transform/functions'
import { MeshoptEncoder } from 'meshoptimizer'
import { buildMannequin } from '../src/three/procedural/buildMannequin.js'

const out = new URL('../public/models/mannequin.glb', import.meta.url).pathname

const t0 = performance.now()
const m = buildMannequin({ cell: Number(process.env.CELL) || 0.0075 })
console.log(`сетка: ${m.positions.length / 3} вершин, ${m.index.length / 3} треугольников, ${Math.round(performance.now() - t0)} мс`)

const doc = new Document()
const buffer = doc.createBuffer()
const acc = (type, array) => doc.createAccessor().setType(type).setArray(array).setBuffer(buffer)

const prim = doc
  .createPrimitive()
  .setAttribute('POSITION', acc('VEC3', m.positions))
  .setAttribute('NORMAL', acc('VEC3', m.normals))
  .setIndices(acc('SCALAR', m.index))

const names = []
for (const [name, t] of Object.entries(m.morphs)) {
  prim.addTarget(
    doc.createPrimitiveTarget(name).setAttribute('POSITION', acc('VEC3', t.position)).setAttribute('NORMAL', acc('VEC3', t.normal)),
  )
  names.push(name)
}

const mesh = doc.createMesh('Mannequin').addPrimitive(prim).setWeights(names.map(() => 0)).setExtras({ targetNames: names })
const node = doc.createNode('Mannequin').setMesh(mesh)
doc.createScene('Scene').addChild(node)

await MeshoptEncoder.ready
doc.createExtension(KHRMeshQuantization).setRequired(true)
doc.createExtension(EXTMeshoptCompression).setRequired(true).setEncoderOptions({ method: EXTMeshoptCompression.EncoderMethod.QUANTIZE })
await doc.transform(reorder({ encoder: MeshoptEncoder }), quantize({ quantizePosition: 14, quantizeNormal: 10 }))

const io = new NodeIO().registerExtensions([EXTMeshoptCompression, KHRMeshQuantization]).registerDependencies({ 'meshopt.encoder': MeshoptEncoder })
await io.write(out, doc)
const { statSync } = await import('node:fs')
console.log(`записано: ${out} (${(statSync(out).size / 1024).toFixed(0)} КБ)`)
