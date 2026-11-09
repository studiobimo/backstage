export const THEME = {
  preferences: ['light', 'dark', 'system'],
  storageKey: 'theme'
} as const

export type ThemePreference = (typeof THEME.preferences)[number]

const systemDark = () => window.matchMedia('(prefers-color-scheme: dark)')
const listeners = new Set<() => void>()

function isStoredPreference(value: string | null): value is 'light' | 'dark' {
  return value === 'light' || value === 'dark'
}

export function getThemePreference(): ThemePreference {
  const saved = localStorage.getItem(THEME.storageKey)
  return isStoredPreference(saved) ? saved : 'system'
}

function resolvedThemeIsDark() {
  const preference = getThemePreference()
  return preference === 'system' ? systemDark().matches : preference === 'dark'
}

function applyTheme() {
  document.documentElement.classList.toggle('dark', resolvedThemeIsDark())
  listeners.forEach((listener) => listener())
}

export function setThemePreference(preference: ThemePreference) {
  if (preference === 'system') localStorage.removeItem(THEME.storageKey)
  else localStorage.setItem(THEME.storageKey, preference)
  applyTheme()
}

export function subscribeToTheme(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function startTheme() {
  applyTheme()
  systemDark().addEventListener('change', applyTheme)
}
