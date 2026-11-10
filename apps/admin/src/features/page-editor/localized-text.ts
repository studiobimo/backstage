export const localizedText = (
  text: Record<string, string> | undefined,
  locale: string,
  fallback: string
): string | undefined => text?.[locale] ?? text?.[fallback]

export const blockTitle = (
  options: { name: string; title?: Record<string, string> }[],
  name: string,
  locale: string,
  fallback: string
) => localizedText(options.find((option) => option.name === name)?.title, locale, fallback) ?? name
