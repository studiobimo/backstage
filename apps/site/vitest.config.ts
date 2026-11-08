import type { TestProjectInlineConfiguration } from 'vitest/config'
import { defineConfig } from 'vitest/config'

import { hosting } from '../../.devtools/vite/vite.ts'

// Only the Worker's test project: the site has no React client for the shared one to test.
const projects = await hosting<TestProjectInlineConfiguration[]>('vitest.ts')

export default defineConfig({ test: { projects: projects ?? [] } })
