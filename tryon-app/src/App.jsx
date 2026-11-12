import { useRef } from 'react'
import { motion } from 'framer-motion'
import { Scene } from './three/Scene'
import { SelectedPanel } from './ui/SelectedPanel'
import { ClothesCarousel } from './ui/ClothesCarousel'
import { RotatePill } from './ui/RotatePill'
import { Dial } from './ui/Dial'
import { useBodyStore } from './store/useBodyStore'
import { useViewStore } from './store/useViewStore'
import { LIMITS } from './lib/body'
import { spring } from './ui/springs'

/**
 * Раскладка по эскизу:
 *  ┌ Выбранная одежда ┬ Манекен ┐
 *  ├ лента карточек   ┤  ‹ ○ ›  │
 *  └ Вес, кг (крутилка)   Рост, см ┘
 */
export default function App() {
  const height = useBodyStore((s) => s.height)
  const weight = useBodyStore((s) => s.weight)
  const setValue = useBodyStore((s) => s.setValue)

  return (
    <div
      className="mx-auto flex w-full max-w-[560px] flex-col overflow-hidden bg-[radial-gradient(90%_60%_at_75%_30%,#fbf7f3_0%,#f3e9e1_60%,#ece0d6_100%)]"
      style={{ height: 'var(--tg-viewport-stable-height, 100dvh)' }}
    >
      <div className="grid min-h-0 basis-[64%] shrink-0 grid-cols-[1.12fr_1fr]">
        {/* левая колонка */}
        <div className="flex min-h-0 min-w-0 flex-col justify-between py-5 pl-4 pr-1">
          <SelectedPanel />
          <ClothesCarousel />
        </div>

        {/* правая колонка — манекен */}
        <div className="relative min-h-0 min-w-0">
          <SpinSurface>
            <Scene />
          </SpinSurface>
          <div className="absolute inset-x-0 bottom-4 flex justify-center">
            <RotatePill />
          </div>
        </div>
      </div>

      {/* регуляторы */}
      <motion.section
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ ...spring.soft, delay: 0.15 }}
        className="grid flex-1 grid-cols-2 gap-2 rounded-t-[28px] bg-white px-4 pt-4 shadow-[0_-8px_30px_rgb(80_40_25/0.08)]"
        style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}
      >
        <Dial label="Вес" unit="кг" value={weight} onChange={(v) => setValue('weight', v)} {...LIMITS.weight} />
        <Dial label="Рост" unit="см" value={height} onChange={(v) => setValue('height', v)} {...LIMITS.height} />
      </motion.section>
    </div>
  )
}

/** Свайп по манекену поворачивает его (вместе с кнопками ‹ ○ ›). */
function SpinSurface({ children }) {
  const last = useRef(null)
  const rotateBy = useViewStore((s) => s.rotateBy)
  return (
    <div
      className="absolute inset-0 touch-pan-y"
      onPointerDown={(e) => (last.current = e.clientX)}
      onPointerMove={(e) => {
        if (last.current === null) return
        rotateBy((e.clientX - last.current) * 0.012)
        last.current = e.clientX
      }}
      onPointerUp={() => (last.current = null)}
      onPointerLeave={() => (last.current = null)}
      onPointerCancel={() => (last.current = null)}
    >
      {children}
    </div>
  )
}
