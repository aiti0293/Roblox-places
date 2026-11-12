import { useEffect, useRef } from 'react'
import { motion, useSpring, useTransform } from 'framer-motion'
import { hapticTick } from '../lib/miniapp'
import { spring } from './springs'

const SWEEP = 270 // градусов дуги; снизу — зазор под кнопки «−/+»
const START = -SWEEP / 2

/**
 * Круглый регулятор («крутилка») как на эскизе: лучи-деления вокруг,
 * крупное число в центре. Крутится пальцем по кругу; для точной
 * подстройки — кнопки «−/+» в нижнем зазоре и стрелки клавиатуры.
 */
export function Dial({ label, unit, value, min, max, step = 1, onChange }) {
  const ref = useRef(null)
  const ticks = Math.round((max - min) / step)
  const angleOf = (v) => START + ((v - min) / (max - min)) * SWEEP

  // бегунок крутится на пружине — даже при резком касании движение мягкое
  const rot = useSpring(angleOf(value), { stiffness: 260, damping: 26 })
  useEffect(() => rot.set(angleOf(value)), [value]) // eslint-disable-line react-hooks/exhaustive-deps
  const thumbTransform = useTransform(rot, (a) => `rotate(${a} 100 100)`)

  const commit = (v) => {
    const next = Math.min(max, Math.max(min, Math.round(v / step) * step))
    if (next !== value) {
      onChange(next)
      hapticTick()
    }
  }

  const fromPointer = (e) => {
    const r = ref.current.getBoundingClientRect()
    const dx = e.clientX - (r.left + r.width / 2)
    const dy = e.clientY - (r.top + r.height / 2)
    let deg = (Math.atan2(dx, -dy) * 180) / Math.PI // 0° — вверх, по часовой
    deg = Math.max(START, Math.min(-START, deg))
    commit(min + ((deg - START) / SWEEP) * (max - min))
  }

  const onKey = (e) => {
    const d = { ArrowUp: step, ArrowRight: step, ArrowDown: -step, ArrowLeft: -step }[e.key]
    if (d) {
      e.preventDefault()
      commit(value + d)
    }
  }

  return (
    <div className="flex flex-col items-center">
      <div className="text-[17px] font-semibold text-ink">
        {label}, <span className="text-muted">{unit}</span>
      </div>

      <div className="relative mt-1 aspect-square w-full max-w-[176px]">
        <svg
          ref={ref}
          viewBox="0 0 200 200"
          className="size-full cursor-pointer touch-none select-none outline-none"
          role="slider"
          tabIndex={0}
          aria-label={label}
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={value}
          aria-valuetext={`${value} ${unit}`}
          onKeyDown={onKey}
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId)
            fromPointer(e)
          }}
          onPointerMove={(e) => e.buttons && fromPointer(e)}
        >
          {/* лучи-деления */}
          {Array.from({ length: ticks + 1 }, (_, i) => {
            const v = min + i * step
            const major = v % 5 === 0
            const a = ((angleOf(v) - 90) * Math.PI) / 180
            const r1 = major ? 80 : 84
            const r2 = 94
            const active = v <= value
            return (
              <line
                key={i}
                x1={100 + Math.cos(a) * r1}
                y1={100 + Math.sin(a) * r1}
                x2={100 + Math.cos(a) * r2}
                y2={100 + Math.sin(a) * r2}
                stroke={active ? 'var(--color-accent)' : '#e2d4ca'}
                strokeWidth={major ? 3 : 2}
                strokeLinecap="round"
                style={{ transition: 'stroke 0.25s ease' }}
              />
            )
          })}

          {/* «циферблат» */}
          <circle cx="100" cy="100" r="70" fill="#fff" style={{ filter: 'drop-shadow(0 6px 14px rgb(80 40 25 / 0.14))' }} />
          <circle cx="100" cy="100" r="56" fill="none" stroke="#efe5dd" strokeWidth="2" />

          {/* бегунок на ободе */}
          <motion.g transform={thumbTransform}>
            <circle cx="100" cy="36" r="9" fill="var(--color-accent)" stroke="#fff" strokeWidth="3" />
          </motion.g>
        </svg>

        {/* число по центру */}
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <motion.span
            key={value}
            initial={{ opacity: 0.5, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={spring.snappy}
            className="text-[34px] font-extrabold tabular-nums tracking-tight text-ink"
          >
            {value}
          </motion.span>
        </div>

        {/* «−/+» в нижнем зазоре шкалы */}
        <div className="absolute inset-x-0 bottom-0 flex justify-between px-[6%]">
          <StepButton label={`Уменьшить: ${label}`} onClick={() => commit(value - step)} disabled={value <= min}>
            −
          </StepButton>
          <StepButton label={`Увеличить: ${label}`} onClick={() => commit(value + step)} disabled={value >= max}>
            +
          </StepButton>
        </div>
      </div>
    </div>
  )
}

function StepButton({ children, label, ...props }) {
  return (
    <motion.button
      type="button"
      aria-label={label}
      whileTap={{ scale: 0.85 }}
      transition={spring.bouncy}
      className="grid size-10 place-items-center rounded-full bg-white text-[22px] font-semibold leading-none text-ink shadow-[0_2px_8px_rgb(80_40_25/0.12)] ring-1 ring-sand disabled:opacity-35"
      {...props}
    >
      {children}
    </motion.button>
  )
}
