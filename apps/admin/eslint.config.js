import { defineConfig } from 'eslint/config'

import { app } from '../../.devtools/vite/eslint.js'

const WORKERS_ONLY_ENTRIES = [
  '@studiobimo/backstage/admin',
  '@studiobimo/backstage/site',
  '@studiobimo/backstage/site/*'
]

export default defineConfig([
  app,
  {
    files: ['src/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: WORKERS_ONLY_ENTRIES,
              message:
                'The SPA runs in the browser: take shared contracts from @studiobimo/backstage/internal.'
            }
          ]
        }
      ]
    }
  }
])
