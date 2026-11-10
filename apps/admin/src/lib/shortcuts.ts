import { useEffect } from 'react'

const SHORTCUT = {
  save: { key: 's', withModifier: true, worksInFields: true },
  newPage: { key: 'n', withModifier: false, worksInFields: false },
  palette: { key: 'k', withModifier: true, worksInFields: true },
  toggleSidebar: { key: 'b', withModifier: true, worksInFields: true }
} as const

export type ShortcutId = keyof typeof SHORTCUT
type ShortcutDefinition = (typeof SHORTCUT)[ShortcutId]

const EDITABLE_SELECTOR = 'input, textarea, select, [contenteditable=""], [contenteditable="true"]'
const OPEN_DIALOG_SELECTOR = '[role="dialog"], [role="alertdialog"]'

const isApplePlatform = () => /Mac|iPhone|iPad/.test(navigator.userAgent)

export const shortcutKeys = (id: ShortcutId): string[] => {
  const { key, withModifier } = SHORTCUT[id]
  const letter = key.toUpperCase()
  if (!withModifier) return [letter]
  return [isApplePlatform() ? '⌘' : 'Ctrl', letter]
}

export const ariaKeyShortcuts = (id: ShortcutId): string => {
  const { key, withModifier } = SHORTCUT[id]
  return withModifier ? `Control+${key.toUpperCase()} Meta+${key.toUpperCase()}` : key.toUpperCase()
}

const isEditing = (target: EventTarget | null) =>
  target instanceof Element && target.closest(EDITABLE_SELECTOR) !== null

const hasOpenDialog = () => document.querySelector(OPEN_DIALOG_SELECTOR) !== null

const hasOtherModifier = (event: KeyboardEvent) => event.altKey || event.shiftKey

const matchesKey = (event: KeyboardEvent, { key, withModifier }: ShortcutDefinition) => {
  if (event.key.toLowerCase() !== key || hasOtherModifier(event)) return false
  const modified = event.metaKey || event.ctrlKey
  return withModifier ? modified : !modified
}

export const shouldHandleShortcut = (event: KeyboardEvent, id: ShortcutId) => {
  const definition = SHORTCUT[id]
  if (event.defaultPrevented || event.repeat || !matchesKey(event, definition)) return false
  if (definition.worksInFields) return true
  return !isEditing(event.target) && !hasOpenDialog()
}

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
