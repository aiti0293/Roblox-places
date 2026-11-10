import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { CustomEase } from 'gsap/CustomEase'
import { sceneState as S, PLAN_Y, TOWER_H, TIMELINE_END, ROOMS } from './config'

gsap.registerPlugin(ScrollTrigger, CustomEase)

// Long-tail ease used for every camera move: quick departure, very soft landing.
CustomEase.create('glide', 'M0,0 C0.36,0 0.12,1 1,1')
CustomEase.create('settle', 'M0,0 C0.6,0 0.2,1 1,1')

const AZ0 = 0.62 + Math.PI * 2 // azimuth after the full orbit

/**
 * Builds the single master timeline. Time unit = viewport heights of scroll,
 * so a tween at position 350 starts when the page has scrolled 3.5 screens.
 */
export function buildTimeline({ reducedMotion }) {
  const tl = gsap.timeline({ paused: true, defaults: { ease: 'none' } })
  const lift = reducedMotion ? 0 : 28
  const textIn = (sel, at, dur = 22) =>
    tl.fromTo(sel, { autoAlpha: 0, y: lift }, { autoAlpha: 1, y: 0, duration: dur, ease: 'settle', stagger: dur * 0.12 }, at)
  const textOut = (sel, at, dur = 18) =>
    tl.to(sel, { autoAlpha: 0, y: -lift * 0.6, duration: dur, ease: 'power2.in' }, at)

  // ── 0–100 · Hero → foot of the facade ─────────────────────────────
  textOut('[data-ov="hero"] [data-r]', 4, 34)
  textOut('[data-ov="hero-card"], [data-ov="hero-stats"], [data-ov="hint"]', 0, 26)
  tl.to(S, { az: 0.62, r: 30, camY: 5, tgtX: 0, tgtY: 9, duration: 100, ease: 'glide' }, 0)

  // ── 100–330 · Rise along the tower, floor counter runs 01 → 25 ────
  textIn('[data-ov="floor"]', 92, 20)
  tl.to(S, { camY: 10, tgtY: 12, duration: 70, ease: 'sine.inOut' }, 100)
  tl.to(S, { camY: 81, tgtY: 80, duration: 160, ease: 'sine.inOut' }, 170)
  textIn('[data-ov="zone-0"] [data-r]', 108)
  textOut('[data-ov="zone-0"] [data-r]', 158)
  textIn('[data-ov="zone-1"] [data-r]', 182)
  textOut('[data-ov="zone-1"] [data-r]', 252)
  textIn('[data-ov="zone-2"] [data-r]', 272)
  textOut('[data-ov="zone-2"] [data-r]', 330)
  textOut('[data-ov="floor"]', 330, 16)

  // ── 340–600 · Full orbit, pull back to show the whole house ──────
  tl.to(S, { az: AZ0, duration: 250, ease: 'power2.inOut' }, 345)
  tl.to(S, { r: 150, camY: 34, tgtY: 40, tgtX: 0, duration: 130, ease: 'glide' }, 340)
  textIn('[data-ov="views"] [data-r]', 395, 26)
  textOut('[data-ov="views"] [data-r]', 545, 20)
  tl.to(S, { r: 62, camY: PLAN_Y + 26, tgtY: PLAN_Y, duration: 110, ease: 'power2.inOut' }, 490)

  // ── 600–700 · Slice the tower down to floor 18, clay plan grows ───
  tl.set(S, { planVis: 1 }, 598)
  tl.to(S, { clipHigh: PLAN_Y + 0.02, duration: 70, ease: 'power3.inOut' }, 600)
  tl.fromTo(S, { planGrow: 0 }, { planGrow: 1, duration: 60, ease: 'power2.out' }, 628)
  tl.to(S, { bgPaper: 1, duration: 55, ease: 'power1.inOut' }, 630)
  tl.to(S, { clipLow: PLAN_Y - 0.32, duration: 40, ease: 'power2.in' }, 650)
  tl.set(S, { towerVis: 0 }, 692)
  tl.to(S, { az: AZ0 + 0.55, r: 30, camY: PLAN_Y + 27, tgtY: PLAN_Y, duration: 100, ease: 'glide' }, 600)
  tl.to('[data-ov="header"]', { '--fg': '#101513', '--fg-soft': 'rgba(16,21,19,.55)', '--line': 'rgba(16,21,19,.16)', duration: 30 }, 640)
  textIn('[data-ov="plan"] [data-r]', 676)
  textOut('[data-ov="plan"] [data-r]', 760)

  // ── 700–800 · Rotate the floor, zoom into the featured flat ──────
  tl.to(S, { az: AZ0 + 0.95, r: 17, camY: PLAN_Y + 19, tgtX: 7.4, tgtZ: 5.6, duration: 85, ease: 'power2.inOut' }, 700)

  // ── 800–1100 · Room-by-room tour ─────────────────────────────────
  textIn('[data-ov="tour"]', 786, 18)
  ROOMS.forEach((room, i) => {
    const at = 800 + i * 75
    const [x, z] = room.center
    tl.to(S, {
      tgtX: x, tgtZ: z, r: 10.5, camY: PLAN_Y + 12.5, az: AZ0 + 0.95 + (i % 2 ? -0.35 : 0.25), room: i,
      duration: 48, ease: 'power2.inOut',
    }, at - (i === 0 ? 8 : 22))
    textIn(`[data-room="${i}"] [data-r]`, at - 4, 18)
    if (i < ROOMS.length - 1) textOut(`[data-room="${i}"] [data-r]`, at + 52, 14)
  })
  textOut('[data-ov="tour"]', 1090, 16)

  // ── 1100–1200 · Pull out, the house rebuilds itself at dusk ───────
  tl.to(S, { room: -1, duration: 20 }, 1095)
  tl.to(S, { az: AZ0 - 0.18, r: 175, camY: 24, tgtX: -34, tgtY: 40, tgtZ: 0, duration: 95, ease: 'glide' }, 1100)
  tl.to(S, { bgPaper: 0, bgGreen: 1, duration: 50, ease: 'power1.inOut' }, 1104)
  tl.set(S, { towerVis: 1, clipLow: -10 }, 1118)
  tl.fromTo(S, { clipHigh: PLAN_Y + 0.02 }, { clipHigh: TOWER_H + 8, duration: 50, ease: 'power2.inOut', immediateRender: false }, 1120)
  tl.to(S, { planGrow: 0, duration: 30, ease: 'power2.in' }, 1112)
  tl.set(S, { planVis: 0 }, 1145)
  tl.to(S, { night: 1, duration: 60 }, 1120)
  tl.to('[data-ov="header"]', { '--fg': '#F3F1EC', '--fg-soft': 'rgba(243,241,236,.6)', '--line': 'rgba(243,241,236,.2)', duration: 30 }, 1110)
  textIn('[data-ov="contact"] [data-r]', 1150, 30)

  tl.set({}, {}, TIMELINE_END)
  return tl
}

export function attachScroll(tl, track) {
  return ScrollTrigger.create({
    trigger: track,
    start: 'top top',
    end: 'bottom bottom',
    scrub: true,
    animation: tl,
  })
}

export { gsap, ScrollTrigger }
