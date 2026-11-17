import { writeFileSync } from 'node:fs'

import { brandFaviconSvg } from '../src/lib/brand-mark.ts'

const FAVICON_PATH = new URL('../public/favicon.svg', import.meta.url)

writeFileSync(FAVICON_PATH, brandFaviconSvg())
