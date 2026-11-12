export const blocker = {
  options: undefined as { shouldBlockFn: () => boolean } | undefined,
  state: { status: 'idle' } as Record<string, unknown>
}

export const blockerRouterMock = {
  useBlocker: (options: { shouldBlockFn: () => boolean }) => {
    blocker.options = options
    return blocker.state
  }
}
