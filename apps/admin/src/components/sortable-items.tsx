import {
  Accessibility,
  type DragEndEvent,
  type Draggable,
  type DragOverEvent,
  type DragStartEvent
} from '@dnd-kit/dom'
import { DragDropProvider } from '@dnd-kit/react'
import { isSortable, useSortable } from '@dnd-kit/react/sortable'
import { GripVerticalIcon } from 'lucide-react'
import type { ReactNode, Ref } from 'react'
import { useTranslation } from 'react-i18next'
import { z } from 'zod'

import { Button } from '@/components/ui/button'

export interface SortableSlot {
  ref?: Ref<HTMLLIElement>
  handle?: ReactNode
  dragging?: boolean
}

interface SortableItemsProps {
  keys: readonly string[]
  names: readonly string[]
  onMove: (from: number, to: number) => void
  children: (key: string, index: number, slot: SortableSlot) => ReactNode
}

interface RowProps extends Omit<SortableItemsProps, 'keys' | 'onMove'> {
  id: string
  index: number
}

function SortableRow({ id, index, names, children }: RowProps) {
  const { t } = useTranslation()
  const { ref, handleRef, isDragging } = useSortable({
    id,
    index,
    data: { name: names[index], total: names.length }
  })
  const handle = (
    <Button
      ref={handleRef}
      type="button"
      variant="ghost"
      size="icon"
      className="cursor-grab touch-none active:cursor-grabbing"
      aria-label={t('sort.handle', { item: names[index] })}
    >
      <GripVerticalIcon />
    </Button>
  )
  return children(id, index, { ref, handle, dragging: isDragging })
}

const placeData = z.object({ name: z.string(), total: z.number() })

function placeOf(source: Draggable | null) {
  const data = placeData.safeParse(source?.data)
  const position = isSortable(source) ? source.index + 1 : 0
  return { item: data.data?.name ?? '', position, total: data.data?.total ?? 0 }
}

export default function SortableItems({ keys, names, onMove, children }: SortableItemsProps) {
  const { t } = useTranslation()
  return (
    <DragDropProvider
      plugins={(defaults) => [
        ...defaults,
        Accessibility.configure({
          announcements: {
            dragstart: ({ operation }: DragStartEvent) =>
              t('sort.picked', placeOf(operation.source)),
            dragover: ({ operation }: DragOverEvent) =>
              operation.target?.id === operation.source?.id
                ? undefined
                : t('sort.over', placeOf(operation.source)),
            dragend: ({ operation, canceled }: DragEndEvent) =>
              t(canceled ? 'sort.cancelled' : 'sort.dropped', placeOf(operation.source))
          },
          screenReaderInstructions: { draggable: t('sort.instructions') }
        })
      ]}
      onDragEnd={(event) => {
        const { source } = event.operation
        if (event.canceled || !isSortable(source)) return
        if (source.initialIndex !== source.index) onMove(source.initialIndex, source.index)
      }}
    >
      <ul className="flex flex-col gap-3">
        {keys.map((key, index) => (
          <SortableRow key={key} id={key} index={index} names={names}>
            {children}
          </SortableRow>
        ))}
      </ul>
    </DragDropProvider>
  )
}
