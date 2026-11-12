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
    app.disableVerticalSwipes?.() // swipes in the gallery must not close the app
    app.setHeaderColor?.('#f6f4f1')
    app.setBackgroundColor?.('#f6f4f1')
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
