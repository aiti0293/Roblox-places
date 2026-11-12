import { useCallback, useEffect, useRef } from 'react'

/**
 * Press-and-hold auto-repeat: first step on press, then repeats after a
 * pause and gradually speeds up — going from 60 to 85 kg takes a single hold.
 */
export function useHoldRepeat(action) {
  const timer = useRef(null)
  const actionRef = useRef(action)
  actionRef.current = action

  const stop = useCallback(() => {
    clearTimeout(timer.current)
    timer.current = null
  }, [])

  const start = useCallback(() => {
    stop()
    actionRef.current()
    let delay = 380
    const tick = () => {
      actionRef.current()
      delay = Math.max(55, delay * 0.82)
      timer.current = setTimeout(tick, delay)
    }
    timer.current = setTimeout(tick, delay)
  }, [stop])

  useEffect(() => stop, [stop])

  return {
    onPointerDown: (e) => {
      e.preventDefault()
      start()
    },
    onPointerUp: stop,
    onPointerLeave: stop,
    onPointerCancel: stop,
    onContextMenu: (e) => e.preventDefault(),
    // keyboard / screen readers: one step per activation
    onKeyDown: (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        actionRef.current()
      }
    },
  }
}
