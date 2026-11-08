import { defineConfig, mergeConfig } from 'vite'

import { app } from '../../.devtools/vite/vite.ts'
import { site } from './src/config/site.ts'

// The hosting profile's plugin, if there is one, comes in through app().
export default defineConfig(
  mergeConfig(await app({ site }), {
    // Vite inlines assets under 4 KiB as data: URIs, which public/_headers' policy blocks
    // (font-src and img-src are 'self'). Every asset stays a file instead.
    build: { assetsInlineLimit: 0 }
  })
)
