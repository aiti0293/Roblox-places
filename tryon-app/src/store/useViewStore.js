import { create } from 'zustand'

/** Угол поворота манекена (радианы); сцена плавно догоняет его. */
export const useViewStore = create((set) => ({
  angle: 0,
  rotateBy: (d) => set((s) => ({ angle: s.angle + d })),
  // «Анфас»: ближайший к текущему полный оборот, чтобы не крутить лишнего
  reset: () => set((s) => ({ angle: Math.round(s.angle / (Math.PI * 2)) * Math.PI * 2 })),
}))
