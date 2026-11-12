import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

/** Ненавязчивая подсказка; исчезает после первого касания или через 5 с. */
export function RotateHint() {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const hide = () => setVisible(false)
    const t = setTimeout(hide, 5000)
    window.addEventListener('pointerdown', hide, { once: true })
    return () => {
      clearTimeout(t)
      window.removeEventListener('pointerdown', hide)
    }
  }, [])

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          transition={{ type: 'spring', stiffness: 260, damping: 26, delay: 0.6 }}
        >
          <div className="flex items-center gap-2 rounded-full bg-white/80 px-4 py-2 text-[15px] font-medium text-ink shadow-sm backdrop-blur">
            <motion.span
              aria-hidden
              animate={{ x: [-4, 4, -4] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
            >
              ↔
            </motion.span>
            Проведите пальцем, чтобы повернуть
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
