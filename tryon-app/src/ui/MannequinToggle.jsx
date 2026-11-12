import { motion } from 'framer-motion'
import { spring } from './springs'

/**
 * «МАНЕКЕН»: on — photos on a model, off — photos on a hanger.
 * The state is spelled out under the label so it is never ambiguous.
 */
export function MannequinToggle({ on, onToggle }) {
  return (
    <motion.button
      type="button"
      onClick={onToggle}
      aria-pressed={on}
      whileTap={{ scale: 0.92 }}
      transition={spring.bouncy}
      className={`flex shrink-0 items-center gap-2.5 rounded-[22px] py-2.5 pl-3 pr-4 shadow-[0_8px_20px_-10px_rgb(40_30_20/0.4)] transition-colors duration-300 ${
        on ? 'bg-ink text-white' : 'bg-white text-ink ring-1 ring-black/10'
      }`}
    >
      <span className={`grid size-9 place-items-center rounded-full transition-colors duration-300 ${on ? 'bg-white/15' : 'bg-cream'}`}>
        <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          {on ? (
            // dress form
            <path d="M12 3v2M8 5h8l-1 5c1.5 1 2 3 2 5l-1 4H8l-1-4c0-2 .5-4 2-5L8 5zM12 19v2M9 21h6" />
          ) : (
            // hanger
            <path d="M12 7a2 2 0 1 1 2-2M12 7v2l8.5 5.5a1.5 1.5 0 0 1-.8 2.8H4.3a1.5 1.5 0 0 1-.8-2.8L12 9" />
          )}
        </svg>
      </span>
      <span className="flex flex-col items-start leading-tight">
        <span className="text-[16px] font-extrabold tracking-wide">МАНЕКЕН</span>
        <span className={`text-[13px] font-medium ${on ? 'text-white/70' : 'text-muted'}`}>{on ? 'на модели' : 'на вешалке'}</span>
      </span>
    </motion.button>
  )
}
