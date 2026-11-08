import { defineConfig, type UserConfig } from 'vite'

import { hosting } from '../../.devtools/vite/vite.ts'

const host = await hosting<() => UserConfig>('vite.ts')

export default defineConfig(host?.() ?? {})
