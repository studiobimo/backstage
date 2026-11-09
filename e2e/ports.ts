export const E2E = {
  admin: { port: 8791 },
  site: { port: 8792 },
  stateDir: '.e2e-state'
} as const

export const adminUrl = `http://localhost:${E2E.admin.port}`
export const siteUrl = `http://localhost:${E2E.site.port}`
