import { useState } from 'react'
import { motion } from 'framer-motion'
import { GarmentIcon } from './GarmentIcon'

/**
 * Photo with a soft fade-in. Until it loads — a warm shimmer; if it fails —
 * a styled placeholder (silhouette of the garment), never a broken icon.
 */
export function Photo({ src, alt, view, color, eager }) {
  const [state, setState] = useState('loading')

  return (
    <div className="absolute inset-0 overflow-hidden bg-[#efe6db]">
      {state !== 'error' && (
        <motion.img
          src={src}
          alt={alt}
          draggable={false}
          loading={eager ? 'eager' : 'lazy'}
          onLoad={() => setState('ready')}
          onError={() => setState('error')}
          initial={false}
          animate={{ opacity: state === 'ready' ? 1 : 0, scale: state === 'ready' ? 1 : 1.04 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="pointer-events-none size-full select-none object-cover"
        />
      )}

      {state === 'loading' && (
        <div className="absolute inset-0 animate-pulse bg-[linear-gradient(110deg,#efe6db_30%,#f8f2ea_50%,#efe6db_70%)]" />
      )}

      {state === 'error' && <Fallback view={view} color={color} />}
    </div>
  )
}

function Fallback({ view, color }) {
  if (view === 'detail') {
    // fabric close-up: woven texture in the garment colour
    return (
      <div
        className="absolute inset-0"
        style={{
          backgroundColor: color,
          backgroundImage:
            'repeating-linear-gradient(45deg, rgb(255 255 255 / 0.10) 0 2px, transparent 2px 7px), repeating-linear-gradient(-45deg, rgb(0 0 0 / 0.10) 0 2px, transparent 2px 7px), radial-gradient(120% 90% at 30% 20%, rgb(255 255 255 / 0.25), transparent 60%)',
        }}
      />
    )
  }
  return (
    <div className="absolute inset-0 grid place-items-center bg-[radial-gradient(90%_70%_at_50%_35%,#fbf7f1_0%,#eadfd1_100%)]">
      <GarmentIcon kind="jacket" color={color} className={`h-[62%] w-[62%] drop-shadow-xl ${view === 'back' ? '-scale-x-100 opacity-90' : ''}`} />
    </div>
  )
}
