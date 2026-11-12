import { create } from 'zustand'
import { CATALOG } from '../data/catalog'

/**
 * Что надето на манекен: по одной вещи в каждом слоте.
 * selectedId — последняя выбранная вещь (её показываем в «Выбранная одежда»).
 */
export const useLookStore = create((set, get) => ({
  worn: {}, // slot → id
  selectedId: null,

  toggle: (id) => {
    const item = CATALOG.find((i) => i.id === id)
    const worn = { ...get().worn }
    if (worn[item.slot] === id) {
      delete worn[item.slot]
      const rest = Object.values(worn)
      set({ worn, selectedId: rest.length ? rest[rest.length - 1] : null })
    } else {
      worn[item.slot] = id
      set({ worn, selectedId: id })
    }
  },
}))
