import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { easing } from 'maath'
import { useBodyStore } from '../store/useBodyStore'
import { resolveBody } from '../lib/body'

const KEYS = ['height', 'bust', 'waist', 'hips']

/**
 * Плавно «догоняет» целевую фигуру из стора (критически демпфированная
 * пружина maath) и вызывает onUpdate(body) только когда фигура реально
 * меняется. Стор читается без ре-рендеров React — всё в useFrame.
 *
 * @param {(body: object, isFirst: boolean) => void} onUpdate
 * @param {number} smoothTime — секунды до ~выравнивания (меньше = резче)
 */
export function useDampedBody(onUpdate, smoothTime = 0.35) {
  const target = useRef(resolveBody(useBodyStore.getState()))
  const current = useRef({ ...target.current })
  const first = useRef(true)

  useEffect(
    () => useBodyStore.subscribe((s) => (target.current = resolveBody(s))),
    [],
  )

  useFrame((_, delta) => {
    let moving = first.current
    for (const k of KEYS) {
      // ограничиваем dt: после сворачивания вкладки не «телепортируемся»
      if (easing.damp(current.current, k, target.current[k], smoothTime, Math.min(delta, 0.05), Infinity, undefined, 0.01)) {
        moving = true
      }
    }
    if (moving) {
      onUpdate(current.current, first.current)
      first.current = false
    }
  })

  return current
}
