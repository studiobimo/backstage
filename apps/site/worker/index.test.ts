import { afterAll, describe, expect, it } from 'vitest'
import { getPlatformProxy } from 'wrangler'

import app from './index'

// wrangler.jsonc's bindings and .dev.vars, run locally as vite dev runs them.
const platform = await getPlatformProxy<Env>()
afterAll(() => platform.dispose())

const get = (path: string) => app.request(path, {}, platform.env)

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

describe('site worker', () => {
  it('serves the placeholder page', async () => {
    const response = await get('/')
    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Type')).toMatch(/^text\/html/)
    expect(await response.text()).toContain('<h1>Backstage</h1>')
  })

  it('has no inline script or style for the policy to allow', async () => {
    const page = await (await get('/')).text()
    expect(page).not.toMatch(/<script|<style|\sstyle=|\son[a-z]+=/i)
  })

  it.each(['/', '/nothing-here'])('sends a strict policy on %s', async (path) => {
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

  it('answers an unknown path with a 404', async () => {
    const response = await get('/nothing-here')
    expect(response.status).toBe(404)
  })
})
