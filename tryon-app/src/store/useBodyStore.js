import { create } from 'zustand'
import { estimateFromHeightWeight } from '../lib/body'

/**
 * mode: 'hw'  — рост и вес (проще для большинства покупательниц)
 *       'measure' — точные обхваты груди/талии/бёдер
 */
export const useBodyStore = create((set, get) => ({
  mode: 'hw',
  height: 166,
  weight: 68,
  bust: 94,
  waist: 76,
  hips: 102,

  setValue: (key, value) => set({ [key]: value }),

  setMode: (mode) => {
    const s = get()
    if (mode === s.mode) return
    // Переходя к обхватам, подставляем оценку по росту/весу —
    // манекен не «прыгает», а покупательнице остаётся лишь уточнить.
    if (mode === 'measure') {
      const est = estimateFromHeightWeight(s.height, s.weight)
      set({ mode, bust: est.bust, waist: est.waist, hips: est.hips })
    } else {
      set({ mode })
    }
  },
}))
