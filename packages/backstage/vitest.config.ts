import { defineConfig, mergeConfig } from 'vitest/config'

import { base } from '../../.devtools/vite/vitest.ts'

export default mergeConfig(
  base,
  defineConfig({ test: { include: ['test/**/*.test.ts'], environment: 'node' } })
)
