import tailwindcss from '@tailwindcss/vite'
import type { TestProjectInlineConfiguration } from 'vitest/config'
import { defineConfig } from 'vitest/config'

import { hosting } from '../../.devtools/vite/vite.ts'

const projects = await hosting<TestProjectInlineConfiguration[]>('vitest.ts')

export default defineConfig({
  test: {
    projects: (projects ?? []).map((project) => ({
      ...project,
      plugins: [tailwindcss()],
      test: { ...project.test, css: { include: /site\.css/ } }
    }))
  }
})
