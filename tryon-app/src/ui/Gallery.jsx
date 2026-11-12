import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { AnimatePresence, animate, motion, useMotionValue, useTransform } from 'framer-motion'
import { Photo } from './Photo'
import { hapticTick } from '../lib/miniapp'
import { spring } from './springs'

const GAP = 12

/**
 * Swipeable photo gallery.
 * - Drag follows the finger 1:1, release snaps with a spring; a quick flick
 *   is enough to change the photo (velocity-aware).
 * - Rubber-band resistance at the ends.
 * - Large arrow buttons and tappable dots for those who prefer tapping.
 */
export function Gallery({ slides, color, badge }) {
  const viewport = useRef(null)
  const [width, setWidth] = useState(0)
  const [index, setIndex] = useState(0)
  const x = useMotionValue(0)
  const step = width + GAP
  const last = slides.length - 1

  useLayoutEffect(() => {
    const el = viewport.current
    const ro = new ResizeObserver(([e]) => setWidth(e.contentRect.width))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // keep position correct after resize (rotation, viewport change)
  useEffect(() => {
    x.set(-index * step)
  }, [step]) // eslint-disable-line react-hooks/exhaustive-deps

  const goTo = useCallback(
    (i) => {
      const next = Math.max(0, Math.min(last, i))
      if (next !== index) hapticTick()
      setIndex(next)
      animate(x, -next * step, spring.slide)
    },
    [index, last, step, x],
  )

  const onDragEnd = (_, info) => {
    const { offset, velocity } = info
    let next = index
    if (offset.x < -width * 0.2 || velocity.x < -450) next = index + 1
    else if (offset.x > width * 0.2 || velocity.x > 450) next = index - 1
    goTo(next)
  }

  return (
    <div
      className="relative flex min-h-0 flex-1 flex-col"
      tabIndex={0}
      role="region"
      aria-roledescription="карусель"
      aria-label="Фотографии товара"
      onKeyDown={(e) => {
        if (e.key === 'ArrowRight') goTo(index + 1)
        if (e.key === 'ArrowLeft') goTo(index - 1)
      }}
    >
      <div ref={viewport} className="relative min-h-0 flex-1 overflow-hidden rounded-[32px] shadow-[0_18px_40px_-18px_rgb(92_58_26/0.4)]">
        <motion.div
          className="absolute inset-y-0 left-0 flex cursor-grab touch-pan-y active:cursor-grabbing"
          style={{ x, gap: GAP }}
          drag="x"
          dragConstraints={{ left: -last * step, right: 0 }}
          dragElastic={0.14}
          dragMomentum={false}
          onDragEnd={onDragEnd}
        >
          {slides.map((s, i) => (
            <Slide key={s.id} slide={s} i={i} x={x} step={step} width={width} color={color} />
          ))}
        </motion.div>

        {/* top overlay: mode badge + counter */}
        <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between p-4">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span
              key={badge}
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={spring.snappy}
              className="rounded-full bg-white/90 px-4 py-2 text-[15px] font-semibold text-ink shadow-sm backdrop-blur"
            >
              {badge}
            </motion.span>
          </AnimatePresence>
          <span className="rounded-full bg-ink/70 px-3.5 py-2 text-[15px] font-semibold tabular-nums text-white backdrop-blur">
            {index + 1} / {slides.length}
          </span>
        </div>

        {/* bottom overlay: caption */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-[#2e2420]/50 to-transparent" />
        <div className="pointer-events-none absolute bottom-4 left-5">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span
              key={slides[index].caption}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={spring.snappy}
              className="block text-[20px] font-bold text-white drop-shadow"
            >
              {slides[index].caption}
            </motion.span>
          </AnimatePresence>
        </div>

        {/* side arrows */}
        <ArrowButton dir={-1} disabled={index === 0} onClick={() => goTo(index - 1)} />
        <ArrowButton dir={1} disabled={index === last} onClick={() => goTo(index + 1)} />
      </div>

      {/* dots */}
      <div className="flex shrink-0 justify-center pt-2">
        {slides.map((s, i) => (
          <button key={s.id} onClick={() => goTo(i)} aria-label={`Фото ${i + 1}: ${s.caption}`} className="grid h-8 w-8 place-items-center">
            <motion.span
              animate={{ width: i === index ? 26 : 9, backgroundColor: i === index ? '#2e2420' : '#d9cdbf' }}
              transition={spring.snappy}
              className="block h-[9px] rounded-full"
            />
          </button>
        ))}
      </div>
    </div>
  )
}

/** One slide; neighbours shrink and dim slightly while dragging (depth). */
function Slide({ slide, i, x, step, width, color }) {
  const progress = useTransform(x, (v) => (step ? Math.min(1, Math.abs(v + i * step) / step) : 0))
  const scale = useTransform(progress, [0, 1], [1, 0.92])
  const dim = useTransform(progress, [0, 1], [0, 0.25])

  return (
    <motion.div className="relative h-full shrink-0 overflow-hidden rounded-[32px]" style={{ width, scale }}>
      <Photo src={slide.src} alt={slide.caption} view={slide.view} color={color} eager={i === 0} />
      <motion.div className="pointer-events-none absolute inset-0 bg-black" style={{ opacity: dim }} />
    </motion.div>
  )
}

function ArrowButton({ dir, disabled, onClick }) {
  return (
    <AnimatePresence>
      {!disabled && (
        <motion.button
          type="button"
          onClick={onClick}
          aria-label={dir < 0 ? 'Предыдущее фото' : 'Следующее фото'}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          whileTap={{ scale: 0.88 }}
          transition={spring.bouncy}
          className={`absolute top-1/2 grid size-12 -translate-y-1/2 place-items-center rounded-full bg-white/85 text-ink shadow-md backdrop-blur ${
            dir < 0 ? 'left-3' : 'right-3'
          }`}
        >
          <svg viewBox="0 0 24 24" className="size-6" aria-hidden>
            <path
              d={dir < 0 ? 'M15 5 L8 12 L15 19' : 'M9 5 L16 12 L9 19'}
              fill="none"
              stroke="currentColor"
              strokeWidth="2.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </motion.button>
      )}
    </AnimatePresence>
  )
}
