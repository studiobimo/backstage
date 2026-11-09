import { afterAll, beforeEach, describe, expect, it } from 'vitest'

import { clearKv, get, heroBlock, platform, publishSnapshots, snapshotOf } from './test-support'

afterAll(() => platform.dispose())
beforeEach(clearKv)

function directives(response: Response) {
  const policy = response.headers.get('Content-Security-Policy') ?? ''
  return new Map(
    policy
      .split(';')
      .map((directive) => directive.trim().split(/\s+/))
      .filter(([name]) => name)
      .map(([name, ...sources]) => [name, sources])
  )
}

const publishHome = () =>
  publishSnapshots(
    snapshotOf({
      locale: 'en',
      isHome: true,
      slug: null,
      title: 'Home',
      blocks: [heroBlock({ en: 'Hi' })]
    }),
    snapshotOf({
      locale: 'es',
      isHome: true,
      slug: null,
      title: 'Inicio',
      blocks: [heroBlock({ es: 'Hola' })]
    })
  )

describe('site worker', () => {
  it('sends a strict policy on a page and on a 404', async () => {
    await publishHome()
    for (const path of ['/', '/nothing-here']) {
      const policy = directives(await get(path))
      expect(policy.get('default-src')).toEqual(["'none'"])
      expect(policy.has('script-src')).toBe(false)
      expect(policy.get('base-uri')).toEqual(["'none'"])
      expect(policy.get('frame-ancestors')).toEqual(["'none'"])
      for (const sources of policy.values()) {
        expect(sources).not.toContain("'unsafe-inline'")
        expect(sources).not.toContain("'unsafe-eval'")
        expect(sources).not.toContain('*')
      }
    }
  })

  it('sends the other security headers', async () => {
    const { headers } = await get('/')
    expect(headers.get('X-Content-Type-Options')).toBe('nosniff')
    expect(headers.get('X-Frame-Options')).toBe('DENY')
    expect(headers.get('Referrer-Policy')).toBe('no-referrer')
    expect(headers.get('Strict-Transport-Security')).toMatch(/max-age=\d+/)
    expect(headers.get('Cross-Origin-Opener-Policy')).toBe('same-origin')
    expect(headers.get('Permissions-Policy')).toContain('camera=()')
  })

  it('answers /health', async () => {
    const response = await get('/health')
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ ok: true })
  })

  it('has no database binding and no admin secret', () => {
    expect(Object.keys(platform.env).sort()).toEqual(['MEDIA', 'SITE'])
  })
})
