import { describe, expect, it } from 'vitest'

import headersFile from '../public/_headers?raw'

function headersFor(path: string) {
  const lines = headersFile.split('\n').filter((line) => line.trim() && !line.startsWith('#'))
  const start = lines.indexOf(path) + 1
  if (start === 0) return new Map<string, string>()
  const end = lines.findIndex((line, index) => index >= start && !/^\s/.test(line))
  return new Map(
    lines.slice(start, end === -1 ? undefined : end).map((line) => {
      const [name, ...value] = line.trim().split(':')
      return [name.toLowerCase(), value.join(':').trim()]
    })
  )
}

const headers = headersFor('/*')
const policy = new Map(
  (headers.get('content-security-policy') ?? '')
    .split(';')
    .map((directive) => directive.trim().split(/\s+/))
    .map(([name, ...sources]) => [name, sources])
)

describe('the admin SPA headers', () => {
  it('cover every path', () => {
    expect(headers.size).toBeGreaterThan(0)
  })

  it('start from a policy that allows nothing', () => {
    expect(policy.get('default-src')).toEqual(["'none'"])
    expect(policy.get('base-uri')).toEqual(["'none'"])
    expect(policy.get('frame-ancestors')).toEqual(["'none'"])
  })

  it('allow scripts, styles and requests only from the admin itself', () => {
    for (const directive of ['script-src', 'style-src', 'connect-src']) {
      expect(policy.get(directive)).toEqual(["'self'"])
    }
  })

  it('never allow inline code, eval or any origin', () => {
    for (const sources of policy.values()) {
      expect(sources).not.toContain("'unsafe-inline'")
      expect(sources).not.toContain("'unsafe-eval'")
      expect(sources).not.toContain('*')
    }
  })

  it('send the other security headers', () => {
    expect(headers.get('x-content-type-options')).toBe('nosniff')
    expect(headers.get('x-frame-options')).toBe('DENY')
    expect(headers.get('referrer-policy')).toBe('no-referrer')
    expect(headers.get('strict-transport-security')).toMatch(/max-age=\d+/)
    expect(headers.get('cross-origin-opener-policy')).toBe('same-origin')
  })
})
