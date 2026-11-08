import { defineConfig, type UserConfig } from 'vite'

import { hosting } from '../../.devtools/vite/vite.ts'

// The site has no client bundle, so it takes only the hosting profile's half of the shared
// config: the plugin that builds the Worker and runs it in workerd under vite dev and preview.
const host = await hosting<() => UserConfig>('vite.ts')

export default defineConfig(host?.() ?? {})
