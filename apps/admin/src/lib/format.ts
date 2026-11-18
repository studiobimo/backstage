export const formatDateTime = (language: string, timestamp: number) =>
  new Intl.DateTimeFormat(language, { dateStyle: 'medium', timeStyle: 'short' }).format(timestamp)

const BYTE_UNITS = ['byte', 'kilobyte', 'megabyte', 'gigabyte'] as const
const BYTES_PER_UNIT = 1024
const FRACTION_DIGITS_FROM_MEGABYTES = 1

export const formatBytes = (language: string, bytes: number) => {
  const power = Math.min(
    BYTE_UNITS.length - 1,
    bytes > 0 ? Math.floor(Math.log(bytes) / Math.log(BYTES_PER_UNIT)) : 0
  )
  return new Intl.NumberFormat(language, {
    style: 'unit',
    unit: BYTE_UNITS[power],
    unitDisplay: 'short',
    maximumFractionDigits: power >= 2 ? FRACTION_DIGITS_FROM_MEGABYTES : 0
  }).format(bytes / BYTES_PER_UNIT ** power)
}
