export type LogLevel = 'info' | 'error'

export const logLine = (level: LogLevel, message: string, fields: Record<string, unknown> = {}) => {
  console[level](JSON.stringify({ level, message, ...fields }))
}
