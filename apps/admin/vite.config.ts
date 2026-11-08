import { defineConfig, mergeConfig } from 'vite'

import { app } from '../../.devtools/vite/vite.ts'
import { site } from './src/config/site.ts'

export default defineConfig(
  mergeConfig(await app({ site }), {
    build: { assetsInlineLimit: 0 }
  })
)
