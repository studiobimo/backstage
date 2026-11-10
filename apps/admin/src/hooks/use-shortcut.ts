import { useEffect } from 'react'

import { type ShortcutId, shouldHandleShortcut } from '@/lib/shortcuts'

export function useShortcut(id: ShortcutId, enabled: boolean, onTrigger: () => void) {
  useEffect(() => {
    if (!enabled) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (!shouldHandleShortcut(event, id)) return
      event.preventDefault()
      onTrigger()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [id, enabled, onTrigger])
}
