const INITIALS_MAX_LETTERS = 2
const WORD_SEPARATORS = /[\s@._-]+/

export function initialsOf(...sources: Array<string | null | undefined>): string {
  const source = sources.find((candidate) => candidate?.trim())
  if (!source) return ''
  return source
    .split(WORD_SEPARATORS)
    .filter(Boolean)
    .slice(0, INITIALS_MAX_LETTERS)
    .map((word) => Array.from(word)[0]!.toUpperCase())
    .join('')
}
