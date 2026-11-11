import { defineConfig } from 'eslint/config'

import { app } from '../../.devtools/vite/eslint.js'

const ADMIN_IMPORT = {
  patterns: [
    {
      group: [
        'backstage-admin',
        'backstage-admin/**',
        '**/apps/admin',
        '**/apps/admin/**',
        '**/admin/src/**'
      ],
      message: 'The site must not import the admin app, its styles or its components.'
    }
  ]
}

export default defineConfig([
  app,
  { files: ['**/*.{ts,tsx}'], rules: { 'no-restricted-imports': ['error', ADMIN_IMPORT] } }
])
