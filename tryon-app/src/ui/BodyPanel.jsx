import { AnimatePresence, motion } from 'framer-motion'
import { useBodyStore } from '../store/useBodyStore'
import { LIMITS, resolveBody, sizeFor } from '../lib/body'
import { Segmented } from './Segmented'
import { SizeBadge } from './SizeBadge'
import { SliderRow } from './SliderRow'
import { spring } from './springs'

const MODES = [
  { value: 'hw', label: 'Рост и вес' },
  { value: 'measure', label: 'Мои мерки' },
]

const FIELDS = {
  hw: [
    { key: 'height', label: 'Рост' },
    { key: 'weight', label: 'Вес' },
  ],
  measure: [
    { key: 'height', label: 'Рост' },
    { key: 'bust', label: 'Обхват груди' },
    { key: 'waist', label: 'Обхват талии' },
    { key: 'hips', label: 'Обхват бёдер' },
  ],
}

export function BodyPanel() {
  const state = useBodyStore()
  const size = sizeFor(resolveBody(state))

  return (
    <motion.section
      initial={{ y: 60, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ ...spring.soft, delay: 0.15 }}
      className="relative z-10 -mt-6 flex min-h-0 flex-1 flex-col rounded-t-[28px] bg-white shadow-[0_-8px_30px_rgb(80_40_25/0.08)]"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="mx-auto mt-2.5 h-1.5 w-10 rounded-full bg-sand" aria-hidden />

      <header className="flex items-center justify-between gap-3 px-5 pt-3">
        <h1 className="text-[22px] font-extrabold tracking-tight text-ink">Ваша фигура</h1>
        <SizeBadge ru={size.ru} intl={size.intl} />
      </header>

      <div className="px-5 pt-3">
        <Segmented options={MODES} value={state.mode} onChange={state.setMode} />
      </div>

      <div className="fade-scroll min-h-0 flex-1 overflow-y-auto px-5 pb-4 pt-1">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={state.mode}
            initial={{ opacity: 0, x: state.mode === 'measure' ? 24 : -24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: state.mode === 'measure' ? -24 : 24 }}
            transition={spring.snappy}
          >
            {FIELDS[state.mode].map((f) => (
              <SliderRow
                key={f.key}
                label={f.label}
                value={state[f.key]}
                onChange={(v) => state.setValue(f.key, v)}
                {...LIMITS[f.key]}
              />
            ))}
            {state.mode === 'measure' ? (
              <p className="pt-1 text-[14px] leading-snug text-muted">
                Измеряйте по самым выступающим точкам, сантиметр — без натяжения.
              </p>
            ) : (
              <p className="pt-1 text-[14px] leading-snug text-muted">
                Знаете свои мерки? Во вкладке «Мои мерки» посадка будет точнее.
              </p>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </motion.section>
  )
}
