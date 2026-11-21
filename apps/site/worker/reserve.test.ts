import { readFileSync } from 'node:fs'

import { TURNSTILE, viteAssets, type ViteManifest } from '@studiobimo/backstage/site'
import { afterAll, describe, expect, it } from 'vitest'

import { RESERVE, type Availability } from '../src/reserve/reserve'
import { directives, get, platform } from './test-support'

afterAll(() => platform.dispose())

const BUILT_MANIFEST = decodeURIComponent(
  new URL('../dist/client/.vite/manifest.json', import.meta.url).pathname
)

const builtAssets = () =>
  viteAssets(JSON.parse(readFileSync(BUILT_MANIFEST, 'utf8')) as ViteManifest, RESERVE.entry)

describe('the reserve client app', () => {
  it('renders in the shell with the hashed script, stylesheet and preloads', async () => {
    const { scripts, styles, preloads } = builtAssets()
    expect(styles.length).toBeGreaterThan(0)
    expect(preloads.length).toBeGreaterThan(0)
    const html = await (await get(RESERVE.path)).text()
    expect(html).toContain(`<div id="${RESERVE.mountId}"></div>`)
    for (const src of scripts) {
      expect(html).toContain(`<script type="module" src="${src}"></script>`)
    }
    for (const href of styles) {
      expect(html).toContain(`<link rel="stylesheet" href="${href}"/>`)
    }
    for (const href of preloads) {
      expect(html).toContain(`<link rel="modulepreload" href="${href}"/>`)
    }
  })

  it('keeps style-src at self and allows only same-origin scripts and fetches', async () => {
    const policy = directives(await get(RESERVE.path))
    expect(policy.get('style-src')).toEqual(["'self'"])
    expect(policy.get('script-src')).toEqual([
      ...RESERVE.contentSecurityPolicy.scriptSrc,
      TURNSTILE.origin
    ])
    expect(policy.get('connect-src')).toEqual(RESERVE.contentSecurityPolicy.connectSrc)
  })

  it('answers the availability fetch the island makes', async () => {
    const response = await get(RESERVE.availabilityPath)
    expect((await response.json()) as Availability).toEqual({ seats: RESERVE.seatsFree })
  })
})
