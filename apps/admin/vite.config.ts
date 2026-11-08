import { defineConfig, mergeConfig } from 'vite'

import { app } from '../../.devtools/vite/vite.ts'
import { site } from './src/config/site.ts'

const vendors = {
  tanstack: /[\\/]node_modules[\\/]@tanstack[\\/](?!react-form|form-core)/
}

export default defineConfig(
  mergeConfig(await app({ site, vendors }), {
    build: { assetsInlineLimit: 0 },
    optimizeDeps: { entries: ['src/**/*.{ts,tsx}'] }
  })
)
