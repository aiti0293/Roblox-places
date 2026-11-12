import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { easing } from 'maath'
import { useBodyStore } from '../store/useBodyStore'
import { resolveBody } from '../lib/body'

const KEYS = ['height', 'bust', 'waist', 'hips']

/**
 * Текущая (плавно догоняющая цель) фигура. Стор читается без ре-рендеров
 * React; критически демпфированная пружина maath — без «перелёта».
 * Возвращает ref, значение обновляется в useFrame до остальных подписчиков.
 */
export function useDampedBody(smoothTime = 0.35) {
  const target = useRef(resolveBody(useBodyStore.getState()))
  const current = useRef({ ...target.current })

  useEffect(() => useBodyStore.subscribe((s) => (target.current = resolveBody(s))), [])

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05) // после сворачивания вкладки — без «телепорта»
    for (const k of KEYS) easing.damp(current.current, k, target.current[k], smoothTime, dt)
  }, -1)

  return current
}
