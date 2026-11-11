import { defineConfig } from 'vitest/config'

import { base } from '../../.devtools/vite/vitest.ts'

const DOM_TESTS = ['src/**/*.dom.test.{ts,tsx}']

export default defineConfig({
  test: {
    projects: [
      {
        ...base,
        test: {
          ...base.test,
          name: 'node',
          include: ['src/**/*.test.{ts,tsx}', 'test/**/*.test.ts'],
          exclude: DOM_TESTS,
          environment: 'node'
        }
      },
      { ...base, test: { ...base.test, name: 'dom', include: DOM_TESTS } }
    ]
  }
})
