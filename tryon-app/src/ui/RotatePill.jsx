import { motion } from 'framer-motion'
import { useViewStore } from '../store/useViewStore'
import { spring } from './springs'

const STEP = Math.PI / 4

/** «‹ ○ ›» под манекеном: повернуть влево / анфас / вправо. */
export function RotatePill() {
  const { rotateBy, reset } = useViewStore()
  const btn = 'grid size-11 place-items-center rounded-full text-ink active:bg-sand/60'
  return (
    <div className="flex items-center gap-1 rounded-full bg-white/90 p-1 shadow-[0_4px_16px_rgb(80_40_25/0.12)] backdrop-blur">
      <motion.button whileTap={{ scale: 0.85 }} transition={spring.bouncy} className={btn} onClick={() => rotateBy(-STEP)} aria-label="Повернуть влево">
        <Chevron dir={-1} />
      </motion.button>
      <motion.button whileTap={{ scale: 0.85 }} transition={spring.bouncy} className={btn} onClick={reset} aria-label="Повернуть лицом">
        <span className="block size-5 rounded-full border-[2.5px] border-ink" />
      </motion.button>
      <motion.button whileTap={{ scale: 0.85 }} transition={spring.bouncy} className={btn} onClick={() => rotateBy(STEP)} aria-label="Повернуть вправо">
        <Chevron dir={1} />
      </motion.button>
    </div>
  )
}

function Chevron({ dir }) {
  return (
    <svg viewBox="0 0 24 24" className="size-6" aria-hidden>
      <path d={dir < 0 ? 'M15 5 L8 12 L15 19' : 'M9 5 L16 12 L9 19'} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
