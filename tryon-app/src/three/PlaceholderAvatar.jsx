import { useMemo, useRef } from 'react'
import { Loft, ellipseFromGirth } from './loft'
import { useDampedBody } from './useDampedBody'
import { BASE_BODY } from '../lib/body'

/**
 * Безголовый манекен из примитивов — временная замена GLB.
 * Корпус, ноги и руки — гладкие «лофты» по эллипсам (обхваты в см → метры),
 * суставы/кисти/стопы — сферы. Вся геометрия пересчитывается только
 * пока фигура плавно меняется.
 */
export function PlaceholderAvatar({ material }) {
  const root = useRef()
  const arms = [useRef(), useRef()]
  const legs = [useRef(), useRef()]
  const shoulders = [useRef(), useRef()]

  const parts = useMemo(
    () => ({
      torso: new Loft({ keyCount: 12, sub: 8, radial: 64, lobe: 1 }),
      leg: new Loft({ keyCount: 8, sub: 6, radial: 40, capTop: false }),
      arm: new Loft({ keyCount: 7, sub: 6, radial: 32, capTop: false }),
    }),
    [],
  )

  useDampedBody((body) => {
    const hs = body.height / BASE_BODY.height
    const dBust = (body.bust - BASE_BODY.bust) / 30
    const dHips = (body.hips - BASE_BODY.hips) / 30

    const hip = ellipseFromGirth(body.hips / 100, 0.74)
    const waist = ellipseFromGirth(body.waist / 100, 0.72)
    const bust = ellipseFromGirth(body.bust / 100, 0.7)
    const shoulderA = 0.178 + (bust.a - 0.167) * 0.45
    const mix = (x, y, t) => x + (y - x) * t

    // ── корпус (снизу вверх) ─────────────────────────────────────
    parts.torso.update([
      { y: 0.74, a: hip.a * 0.74, bf: hip.b * 0.78, bb: hip.b * 0.82 },
      { y: 0.81, a: hip.a * 0.95, bf: hip.b * 0.9, bb: hip.b * 1.0 },
      { y: 0.885, a: hip.a, bf: hip.b * 0.92, bb: hip.b * 1.08 },
      { y: 0.97, a: mix(hip.a, waist.a, 0.6), bf: mix(hip.b * 0.92, waist.b, 0.6), bb: mix(hip.b, waist.b, 0.6) },
      { y: 1.05, a: waist.a, bf: waist.b * 1.02, bb: waist.b * 0.98 },
      { y: 1.135, a: mix(waist.a, bust.a, 0.82), bf: mix(waist.b, bust.b, 0.75), bb: bust.b * 0.86 },
      { y: 1.215, a: bust.a, bf: bust.b * 1.14, bb: bust.b * 0.86, lobe: 0.14 + Math.max(dBust, -0.5) * 0.08 },
      { y: 1.3, a: shoulderA * 0.96, bf: bust.b * 0.86, bb: bust.b * 0.84 },
      { y: 1.365, a: shoulderA * 0.86, bf: 0.075, bb: 0.085 },
      { y: 1.415, a: 0.08, bf: 0.058, bb: 0.06 },
      { y: 1.46, a: 0.054, bf: 0.05, bb: 0.052, z: 0.005 },
      { y: 1.5, a: 0.052, bf: 0.048, bb: 0.05, z: 0.01 },
    ])

    // ── ноги ──────────────────────────────────────────────────────
    const thigh = hip.a * 0.5
    const calf = 0.05 * (1 + dHips * 0.28)
    parts.leg.update([
      { y: 0.035, a: 0.026, bf: 0.03, bb: 0.03 },
      { y: 0.11, a: 0.028, bf: 0.03, bb: 0.032 },
      { y: 0.3, a: calf, bf: calf * 0.95, bb: calf * 1.15 },
      { y: 0.47, a: 0.045 * (1 + dHips * 0.2), bf: 0.046, bb: 0.044 },
      { y: 0.62, a: thigh * 0.8, bf: thigh * 0.82, bb: thigh * 0.8 },
      { y: 0.74, a: thigh, bf: thigh, bb: thigh * 0.98 },
      { y: 0.8, a: thigh * 0.98, bf: thigh * 0.95, bb: thigh },
      { y: 0.84, a: thigh * 0.9, bf: thigh * 0.85, bb: thigh * 0.9 },
    ])
    const legX = hip.a * 0.47
    legs[0].current.position.x = -legX
    legs[1].current.position.x = legX

    // ── руки ──────────────────────────────────────────────────────
    const armK = 1 + Math.max(dBust, -0.4) * 0.35
    parts.arm.update([
      { y: -0.6, a: 0.02, bf: 0.012, bb: 0.012 },
      { y: -0.55, a: 0.024, bf: 0.018, bb: 0.018 },
      { y: -0.43, a: 0.032 * armK, bf: 0.03, bb: 0.03 },
      { y: -0.29, a: 0.031 * armK, bf: 0.03, bb: 0.031 },
      { y: -0.15, a: 0.042 * armK, bf: 0.04 * armK, bb: 0.042 * armK },
      { y: -0.04, a: 0.048 * armK, bf: 0.046 * armK, bb: 0.046 * armK },
      { y: 0.02, a: 0.044 * armK, bf: 0.042 * armK, bb: 0.042 * armK },
    ])
    // руки чуть отводим, чтобы кисти не «входили» в бёдра при любой фигуре
    const shoulderX = shoulderA * 0.93
    const need = hip.a + 0.042 * armK + 0.015 - shoulderX
    const angle = Math.max(0.07, Math.atan2(need, 0.47))
    for (const [i, side] of [[0, -1], [1, 1]]) {
      const g = arms[i].current
      g.position.set(side * shoulderX, 1.35, -0.005)
      g.rotation.z = side * angle
      const s = shoulders[i].current
      s.position.set(side * (shoulderX - 0.012), 1.343, -0.005)
      s.scale.setScalar(0.046 * armK)
    }

    // рост — общий масштаб по вертикали (обхваты в метрах абсолютны)
    root.current.scale.y = hs
  })

  return (
    <group ref={root}>
      <mesh geometry={parts.torso.geometry} material={material} castShadow receiveShadow />

      {[0, 1].map((i) => (
        <group key={`leg${i}`} ref={legs[i]}>
          <mesh geometry={parts.leg.geometry} material={material} castShadow receiveShadow />
          {/* стопа «на носочке», как у витринных манекенов */}
          <mesh position={[0, 0.035, 0.045]} scale={[0.032, 0.026, 0.085]} material={material} castShadow>
            <sphereGeometry args={[1, 32, 16]} />
          </mesh>
        </group>
      ))}

      {[0, 1].map((i) => (
        <group key={`arm${i}`}>
          <mesh ref={shoulders[i]} material={material} castShadow>
            <sphereGeometry args={[1, 32, 16]} />
          </mesh>
          <group ref={arms[i]}>
            <mesh geometry={parts.arm.geometry} material={material} castShadow receiveShadow />
            {/* кисть */}
            <mesh position={[0, -0.665, 0.004]} scale={[0.018, 0.075, 0.036]} material={material} castShadow>
              <sphereGeometry args={[1, 24, 16]} />
            </mesh>
          </group>
        </group>
      ))}
    </group>
  )
}
