import { create } from 'zustand'

/** Параметры фигуры: рост (см) и вес (кг). Обхваты оцениваются в lib/body. */
export const useBodyStore = create((set) => ({
  height: 165,
  weight: 60,
  setValue: (key, value) => set({ [key]: value }),
}))
