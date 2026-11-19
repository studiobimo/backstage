const MONDAY_2024 = Date.UTC(2024, 0, 1)
const MS_PER_DAY = 86_400_000

export const weekdayName = (language: string, index: number) => {
  const name = new Intl.DateTimeFormat(language, { weekday: 'long', timeZone: 'UTC' }).format(
    MONDAY_2024 + index * MS_PER_DAY
  )
  return name.charAt(0).toLocaleUpperCase(language) + name.slice(1)
}
