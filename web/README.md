# Мичурин — scroll-driven 3D landing

Vite + React + @react-three/fiber + GSAP ScrollTrigger + Lenis + Tailwind.

```bash
cd web
npm install
npm run dev      # http://localhost:5173
npm run build    # static build in web/dist
```

## Structure

- `src/config.js` — palette, tower dimensions, scene state, room copy
- `src/timeline.js` — the single master GSAP timeline (time unit = 1 vh of scroll)
- `src/three/Tower.jsx` — procedural tower modelled on the real facade (instanced glazing)
- `src/three/FloorPlan.jsx` — clay floor plan of level 18 with the featured flat
- `src/three/Surroundings.jsx` — low-rise context, trees, sports court, city ring
- `src/three/Scene.jsx` — sky dome, lights, environment, damped camera rig, mouse parallax
- `src/ui/Overlays.jsx` — DOM overlays (hero, floor counter, tour cards, contact form)

## Scroll choreography (vh of scroll)

| vh | what happens |
|---|---|
| 0–100 | hero → camera dives to the foot of the facade |
| 100–330 | camera rises along the tower, floor counter 01 → 25, three facade zones |
| 340–600 | full 360° orbit, pull back, "views" chapter |
| 600–700 | tower is sliced down to floor 18, clay plan grows, sky → paper |
| 700–1100 | zoom into flat 18.4, room-by-room tour |
| 1100–1200 | pull out, the tower rebuilds itself at dusk, contact form |
