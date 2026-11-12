import { republishScopeSchema, type RepublishScope } from '@studiobimo/backstage'

const STORED_RUN_KEY = 'backstage:republish-run'

export const NEW_RUN: RepublishScope = { since: null, cursor: null }

export const readStoredRun = (): RepublishScope => {
  try {
    const parsed = republishScopeSchema.safeParse(
      JSON.parse(localStorage.getItem(STORED_RUN_KEY) ?? 'null')
    )
    return parsed.success && parsed.data.since !== null ? parsed.data : NEW_RUN
  } catch {
    return NEW_RUN
  }
}

export const storeRun = (scope: RepublishScope) => {
  try {
    if (scope.since === null) localStorage.removeItem(STORED_RUN_KEY)
    else localStorage.setItem(STORED_RUN_KEY, JSON.stringify(scope))
  } catch {
    return
  }
}
