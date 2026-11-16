export const D1_LIMITS = { boundParameters: 100 } as const

export const inChunks = <T>(items: readonly T[], size: number) =>
  Array.from({ length: Math.ceil(items.length / size) }, (_, index) =>
    items.slice(index * size, (index + 1) * size)
  )
