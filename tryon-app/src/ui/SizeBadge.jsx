import { useEffect, useRef } from 'react'
import { AnimatePresence, motion, useAnimationControls } from 'framer-motion'
import { spring } from './springs'

/**
 * «Ваш размер: 46 M» — highly visible badge. When the size changes the
 * number rolls in the direction of the change and the badge gives a soft pulse.
 * Outside the chart the label switches to «Ближайший размер:» (same height,
 * so the layout never jumps).
 */
export function SizeBadge({ size, letter, fit }) {
  const prev = useRef(size)
  const dir = size >= prev.current ? 1 : -1
  const pulse = useAnimationControls()

  useEffect(() => {
    if (prev.current !== size) pulse.start({ scale: [1, 1.05, 1], transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } })
    prev.current = size
  }, [size, pulse])

  return (
    <motion.div
      animate={pulse}
      className="flex min-w-0 flex-1 flex-col justify-center rounded-[26px] bg-[#e2ecdd] px-5 py-2.5 text-[#22402a] shadow-[0_10px_26px_-16px_rgb(34_64_42/0.6)]"
      aria-live="polite"
      aria-label={fit === 'above' ? `Ближайший размер: ${size}, уточните у консультанта` : `Ваш размер: ${size}`}
    >
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={fit}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={spring.snappy}
          className="whitespace-nowrap text-[15px] font-semibold leading-tight"
        >
          {fit === 'above' ? 'Ближайший размер:' : 'Ваш размер:'}
        </motion.span>
      </AnimatePresence>
      <div className="flex items-baseline gap-2">
        <span className="relative inline-flex h-[44px] items-center overflow-hidden">
          <AnimatePresence mode="popLayout" initial={false} custom={dir}>
            <motion.span
              key={size}
              custom={dir}
              variants={{
                enter: (d) => ({ y: d > 0 ? 30 : -30, opacity: 0 }),
                center: { y: 0, opacity: 1 },
                exit: (d) => ({ y: d > 0 ? -30 : 30, opacity: 0 }),
              }}
              initial="enter"
              animate="center"
              exit="exit"
              transition={spring.snappy}
              className="text-[42px] font-extrabold leading-none tabular-nums tracking-tight"
            >
              {size}
            </motion.span>
          </AnimatePresence>
        </span>
        <span className="text-[20px] font-bold opacity-75">{letter}</span>
      </div>
    </motion.div>
  )
}
