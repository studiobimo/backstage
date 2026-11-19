import { uniqueScripts } from '../../client-scripts.ts'
import type { ComponentMap } from '../../components.ts'
import type { SiteSnapshot } from '../../site-publishing.ts'

export const slotBlockNamesOf = (site: SiteSnapshot | null) =>
  Object.values(site?.slots ?? {}).map(({ block }) => block)

export const hasClientScripts = (
  { registry }: Pick<ComponentMap, 'registry'>,
  scripts: readonly string[]
) => scripts.length > 0 || [...registry.blocks.values()].some(({ clientScript }) => clientScript)

export const clientScriptsOf = (
  { registry }: Pick<ComponentMap, 'registry'>,
  scripts: readonly string[],
  blockNames: readonly string[]
) =>
  uniqueScripts([
    ...scripts,
    ...blockNames.flatMap((name) => {
      const script = registry.get(name)?.clientScript
      return script ? [script] : []
    })
  ])
