import { motion } from 'framer-motion'
import { spring } from './springs'

/** Переключатель режимов с «перетекающей» плашкой (shared layout). */
export function Segmented({ options, value, onChange }) {
  return (
    <div role="tablist" className="grid grid-cols-2 rounded-2xl bg-sand/70 p-1">
      {options.map((o) => {
        const active = o.value === value
        return (
          <button
            key={o.value}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(o.value)}
            className="relative h-11 rounded-xl text-[16px] font-semibold"
          >
            {active && (
              <motion.span
                layoutId="segmented-pill"
                transition={spring.snappy}
                className="absolute inset-0 rounded-xl bg-white shadow-[0_2px_10px_rgb(80_40_25/0.12)]"
              />
            )}
            <span className={`relative transition-colors ${active ? 'text-ink' : 'text-muted'}`}>{o.label}</span>
          </button>
        )
      })}
    </div>
  )
}
