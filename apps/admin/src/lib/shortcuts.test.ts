import { describe, expect, it } from 'vitest'

import { ariaKeyShortcuts, shortcutKeys, shouldHandleShortcut } from './shortcuts'

const press = (init: KeyboardEventInit, target?: Element) => {
  const event = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...init })
  if (target) Object.defineProperty(event, 'target', { value: target })
  return event
}

describe('shortcuts', () => {
  it('describes a modified shortcut for assistive technology', () => {
    expect(ariaKeyShortcuts('save')).toBe('Control+S Meta+S')
    expect(ariaKeyShortcuts('newPage')).toBe('N')
    expect(shortcutKeys('newPage')).toEqual(['N'])
  })

  it('handles Save with a modifier, even inside a text field', () => {
    const field = document.createElement('input')
    expect(shouldHandleShortcut(press({ key: 's', ctrlKey: true }, field), 'save')).toBe(true)
    expect(shouldHandleShortcut(press({ key: 's' }), 'save')).toBe(false)
    expect(shouldHandleShortcut(press({ key: 's', ctrlKey: true, shiftKey: true }), 'save')).toBe(
      false
    )
  })

  it('skips a bare shortcut while typing or while a dialog is open', () => {
    const field = document.createElement('textarea')
    const editor = document.createElement('div')
    editor.setAttribute('contenteditable', 'true')
    expect(shouldHandleShortcut(press({ key: 'n' }), 'newPage')).toBe(true)
    expect(shouldHandleShortcut(press({ key: 'n' }, field), 'newPage')).toBe(false)
    expect(shouldHandleShortcut(press({ key: 'n' }, editor), 'newPage')).toBe(false)
    expect(shouldHandleShortcut(press({ key: 'n', metaKey: true }), 'newPage')).toBe(false)
    document.body.insertAdjacentHTML('beforeend', '<div role="dialog" id="d"></div>')
    expect(shouldHandleShortcut(press({ key: 'n' }), 'newPage')).toBe(false)
    document.getElementById('d')?.remove()
  })
})
