/**
 * Плоские силуэты вещей для карточек (пока нет фото товаров).
 * Цвет — из каталога, лёгкий градиент и строчки придают «тканевость».
 */
const PATHS = {
  jacket: {
    body: 'M38 14 L50 10 L60 22 L70 10 L82 14 L98 24 L106 74 L94 78 L90 50 L90 104 L30 104 L30 50 L26 78 L14 74 L22 24 Z',
    lines: 'M60 22 L60 104 M50 10 L56 46 L60 22 M70 10 L64 46 L60 22 M44 74 L54 74 M66 74 L76 74',
  },
  turtleneck: {
    body: 'M48 6 L72 6 L72 16 L84 18 L100 28 L108 80 L96 82 L90 46 L90 104 L30 104 L30 46 L24 82 L12 80 L20 28 L36 18 L48 16 Z',
    lines: 'M48 10 L72 10 M48 14 L72 14 M32 98 L88 98',
  },
  trousers: {
    body: 'M34 8 L86 8 L90 112 L68 112 L60 40 L52 112 L30 112 Z',
    lines: 'M34 16 L86 16 M45 22 L41 108 M75 22 L79 108',
  },
}

export function GarmentIcon({ kind, color, className }) {
  const p = PATHS[kind]
  const id = `g-${kind}`
  return (
    <svg viewBox="0 0 120 120" className={className} aria-hidden>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.28" />
          <stop offset="1" stopColor="#000" stopOpacity="0.18" />
        </linearGradient>
      </defs>
      <path d={p.body} fill={color} />
      <path d={p.body} fill={`url(#${id})`} />
      <path d={p.lines} fill="none" stroke="#000" strokeOpacity="0.22" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
