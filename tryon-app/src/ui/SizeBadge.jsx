import { AnimatePresence, motion } from 'framer-motion'
import { spring } from './springs'

/** «Ваш размер: 48 · L» — цифра мягко перелистывается при смене. */
export function SizeBadge({ ru, intl }) {
  return (
    <div className="flex items-center gap-2 rounded-2xl bg-accent-soft px-3.5 py-2" aria-live="polite">
      <span className="text-[14px] font-medium text-muted">Ваш размер</span>
      <span className="relative inline-flex h-7 min-w-[64px] items-center justify-end overflow-hidden">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={ru}
            initial={{ y: 18, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -18, opacity: 0 }}
            transition={spring.snappy}
            className="whitespace-nowrap text-[20px] font-extrabold tabular-nums text-accent"
          >
            {ru} <span className="text-[15px] font-bold">· {intl}</span>
          </motion.span>
        </AnimatePresence>
      </span>
    </div>
  )
}
