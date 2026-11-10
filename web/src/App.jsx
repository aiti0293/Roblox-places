import { Suspense, useCallback, useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { Canvas } from '@react-three/fiber'
import Lenis from 'lenis'
import Scene from './three/Scene'
import { buildTimeline, attachScroll, gsap, ScrollTrigger } from './timeline'
import { sceneState, floorAt, SCROLL_VH } from './config'
import { DemoBadge, Header, Hero, CatalogButton, FloorMarker, Zones, Views, PlanIntro, Tour, Contact } from './ui/Overlays'

function detect() {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const small = window.matchMedia('(max-width: 767px)').matches
  const weak = (navigator.hardwareConcurrency || 8) <= 4
  let webgl = false
  try {
    const c = document.createElement('canvas')
    webgl = !!(c.getContext('webgl2') || c.getContext('webgl'))
  } catch {
    webgl = false
  }
  return { reducedMotion, lite: small || weak || reducedMotion, webgl }
}

export default function App() {
  const env = useMemo(detect, [])
  const track = useRef()
  const floorRef = useRef()
  const dotsRef = useRef()
  const lenisRef = useRef()

  // Smooth inertial scroll, driven by the GSAP ticker so ScrollTrigger and Lenis share one clock.
  useEffect(() => {
    if (env.reducedMotion) return undefined
    const lenis = new Lenis({ lerp: 0.075, wheelMultiplier: 0.85, touchMultiplier: 1.4 })
    lenisRef.current = lenis
    lenis.on('scroll', ScrollTrigger.update)
    const raf = (time) => lenis.raf(time * 1000)
    gsap.ticker.add(raf)
    gsap.ticker.lagSmoothing(0)
    return () => {
      gsap.ticker.remove(raf)
      lenis.destroy()
    }
  }, [env.reducedMotion])

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const tl = buildTimeline(env)
      attachScroll(tl, track.current)

      if (!env.reducedMotion) {
        gsap.to(sceneState, { intro: 0, duration: 2.8, ease: 'expo.out', delay: 0.2 })
        gsap.from('[data-ov="hero"] [data-r]', {
          yPercent: 60, autoAlpha: 0, duration: 1.4, ease: 'expo.out', stagger: 0.08, delay: 0.35,
        })
        gsap.from('[data-ov="hero-card"], [data-ov="hero-stats"]', {
          autoAlpha: 0, duration: 1.2, ease: 'power2.out', delay: 0.9,
        })
      } else {
        sceneState.intro = 0
      }
    })

    // floor counter + tour dots read straight from the scene state
    let lastFloor = -1
    let lastRoom = -2
    const tick = () => {
      const floor = floorAt(sceneState.camY)
      if (floor !== lastFloor && floorRef.current) {
        floorRef.current.textContent = String(floor).padStart(2, '0')
        lastFloor = floor
      }
      const room = Math.round(sceneState.room)
      if (room !== lastRoom && dotsRef.current) {
        ;[...dotsRef.current.children].forEach((d, i) => {
          d.style.width = i === room ? '22px' : '6px'
          d.style.backgroundColor = i === room ? '#26372D' : ''
        })
        lastRoom = room
      }
    }
    gsap.ticker.add(tick)
    return () => {
      gsap.ticker.remove(tick)
      ctx.revert()
    }
  }, [env])

  const onNav = useCallback((vh) => {
    const y = (vh / 100) * window.innerHeight
    if (lenisRef.current) lenisRef.current.scrollTo(y, { duration: 2.4, easing: (t) => 1 - Math.pow(1 - t, 4) })
    else window.scrollTo({ top: y })
  }, [])

  return (
    <>
      <a href="#contact" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-sage focus:px-4 focus:py-2 focus:text-ink">
        Перейти к записи на просмотр
      </a>

      <div className="fixed inset-0 z-0" aria-hidden="true">
        {env.webgl ? (
          <Canvas
            shadows={!env.lite}
            dpr={env.lite ? [1, 1.5] : [1, 2]}
            gl={{ antialias: true, powerPreference: 'high-performance', alpha: false }}
            camera={{ fov: 30, near: 0.5, far: 4000, position: [60, 30, 90] }}
            onCreated={({ gl }) => {
              gl.localClippingEnabled = true
            }}
          >
            <Suspense fallback={null}>
              <Scene lite={env.lite} reducedMotion={env.reducedMotion} />
            </Suspense>
          </Canvas>
        ) : (
          <div className="h-full w-full bg-[linear-gradient(180deg,#26372D,#1B2820)]" />
        )}
      </div>

      <Header onNav={onNav} />
      <DemoBadge />
      <main>
        <Hero onNav={onNav} />
        <FloorMarker ref={floorRef} />
        <Zones />
        <Views />
        <PlanIntro />
        <Tour ref={dotsRef} />
        <Contact />
        <CatalogButton onNav={onNav} />
        {/* scroll track: its height defines the length of the whole choreography */}
        <div ref={track} style={{ height: `${SCROLL_VH}vh` }} aria-hidden="true" />
      </main>
      <noscript>Мичурин — жилой дом в Новосибирске. Для 3D-презентации включите JavaScript.</noscript>
    </>
  )
}
