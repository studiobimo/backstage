import tailwindcss from '@tailwindcss/vite'
import { defineConfig, mergeConfig, type UserConfig } from 'vite'

import { hosting } from '../../.devtools/vite/vite.ts'
import { RESERVE } from './src/reserve/reserve'

const REACT_VENDOR = /[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/

const host = await hosting<() => UserConfig>('vite.ts')

export default defineConfig(
  mergeConfig(
    {
      plugins: [tailwindcss()],
      resolve: { tsconfigPaths: true },
      environments: {
        client: {
          build: {
            manifest: true,
            rolldownOptions: {
              input: RESERVE.entry,
              output: { codeSplitting: { groups: [{ name: 'react', test: REACT_VENDOR }] } }
            }
          }
        }
      }
    },
    host?.() ?? {}
  )
)
