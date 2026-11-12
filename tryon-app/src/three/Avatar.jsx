import { useMemo } from 'react'
import * as THREE from 'three'
import { AVATAR_URL } from '../config/avatar'
import { GLBAvatar } from './GLBAvatar'
import { PlaceholderAvatar } from './PlaceholderAvatar'

/** Матовый «витринный» пластик с лёгким бархатным отблеском. */
function useMannequinMaterial() {
  return useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: '#dccabc',
        envMapIntensity: 0.85,
        roughness: 0.52,
        metalness: 0,
        sheen: 0.6,
        sheenRoughness: 0.5,
        sheenColor: new THREE.Color('#fff6ef'),
        clearcoat: 0.15,
        clearcoatRoughness: 0.6,
      }),
    [],
  )
}

export function Avatar() {
  const material = useMannequinMaterial()
  return AVATAR_URL ? <GLBAvatar url={AVATAR_URL} material={material} /> : <PlaceholderAvatar material={material} />
}
