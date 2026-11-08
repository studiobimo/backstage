import { defineConfig } from 'eslint/config'

import { app } from '../../.devtools/vite/eslint.js'

// app, not react: it is a Vite app, and app carries the hosting profile's Worker globals and
// ignores.
export default defineConfig([app])
