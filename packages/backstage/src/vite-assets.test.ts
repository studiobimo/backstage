import { describe, expect, it } from 'vitest'

import { viteAssets, VITE_ASSETS, type ViteManifest } from './vite-assets.ts'

const ENTRY = 'src/reserve/main.tsx'
const OTHER_ENTRY = 'src/other.tsx'

const MANIFEST: ViteManifest = {
  [ENTRY]: {
    file: 'assets/main-AAA111.js',
    css: ['assets/main-AAA111.css'],
    imports: ['_vendor-BBB222.js', '_ui-CCC333.js']
  },
  '_vendor-BBB222.js': { file: 'assets/vendor-BBB222.js' },
  '_ui-CCC333.js': {
    file: 'assets/ui-CCC333.js',
    css: ['assets/ui-CCC333.css', 'assets/main-AAA111.css'],
    imports: ['_vendor-BBB222.js', '_leaf-DDD444.js']
  },
  '_leaf-DDD444.js': { file: 'assets/leaf-DDD444.js', css: ['assets/leaf-DDD444.css'] },
  [OTHER_ENTRY]: { file: 'assets/other-EEE555.js', css: ['assets/other-EEE555.css'] }
}

describe('viteAssets', () => {
  it('lists the entry script, every stylesheet and every imported chunk once', () => {
    expect(viteAssets(MANIFEST, ENTRY)).toEqual({
      scripts: ['/assets/main-AAA111.js'],
      styles: ['/assets/main-AAA111.css', '/assets/ui-CCC333.css', '/assets/leaf-DDD444.css'],
      preloads: ['/assets/vendor-BBB222.js', '/assets/ui-CCC333.js', '/assets/leaf-DDD444.js']
    })
  })

  it('leaves out other entries', () => {
    const { scripts, styles, preloads } = viteAssets(MANIFEST, ENTRY)
    expect([...scripts, ...styles, ...preloads].join()).not.toContain('other')
  })

  it('prefixes a base path', () => {
    expect(viteAssets(MANIFEST, OTHER_ENTRY, { base: '/app/' })).toEqual({
      scripts: ['/app/assets/other-EEE555.js'],
      styles: ['/app/assets/other-EEE555.css'],
      preloads: []
    })
  })

  it('survives an import cycle', () => {
    const cyclic: ViteManifest = {
      a: { file: 'a.js', imports: ['b'] },
      b: { file: 'b.js', imports: ['a'] }
    }
    expect(viteAssets(cyclic, 'a').preloads).toEqual(['/b.js'])
  })

  it('names a missing entry', () => {
    const missing = 'nope.tsx'
    expect(() => viteAssets(MANIFEST, missing)).toThrow(VITE_ASSETS.error.missingEntry(missing))
  })

  it('names a missing imported chunk', () => {
    const broken: ViteManifest = { a: { file: 'a.js', imports: ['gone'] } }
    expect(() => viteAssets(broken, 'a')).toThrow(VITE_ASSETS.error.missingImport('gone', 'a'))
  })

  it('rejects a manifest of the wrong shape', () => {
    expect(() => viteAssets({ a: { css: [] } } as unknown as ViteManifest, 'a')).toThrow()
  })
})
