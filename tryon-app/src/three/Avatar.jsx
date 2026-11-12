import { Suspense, useMemo } from 'react'
import * as THREE from 'three'
import { useGLTF } from '@react-three/drei'
import { AVATAR_URL } from '../config/avatar'
import { CATALOG } from '../data/catalog'
import { useLookStore } from '../store/useLookStore'
import { GLBAvatar } from './GLBAvatar'
import { Garment } from './Garment'

/** Матовый «витринный» пластик с лёгким бархатным отблеском. */
function useMannequinMaterial() {
  return useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: '#d4c0b1',
        roughness: 0.52,
        sheen: 0.6,
        sheenRoughness: 0.5,
        sheenColor: new THREE.Color('#fff6ef'),
        clearcoat: 0.15,
        clearcoatRoughness: 0.6,
        envMapIntensity: 0.85,
      }),
    [],
  )
}

export function Avatar() {
  const material = useMannequinMaterial()
  const worn = useLookStore((s) => s.worn)
  const items = Object.values(worn).map((id) => CATALOG.find((i) => i.id === id))

  return (
    <GLBAvatar url={AVATAR_URL} material={material}>
      {items.map((item) => (
        // у каждой вещи свой Suspense: пока грузится — манекен не исчезает
        <Suspense key={item.id} fallback={null}>
          <Garment url={item.model} color={item.color} />
        </Suspense>
      ))}
    </GLBAvatar>
  )
}

useGLTF.preload(AVATAR_URL)
