import { useEffect } from 'react'

const SAVE_KEY = 's'

const isApplePlatform = () => /Mac|iPhone|iPad/.test(navigator.userAgent)

export const saveShortcutKeys = () => [isApplePlatform() ? '⌘' : 'Ctrl', SAVE_KEY.toUpperCase()]

export function useSaveShortcut(enabled: boolean, onSave: () => void) {
  useEffect(() => {
    if (!enabled) return
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === SAVE_KEY) {
        event.preventDefault()
        onSave()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [enabled, onSave])
}
