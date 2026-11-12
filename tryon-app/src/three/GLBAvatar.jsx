import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import { useDampedBody } from './useDampedBody'
import { bodyDeltas } from '../lib/body'
import { MORPH_MAP } from '../config/avatar'

/**
 * Безголовый манекен из GLB + всё, что на нём надето (children).
 * Каждый кадр веса морфов из MORPH_MAP применяются ко ВСЕМ мешам группы:
 * одежда с теми же shape keys деформируется вместе с телом.
 */
export function GLBAvatar({ url, material, children }) {
  const { scene } = useGLTF(url)
  const root = useRef()
  const body = useDampedBody()

  useEffect(() => {
    scene.traverse((o) => {
      if (!o.isMesh) return
      o.castShadow = true
      o.receiveShadow = true
      if (material) o.material = material
    })
  }, [scene, material])

  useFrame(() => {
    const d = bodyDeltas(body.current)
    root.current.scale.y = d.height
    root.current.traverse((o) => {
      const dict = o.morphTargetDictionary
      if (!dict) return
      for (const name in MORPH_MAP) {
        const idx = dict[name]
        if (idx !== undefined) o.morphTargetInfluences[idx] = MORPH_MAP[name](d)
      }
    })
  })

  return (
    <group ref={root}>
      <primitive object={scene} />
      {children}
    </group>
  )
}
