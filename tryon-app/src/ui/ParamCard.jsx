import { useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { hapticTick } from '../lib/miniapp'
import { useHoldRepeat } from './useHoldRepeat'
import { spring } from './springs'

/**
 * Large parameter card: label, oversized number, two big round − / +
 * buttons (hold to change fast). The number rolls up or down depending
 * on the direction of the change.
 */
export function ParamCard({ label, unit, value, min, max, step = 1, onChange, tone }) {
  const dir = useRef(1)
  const valueRef = useRef(value)
  valueRef.current = value

  const change = (delta) => {
    const next = Math.min(max, Math.max(min, valueRef.current + delta))
    if (next === valueRef.current) return
    dir.current = Math.sign(delta)
    valueRef.current = next
    onChange(next)
    hapticTick()
  }

  const minus = useHoldRepeat(() => change(-step))
  const plus = useHoldRepeat(() => change(step))

  return (
    <div className={`flex flex-col rounded-[28px] p-4 shadow-[0_10px_30px_-14px_rgb(40_30_20/0.25)] ${tone.card}`} role="group" aria-label={`${label}, ${unit}`}>
      <div className="flex items-baseline gap-1.5">
        <span className="text-[18px] font-extrabold tracking-wide text-ink">{label}</span>
        <span className="text-[16px] font-semibold text-muted">{unit}</span>
      </div>

      <div className="relative my-1 flex h-[64px] items-center justify-center overflow-hidden" aria-live="polite">
        <AnimatePresence mode="popLayout" initial={false} custom={dir.current}>
          <motion.span
            key={value}
            custom={dir.current}
            variants={{
              enter: (d) => ({ y: d > 0 ? 34 : -34, opacity: 0 }),
              center: { y: 0, opacity: 1 },
              exit: (d) => ({ y: d > 0 ? -34 : 34, opacity: 0 }),
            }}
            initial="enter"
            animate="center"
            exit="exit"
            transition={spring.snappy}
            className="text-[54px] font-extrabold leading-none tabular-nums tracking-tight text-ink"
          >
            {value}
          </motion.span>
        </AnimatePresence>
      </div>

      <div className="flex justify-between gap-3">
        <RoundButton label={`Уменьшить ${label.toLowerCase()}`} disabled={value <= min} tone={tone} handlers={minus}>
          <path d="M6 12 H18" />
        </RoundButton>
        <RoundButton label={`Увеличить ${label.toLowerCase()}`} disabled={value >= max} tone={tone} handlers={plus} primary>
          <path d="M6 12 H18 M12 6 V18" />
        </RoundButton>
      </div>
    </div>
  )
}

function RoundButton({ children, label, disabled, tone, handlers, primary }) {
  return (
    <motion.button
      type="button"
      aria-label={label}
      disabled={disabled}
      whileTap={{ scale: 0.88 }}
      transition={spring.bouncy}
      className={`grid h-14 flex-1 touch-none select-none place-items-center rounded-full transition-colors disabled:opacity-35 ${
        primary ? tone.primary : 'bg-white text-ink ring-1 ring-black/5'
      }`}
      {...handlers}
    >
      <svg viewBox="0 0 24 24" className="size-7" aria-hidden fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round">
        {children}
      </svg>
    </motion.button>
  )
}
