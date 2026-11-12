import { AnimatePresence, motion } from 'framer-motion'
import { CATALOG, formatPrice } from '../data/catalog'
import { useLookStore } from '../store/useLookStore'
import { GarmentIcon } from './GarmentIcon'
import { spring } from './springs'

/** Горизонтальная лента карточек. Нажатие — надеть, повторное — снять. */
export function ClothesCarousel() {
  const worn = useLookStore((s) => s.worn)
  const toggle = useLookStore((s) => s.toggle)

  return (
    <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 pt-1 [scrollbar-width:none]">
      {CATALOG.map((item, i) => {
        const on = worn[item.slot] === item.id
        return (
          <motion.button
            key={item.id}
            type="button"
            onClick={() => toggle(item.id)}
            aria-pressed={on}
            aria-label={`${item.name}, ${formatPrice(item.price)}${on ? ', надето' : ''}`}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...spring.soft, delay: 0.1 + i * 0.06 }}
            whileTap={{ scale: 0.95 }}
            className={`relative w-[112px] shrink-0 snap-start rounded-2xl bg-white p-2 text-left shadow-[0_4px_16px_rgb(80_40_25/0.08)] ring-2 transition-[box-shadow] ${
              on ? 'ring-accent' : 'ring-transparent'
            }`}
          >
            <div className="grid aspect-square place-items-center rounded-xl bg-cream">
              <GarmentIcon kind={item.kind} color={item.color} className="h-[78%] w-[78%]" />
            </div>
            <div className="mt-1.5 line-clamp-2 text-[13px] font-semibold leading-tight text-ink">{item.name}</div>
            <div className="mt-0.5 text-[14px] font-bold tabular-nums text-ink">{formatPrice(item.price)}</div>

            <AnimatePresence>
              {on && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  transition={spring.bouncy}
                  className="absolute right-1.5 top-1.5 grid size-7 place-items-center rounded-full bg-accent text-[15px] font-bold text-white shadow"
                  aria-hidden
                >
                  ✓
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>
        )
      })}
    </div>
  )
}
