import { create } from 'zustand'

/** Body parameters entered by the customer. */
export const useBodyStore = create((set) => ({
  weight: 60,
  height: 165,
  setValue: (key, value) => set({ [key]: value }),
}))
