import { useId } from 'react'
import { motion } from 'framer-motion'
import { hapticTick } from '../lib/miniapp'
import { spring } from './springs'

/**
 * Строка параметра: подпись, крупное значение и слайдер с кнопками «−/+».
 * Кнопки важны: двигать бегунок на 1 см пальцем трудно, а нажать «+» — легко.
 */
export function SliderRow({ label, hint, value, onChange, min, max, step = 1, unit }) {
  const id = useId()
  const fill = `${((value - min) / (max - min)) * 100}%`

  const set = (v) => {
    const next = Math.min(max, Math.max(min, v))
    if (next !== value) {
      onChange(next)
      hapticTick()
    }
  }

  return (
    <div className="py-1.5">
      <div className="flex items-baseline justify-between">
        <label htmlFor={id} className="text-[16px] font-semibold text-ink">
          {label}
          {hint && <span className="ml-2 text-[13px] font-medium text-muted">{hint}</span>}
        </label>
        <div className="flex items-baseline gap-1 tabular-nums">
          <motion.span
            key={value}
            initial={{ opacity: 0.4, y: -3 }}
            animate={{ opacity: 1, y: 0 }}
            transition={spring.snappy}
            className="text-[20px] font-bold text-ink"
          >
            {value}
          </motion.span>
          <span className="text-[14px] font-medium text-muted">{unit}</span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <StepButton label={`Уменьшить: ${label}`} onClick={() => set(value - step)} disabled={value <= min}>
          −
        </StepButton>
        <input
          id={id}
          type="range"
          className="body-range"
          min={min}
          max={max}
          step={step}
          value={value}
          style={{ '--fill': fill }}
          onChange={(e) => set(Number(e.target.value))}
          aria-valuetext={`${value} ${unit}`}
        />
        <StepButton label={`Увеличить: ${label}`} onClick={() => set(value + step)} disabled={value >= max}>
          +
        </StepButton>
      </div>
    </div>
  )
}

function StepButton({ children, label, ...props }) {
  return (
    <motion.button
      type="button"
      aria-label={label}
      whileTap={{ scale: 0.88 }}
      transition={spring.bouncy}
      className="grid size-11 shrink-0 place-items-center rounded-full bg-white text-[22px] font-semibold leading-none text-ink shadow-[0_2px_8px_rgb(80_40_25/0.10)] ring-1 ring-sand disabled:opacity-35"
      {...props}
    >
      {children}
    </motion.button>
  )
}
