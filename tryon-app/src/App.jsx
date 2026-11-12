import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Gallery } from './ui/Gallery'
import { MannequinToggle } from './ui/MannequinToggle'
import { ParamCard } from './ui/ParamCard'
import { NextButton } from './ui/NextButton'
import { useBodyStore } from './store/useBodyStore'
import { PRODUCT, formatPrice } from './data/product'
import { LIMITS } from './lib/body'
import { getBridge } from './lib/miniapp'
import { spring } from './ui/springs'

const TONES = {
  weight: { card: 'bg-[#f7ebe4]', primary: 'bg-[#a4553f] text-white' },
  height: { card: 'bg-[#e7edf3]', primary: 'bg-[#3d5a80] text-white' },
}

const enter = (delay) => ({
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  transition: { ...spring.soft, delay },
})

/**
 * Layout (by the sketch):
 *   ВЫБРАННАЯ ОДЕЖДА          [МАНЕКЕН]
 *   ┌──────── photo gallery ────────┐
 *   [ ВЕС кг ]  [ РОСТ см ]
 *   price                     (Далее →)
 */
export default function App() {
  const [onModel, setOnModel] = useState(true)
  const weight = useBodyStore((s) => s.weight)
  const height = useBodyStore((s) => s.height)
  const setValue = useBodyStore((s) => s.setValue)
  const mode = onModel ? 'model' : 'hanger'

  const next = () => {
    try {
      getBridge()?.HapticFeedback?.impactOccurred?.('medium')
    } catch {
      /* noop */
    }
    // TODO: next step of the flow (size selection / cart)
  }

  return (
    <div
      className="mx-auto flex w-full max-w-[520px] flex-col gap-4 px-4"
      style={{
        height: 'var(--tg-viewport-stable-height, 100dvh)',
        paddingTop: 'max(16px, env(safe-area-inset-top))',
        paddingBottom: 'max(16px, env(safe-area-inset-bottom))',
      }}
    >
      <motion.header {...enter(0)} className="flex shrink-0 items-start justify-between gap-3">
        <div>
          <h1 className="text-[30px] font-extrabold uppercase leading-[1.02] tracking-tight text-ink">
            Выбранная
            <br />
            одежда
          </h1>
          <p className="mt-1.5 text-[16px] font-medium text-muted">{PRODUCT.name}</p>
        </div>
        <MannequinToggle on={onModel} onToggle={() => setOnModel((v) => !v)} />
      </motion.header>

      <motion.div {...enter(0.08)} className="flex min-h-0 flex-1 flex-col">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={mode}
            className="flex min-h-0 flex-1 flex-col"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          >
            <Gallery slides={PRODUCT.photos[mode]} color={PRODUCT.color} badge={onModel ? 'Фото на модели' : 'Фото на вешалке'} />
          </motion.div>
        </AnimatePresence>
      </motion.div>

      <motion.section {...enter(0.16)} className="grid shrink-0 grid-cols-2 gap-3">
        <ParamCard label="ВЕС" unit="кг" value={weight} onChange={(v) => setValue('weight', v)} tone={TONES.weight} {...LIMITS.weight} />
        <ParamCard label="РОСТ" unit="см" value={height} onChange={(v) => setValue('height', v)} tone={TONES.height} {...LIMITS.height} />
      </motion.section>

      <motion.footer {...enter(0.24)} className="flex shrink-0 items-center justify-between gap-3">
        <div className="leading-tight">
          <div className="text-[14px] font-medium text-muted">Цена</div>
          <div className="text-[24px] font-extrabold tabular-nums text-ink">{formatPrice(PRODUCT.price)}</div>
        </div>
        <NextButton onClick={next} />
      </motion.footer>
    </div>
  )
}
