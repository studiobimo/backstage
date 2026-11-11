import { ESLint } from 'eslint'
import { describe, expect, it } from 'vitest'

const SITE_ROOT = new URL('..', import.meta.url).pathname

const lint = async (source: string) => {
  const eslint = new ESLint({ cwd: SITE_ROOT })
  const [result] = await eslint.lintText(source, { filePath: `${SITE_ROOT}src/blocks/probe.ts` })
  return result?.messages.filter(({ ruleId }) => ruleId === 'no-restricted-imports') ?? []
}

describe('the site importing the admin', () => {
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
