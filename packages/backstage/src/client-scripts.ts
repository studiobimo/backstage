const CLIENT_SCRIPT = {
  prefix: '/',
  protocolRelativePrefix: '//',
  invalidMessage: (owner: string, script: string) =>
    `${owner} must be a same-origin path such as /app.js, got "${script}"`
} as const

const isSameOriginPath = (script: string) =>
  script.startsWith(CLIENT_SCRIPT.prefix) &&
  !script.startsWith(CLIENT_SCRIPT.protocolRelativePrefix)

export function assertSameOriginPaths(owner: string, scripts: readonly string[]) {
  const invalid = scripts.find((script) => !isSameOriginPath(script))
  if (invalid !== undefined) throw new Error(CLIENT_SCRIPT.invalidMessage(owner, invalid))
}

export const uniquePaths = (paths: readonly string[]) => [...new Set(paths)]

export interface ClientAssets {
  scripts?: readonly string[]
  styles?: readonly string[]
  preloads?: readonly string[]
}

export function assertSameOriginAssets(owner: string, { scripts, styles, preloads }: ClientAssets) {
  assertSameOriginPaths(`${owner} scripts`, scripts ?? [])
  assertSameOriginPaths(`${owner} styles`, styles ?? [])
  assertSameOriginPaths(`${owner} preloads`, preloads ?? [])
}
