import { useCallback, useState } from 'react'

export type ReportDirty = (sectionId: string, dirty: boolean) => void

export function useDirtySections() {
  const [dirtyIds, setDirtyIds] = useState<ReadonlySet<string>>(new Set())
  const report = useCallback<ReportDirty>(
    (sectionId, dirty) =>
      setDirtyIds((current) => {
        if (current.has(sectionId) === dirty) return current
        const next = new Set(current)
        if (dirty) next.add(sectionId)
        else next.delete(sectionId)
        return next
      }),
    []
  )
  return { dirty: dirtyIds.size > 0, report }
}

export function useSectionDirty(sectionId: string, report: ReportDirty) {
  return useCallback((dirty: boolean) => report(sectionId, dirty), [sectionId, report])
}
