import { defineConfig } from 'drizzle-kit'

// The migrations ship with the package (PKG-6); a consumer applies them to its own D1.
export default defineConfig({
  dialect: 'sqlite',
  schema: './src/db/schema.ts',
  out: './migrations'
})
