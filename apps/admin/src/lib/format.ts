export const formatDateTime = (language: string, timestamp: number) =>
  new Intl.DateTimeFormat(language, { dateStyle: 'medium', timeStyle: 'short' }).format(timestamp)
