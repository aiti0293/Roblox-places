import { motion } from 'framer-motion'
import { spring } from './springs'

/** Large pill «Далее →» with a tactile press (scale down + arrow nudge). */
export function NextButton({ onClick }) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      initial="rest"
      animate="rest"
      whileHover="hover"
      whileTap="tap"
      variants={{ rest: { scale: 1 }, hover: { scale: 1.02 }, tap: { scale: 0.94 } }}
      transition={spring.bouncy}
      className="flex h-16 items-center gap-3 rounded-full bg-ink pl-8 pr-2 text-white shadow-[0_14px_30px_-12px_rgb(31_26_23/0.6)]"
    >
      <span className="text-[20px] font-bold">Далее</span>
      <motion.span
        variants={{ rest: { x: 0 }, hover: { x: 3 }, tap: { x: 6 } }}
        transition={spring.bouncy}
        className="grid size-12 place-items-center rounded-full bg-white text-ink"
      >
        <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M5 12 H19 M13 6 L19 12 L13 18" />
        </svg>
      </motion.span>
    </motion.button>
  )
}
