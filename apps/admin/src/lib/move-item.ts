export const moveItem = <T>(items: readonly T[], from: number, to: number): T[] => {
  const next = [...items]
  next.splice(to, 0, ...next.splice(from, 1))
  return next
}
