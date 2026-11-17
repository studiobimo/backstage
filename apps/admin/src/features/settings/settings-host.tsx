import { createContext, useCallback, useContext, useRef, useState } from 'react'

export const SAVE_OUTCOME = { saved: 'saved', failed: 'failed', skipped: 'skipped' } as const

export type SaveOutcome = (typeof SAVE_OUTCOME)[keyof typeof SAVE_OUTCOME]

export interface SectionHandle {
  title: string
  save: () => Promise<SaveOutcome>
}

export interface SectionReport {
  dirty: boolean
  missing: Record<string, number>
}

export interface SettingsHost {
  report: (sectionId: string, report: SectionReport | undefined) => void
  register: (sectionId: string, handle: SectionHandle) => void
  showLocale: (locale: string) => void
}

const NO_HOST: SettingsHost = { report: () => {}, register: () => {}, showLocale: () => {} }

export const SettingsHostContext = createContext<SettingsHost>(NO_HOST)

export const useSettingsHost = () => useContext(SettingsHostContext)

const missingByLocale = (reports: Record<string, SectionReport>, locales: readonly string[]) =>
  Object.fromEntries(
    locales.map((locale) => [
      locale,
      {
        missing: Object.values(reports).reduce(
          (sum, { missing }) => sum + (missing[locale] ?? 0),
          0
        ),
        invalid: 0
      }
    ])
  )

export function useSettingsSections(
  locales: readonly string[],
  showLocale: (locale: string) => void
) {
  const [reports, setReports] = useState<Record<string, SectionReport>>({})
  const [saving, setSaving] = useState(false)
  const [notSaved, setNotSaved] = useState<string[]>([])
  const handles = useRef(new Map<string, SectionHandle>())

  const report = useCallback((sectionId: string, next: SectionReport | undefined) => {
    setReports((current) => {
      if (next === undefined) {
        if (!(sectionId in current)) return current
        return Object.fromEntries(Object.entries(current).filter(([id]) => id !== sectionId))
      }
      const previous = current[sectionId]
      const unchanged =
        previous?.dirty === next.dirty &&
        JSON.stringify(previous.missing) === JSON.stringify(next.missing)
      return unchanged ? current : { ...current, [sectionId]: next }
    })
  }, [])

  const register = useCallback((sectionId: string, handle: SectionHandle) => {
    handles.current.set(sectionId, handle)
  }, [])

  const host: SettingsHost = { report, register, showLocale }
  const dirtyIds = Object.keys(reports).filter((id) => reports[id]!.dirty)

  async function saveAll(): Promise<SaveOutcome[]> {
    setSaving(true)
    setNotSaved([])
    const failed: string[] = []
    const outcomes: SaveOutcome[] = []
    for (const id of dirtyIds) {
      const handle = handles.current.get(id)
      if (!handle) continue
      const outcome = await handle.save()
      outcomes.push(outcome)
      if (outcome === SAVE_OUTCOME.failed) failed.push(handle.title)
    }
    setNotSaved(failed)
    setSaving(false)
    return outcomes
  }

  return {
    host,
    dirty: dirtyIds.length > 0,
    saving,
    notSaved,
    gaps: missingByLocale(reports, locales),
    saveAll
  }
}
