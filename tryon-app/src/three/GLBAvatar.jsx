import { useEffect, useMemo, useRef } from 'react'
import { useGLTF } from '@react-three/drei'
import { useDampedBody } from './useDampedBody'
import { bodyDeltas } from '../lib/body'
import { MORPH_MAP } from '../config/avatar'

/**
 * Загрузчик безголового GLB-манекена.
 * - Морф-таргеты из MORPH_MAP получают плавно меняющиеся веса.
 * - Рост — масштаб корня по вертикали.
 * - Всё, что позже появится внутри группы (одежда со скелетом и теми же
 *   shape keys), деформируется тем же кодом — см. collectMorphMeshes.
 */
export function GLBAvatar({ url, material, children }) {
  const { scene } = useGLTF(url)
  const root = useRef()
  const morphMeshes = useRef([])

  // Манекену — наш «премиальный» материал, если модель без своего.
  useEffect(() => {
    scene.traverse((o) => {
      if (!o.isMesh) return
      o.castShadow = true
      o.receiveShadow = true
      if (material && !o.userData.keepMaterial) o.material = material
    })
  }, [scene, material])

  const collect = useMemo(
    () => () => {
      const list = []
      root.current?.traverse((o) => {
        if (o.isMesh && o.morphTargetDictionary) list.push(o)
      })
      morphMeshes.current = list
    },
    [],
  )

  // Пересобираем список, когда меняется состав (например, надели куртку).
  useEffect(collect, [collect, scene, children])

  useDampedBody((body) => {
    const d = bodyDeltas(body)
    for (const mesh of morphMeshes.current) {
      const dict = mesh.morphTargetDictionary
      for (const name in MORPH_MAP) {
        const idx = dict[name]
        if (idx !== undefined) mesh.morphTargetInfluences[idx] = MORPH_MAP[name](d)
      }
    }
    if (root.current) root.current.scale.y = d.height
  })

  return (
    <group ref={root}>
      <primitive object={scene} />
      {children}
    </group>
  )
}
