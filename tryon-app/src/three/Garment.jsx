import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import { easing } from 'maath'

/** Матовая ткань с мягким ворсовым отблеском (шерсть, кашемир). */
function useFabric(color) {
  return useMemo(() => {
    const c = new THREE.Color(color)
    return new THREE.MeshPhysicalMaterial({
      color: c,
      roughness: 0.82,
      sheen: 1,
      sheenRoughness: 0.7,
      sheenColor: c.clone().lerp(new THREE.Color('#ffffff'), 0.45),
      transparent: true,
      opacity: 0,
    })
  }, [color])
}

/**
 * Вещь на манекене. Морфы ей выставляет GLBAvatar (родитель),
 * здесь — только материал и мягкое проявление.
 */
export function Garment({ url, color }) {
  const { scene } = useGLTF(url)
  const material = useFabric(color)
  const object = useMemo(() => scene.clone(true), [scene])

  useEffect(() => {
    object.traverse((o) => {
      if (!o.isMesh) return
      o.material = material
      o.castShadow = true
      o.receiveShadow = true
    })
    return () => material.dispose()
  }, [object, material])

  useFrame((_, dt) => {
    if (material.opacity >= 0.995) {
      if (material.transparent) {
        material.opacity = 1
        material.transparent = false
        material.needsUpdate = true
      }
      return
    }
    easing.damp(material, 'opacity', 1, 0.18, dt)
  })

  return <primitive object={object} />
}
