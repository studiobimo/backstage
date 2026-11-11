import type { ComponentType } from 'react'

import { validateBlockContent } from '../blocks.ts'
import type { ComponentMap } from '../components.ts'
import type { Snapshot } from '../publishing.ts'

interface BlocksProps {
  components: ComponentMap
  snapshot: Pick<Snapshot, 'blocks'>
}

export function Blocks({ components, snapshot }: BlocksProps) {
  const { registry } = components
  return snapshot.blocks.flatMap((block) => {
    const definition = registry.get(block.block)
    if (!definition || registry.isSlotBlock(block.block)) return []
    const result = validateBlockContent(definition, block.schemaVersion, block.content)
    if (!result.ok) return []
    const Component = components.blocks[definition.name] as
      ComponentType<Record<string, unknown>> | undefined
    if (!Component) {
      console.error(`Block "${definition.name}" is registered but has no component`)
      return []
    }
    return [<Component key={block.id} {...(result.content as Record<string, unknown>)} />]
  })
}
