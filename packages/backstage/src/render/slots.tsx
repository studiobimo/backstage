import type { ComponentType, ReactNode } from 'react'

import { validateBlockContent } from '../blocks.ts'
import type { ComponentMap } from '../components.ts'
import { logLine } from '../log.ts'
import { resolveLocaleConfig } from '../locales.ts'
import type { SiteSnapshot } from '../site-publishing.ts'
import { RenderProvider } from './context.ts'

const SLOT_DROP = {
  message: 'slot dropped',
  reason: {
    unknownBlock: 'unknown_block',
    invalidContent: 'invalid_content',
    missingComponent: 'missing_component'
  }
} as const

const dropSlot = (slot: string, block: string, reason: string) => {
  logLine('error', SLOT_DROP.message, { slot, block, reason })
  return []
}

const slotNode = (
  components: ComponentMap,
  site: SiteSnapshot,
  slot: string,
  stored: SiteSnapshot['slots'][string]
): [string, ReactNode][] => {
  const { registry } = components
  const definition = registry.get(stored.block)
  if (!definition || !registry.slots.get(slot)?.includes(definition.name)) {
    return dropSlot(slot, stored.block, SLOT_DROP.reason.unknownBlock)
  }
  const result = validateBlockContent(definition, stored.schemaVersion, stored.content)
  if (!result.ok) return dropSlot(slot, stored.block, SLOT_DROP.reason.invalidContent)
  const Component = components.blocks[definition.name] as
    ComponentType<Record<string, unknown>> | undefined
  if (!Component) return dropSlot(slot, stored.block, SLOT_DROP.reason.missingComponent)
  return [
    [
      slot,
      <RenderProvider
        key={slot}
        value={{
          locale: site.locale,
          defaultLocale: resolveLocaleConfig(registry).defaultLocale,
          media: site.media,
          brand: site.brand,
          settings: site.settings
        }}
      >
        <Component {...(result.content as Record<string, unknown>)} />
      </RenderProvider>
    ]
  ]
}

export const renderSlots = (
  components: ComponentMap,
  site: SiteSnapshot | null
): Record<string, ReactNode> =>
  Object.fromEntries(
    Object.entries(site?.slots ?? {}).flatMap(([slot, stored]) =>
      site ? slotNode(components, site, slot, stored) : []
    )
  )
