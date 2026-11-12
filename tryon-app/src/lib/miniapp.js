/**
 * Тонкая обёртка над мостами мини-приложений.
 * Telegram: window.Telegram.WebApp. MAX: window.WebApp (совместимый API).
 * Вне мессенджера (обычный браузер) всё молча игнорируется.
 */
export function getBridge() {
  return window.Telegram?.WebApp ?? window.WebApp ?? null
}

export function initMiniApp() {
  const app = getBridge()
  if (!app) return
  try {
    app.ready?.()
    app.expand?.()
    app.disableVerticalSwipes?.() // чтобы вращение манекена не сворачивало окно
    app.setHeaderColor?.('#f6efe9')
    app.setBackgroundColor?.('#f6efe9')
  } catch {
    /* старые клиенты не поддерживают часть методов */
  }
}

/** Лёгкая тактильная отдача на шаге слайдера (если клиент умеет). */
export function hapticTick() {
  try {
    getBridge()?.HapticFeedback?.selectionChanged?.()
  } catch {
    /* noop */
  }
}
