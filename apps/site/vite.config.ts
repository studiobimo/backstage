import tailwindcss from '@tailwindcss/vite'
import { defineConfig, mergeConfig, type UserConfig } from 'vite'

import { hosting } from '../../.devtools/vite/vite.ts'

const host = await hosting<() => UserConfig>('vite.ts')

export default defineConfig(mergeConfig({ plugins: [tailwindcss()] }, host?.() ?? {}))
