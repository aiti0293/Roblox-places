import { Scene } from './three/Scene'
import { BodyPanel } from './ui/BodyPanel'
import { RotateHint } from './ui/RotateHint'

/**
 * Макет: 3D-сцена — верхние 60% экрана, интерфейс — нижние 40%.
 * Высота берётся из «стабильной» высоты окна мини-приложения,
 * чтобы раскладка не прыгала при сворачивании шапки мессенджера.
 */
export default function App() {
  return (
    <div
      className="relative mx-auto flex w-full max-w-[560px] flex-col overflow-hidden"
      style={{ height: 'var(--tg-viewport-stable-height, 100dvh)' }}
    >
      <div className="relative basis-[60%] shrink-0 bg-[radial-gradient(120%_90%_at_50%_30%,#fbf7f3_0%,#f1e6dd_60%,#e9dbd0_100%)]">
        <Scene />
        <RotateHint />
      </div>
      <BodyPanel />
    </div>
  )
}
