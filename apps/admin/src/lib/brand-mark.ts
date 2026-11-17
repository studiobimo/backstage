const CLAPPERBOARD_ROWS = [
  '.#.#.#.#.',
  '#.#.#.#.#',
  '.........',
  '#########',
  '#.......#',
  '#.#####.#',
  '#.......#',
  '#.###...#',
  '#########'
] as const

const FILLED_CELL = '#'

export const BRAND_MARK = {
  grid: { columns: CLAPPERBOARD_ROWS[0].length, rows: CLAPPERBOARD_ROWS.length },
  dotRadiusRatio: 0.42,
  favicon: {
    size: 120,
    padding: 10,
    lightFill: '#1c1c1c',
    darkFill: '#f5f5f5',
    darkScheme: '(prefers-color-scheme:dark)',
    className: 'mark'
  }
} as const

export type BrandDot = { cx: number; cy: number }

export function brandMarkDots(): BrandDot[] {
  return CLAPPERBOARD_ROWS.flatMap((row, y) =>
    [...row].flatMap((cell, x) => (cell === FILLED_CELL ? [{ cx: x + 0.5, cy: y + 0.5 }] : []))
  )
}

export function brandMarkViewBox(): string {
  return `0 0 ${BRAND_MARK.grid.columns} ${BRAND_MARK.grid.rows}`
}

function dotMarkup(dot: BrandDot): string {
  return `<circle cx="${dot.cx}" cy="${dot.cy}" r="${BRAND_MARK.dotRadiusRatio}"/>`
}

export function brandFaviconSvg(): string {
  const { size, padding, lightFill, darkFill, darkScheme, className } = BRAND_MARK.favicon
  const { columns, rows } = BRAND_MARK.grid
  const scale = (size - padding * 2) / Math.max(columns, rows)
  const offsetX = (size - columns * scale) / 2
  const offsetY = (size - rows * scale) / 2
  const dots = brandMarkDots().map(dotMarkup).join('')
  const style = `.${className}{fill:${lightFill}}@media ${darkScheme}{.${className}{fill:${darkFill}}}`
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}"><style>${style}</style><g class="${className}" transform="translate(${offsetX} ${offsetY}) scale(${scale})">${dots}</g></svg>\n`
}
