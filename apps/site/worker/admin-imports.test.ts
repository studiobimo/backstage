import { ESLint } from 'eslint'
import { beforeAll, describe, expect, it } from 'vitest'

const SITE_ROOT = new URL('..', import.meta.url).pathname
const PROBE_PATH = `${SITE_ROOT}src/blocks/probe.ts`
const LINT = { configLoadTimeoutMs: 60_000 } as const

const eslint = new ESLint({ cwd: SITE_ROOT })

const lint = async (source: string) => {
  const [result] = await eslint.lintText(source, { filePath: PROBE_PATH })
  return result?.messages.filter(({ ruleId }) => ruleId === 'no-restricted-imports') ?? []
}

describe('the site importing the admin', () => {
  beforeAll(() => lint(''), LINT.configLoadTimeoutMs)

  it.each([
    "import { cn } from 'backstage-admin/src/lib/utils'",
    "import { Button } from '../../../admin/src/components/ui/button'",
    "import { app } from '../../../../apps/admin/worker/index'"
  ])('fails lint: %s', async (statement) => {
    expect(await lint(statement)).toHaveLength(1)
  })

  it('allows imports from the package and the site', async () => {
    expect(
      await lint("import { SLOT } from '@studiobimo/backstage'\nimport './schema-parts.ts'")
    ).toEqual([])
  })
})
