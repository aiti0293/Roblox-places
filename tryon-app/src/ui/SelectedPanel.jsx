import { AnimatePresence, motion } from 'framer-motion'
import { CATALOG, formatPrice } from '../data/catalog'
import { useLookStore } from '../store/useLookStore'
import { useBodyStore } from '../store/useBodyStore'
import { resolveBody, sizeFor } from '../lib/body'
import { spring } from './springs'

/** Левый верхний блок: «Выбранная одежда» + описание и ваш размер. */
export function SelectedPanel() {
  const selectedId = useLookStore((s) => s.selectedId)
  const item = CATALOG.find((i) => i.id === selectedId)
  const body = useBodyStore()
  const size = sizeFor(resolveBody(body))

  return (
    <div className="flex min-h-0 flex-col">
      <h1 className="text-[26px] font-extrabold leading-[1.1] tracking-tight text-ink">
        Выбранная
        <br />
        одежда
      </h1>

      <div className="relative mt-3 min-h-[104px]">
        <AnimatePresence mode="popLayout" initial={false}>
          {item ? (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={spring.soft}
            >
              <div className="text-[18px] font-bold leading-snug text-ink">{item.name}</div>
              <div className="mt-0.5 text-[14px] leading-snug text-muted">{item.note}</div>
              <div className="mt-2 text-[20px] font-extrabold tabular-nums text-ink">{formatPrice(item.price)}</div>
            </motion.div>
          ) : (
            <motion.p
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={spring.soft}
              className="text-[16px] leading-snug text-muted"
            >
              Нажмите на вещь ниже — она сразу появится на манекене
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      <div className="mt-2 inline-flex items-center gap-2 self-start rounded-2xl bg-accent-soft px-3 py-1.5" aria-live="polite">
        <span className="text-[14px] font-medium text-muted">Ваш размер</span>
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={size.ru}
            initial={{ y: 12, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -12, opacity: 0 }}
            transition={spring.snappy}
            className="text-[18px] font-extrabold tabular-nums text-accent"
          >
            {size.ru} · {size.intl}
          </motion.span>
        </AnimatePresence>
      </div>
    </div>
  )
}
