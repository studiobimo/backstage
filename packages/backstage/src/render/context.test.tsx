import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { RenderProvider, useDefaultLocale, useLocale, useLocalized } from './context.ts'

function Localized({ text }: { text: Partial<Record<string, string>> }) {
  return (
    <>
      {useLocale()}/{useDefaultLocale()}/{useLocalized(text)}
    </>
  )
}

const render = (locale: string, defaultLocale: string) =>
  renderToStaticMarkup(
    <RenderProvider value={{ locale, defaultLocale, media: {} }}>
      <Localized text={{ es: 'Hola' }} />
    </RenderProvider>
  )

describe('render context', () => {
  it('reads the locale and the site default from the provider', () => {
    expect(render('es', 'es')).toBe('es/es/Hola')
  })

  it('falls back to the site default, not to English', () => {
    expect(render('en', 'es')).toBe('en/es/Hola')
    expect(render('en', 'en')).toBe('en/en/')
  })
})
