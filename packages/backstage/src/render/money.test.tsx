import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { RenderProvider, type RenderContext } from './context.ts'
import { useMoney } from './money.ts'

function Price({ amount }: { amount: number }) {
  return <>{useMoney()(amount)}</>
}

const render = (context: Partial<RenderContext>) =>
  renderToStaticMarkup(
    <RenderProvider value={{ locale: 'en', defaultLocale: 'en', media: {}, ...context }}>
      <Price amount={12345600} />
    </RenderProvider>
  )

describe('useMoney', () => {
  it('formats in the currency of the site settings', () => {
    expect(render({ settings: { currency: 'HNL' } })).toContain('123,456.00')
    expect(render({ settings: { currency: 'HNL' } })).toContain('HNL')
    expect(render({ settings: { currency: 'USD' } })).toBe('$123,456.00')
  })

  it('formats with the page locale', () => {
    expect(render({ locale: 'es', settings: { currency: 'USD' } })).toMatch(/123.456,00/)
  })

  it('falls back to USD without a usable currency setting', () => {
    expect(render({})).toBe('$123,456.00')
    expect(render({ settings: { currency: 'EUR' } })).toBe('$123,456.00')
  })
})
