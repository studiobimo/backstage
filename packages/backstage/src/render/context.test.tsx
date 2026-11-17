import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import {
  RenderProvider,
  useBrand,
  useDefaultLocale,
  useLocale,
  useLocalized,
  useLogo
} from './context.ts'

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

function Brand() {
  const logo = useLogo()
  return <>{[useBrand().themeColor, logo?.src, logo?.alt].join('|')}</>
}

describe('site brand in the render context', () => {
  it('hands the logo, resolved from the media, and the theme color to a block', () => {
    const html = renderToStaticMarkup(
      <RenderProvider
        value={{
          locale: 'en',
          defaultLocale: 'en',
          media: {
            m1: { key: 'media/m1.png', contentType: 'image/png', width: 8, height: 8, alt: 'Mark' }
          },
          brand: { logo: { id: 'm1', alt: '' }, themeColor: '#fff' }
        }}
      >
        <Brand />
      </RenderProvider>
    )
    expect(html).toBe('#fff|/media/m1.png|Mark')
  })

  it('is empty when the provider holds no brand', () => {
    const html = renderToStaticMarkup(
      <RenderProvider value={{ locale: 'en', defaultLocale: 'en', media: {} }}>
        <Brand />
      </RenderProvider>
    )
    expect(html).toBe('||')
  })
})
