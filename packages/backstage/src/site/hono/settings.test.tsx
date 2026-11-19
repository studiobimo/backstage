import { describe, expect, it } from 'vitest'
import { z } from 'zod'

import { defineBlock, defineLayout, defineRegistry, SLOT } from '../../blocks.ts'
import { defineComponents, type LayoutProps } from '../../components.ts'
import { useSettings } from '../../render/context.ts'
import { createSite } from './create-site.ts'
import { envWith, fixtureOptions, memoryKv, pageSnapshot, siteSnapshot } from './site-fixture.tsx'

const settingsSchema = z.object({ currency: z.string(), orderPhone: z.string() })

const price = defineBlock({ name: 'price', schema: z.object({ amount: z.number() }) })
const footer = defineBlock({ name: 'footer', schema: z.object({}) })

const registry = defineRegistry([price, footer], {
  locales: ['en'],
  defaultLocale: 'en',
  slots: { [SLOT.header]: [footer.name] },
  layouts: [defineLayout({ name: 'default' })]
})

function Price({ amount }: { amount: number }) {
  const settings = useSettings(settingsSchema)
  return <p>{settings ? `${amount} ${settings.currency}` : 'no settings'}</p>
}

function Footer() {
  return <footer>{useSettings(settingsSchema)?.orderPhone ?? 'no phone'}</footer>
}

const components = defineComponents(registry, {
  blocks: { price: Price, footer: Footer },
  layouts: {
    default: ({ slots, children }: LayoutProps) => (
      <>
        {slots[SLOT.header]}
        {children}
      </>
    )
  }
})

const page = pageSnapshot({
  blocks: [{ id: 'b1', block: 'price', schemaVersion: 1, content: { amount: 12 } }]
})
const footerSlot = { [SLOT.header]: { block: 'footer', schemaVersion: 1, content: {} } }

const executionContext = {
  waitUntil: () => undefined,
  passThroughOnException: () => undefined,
  props: {}
} as unknown as ExecutionContext

const render = async (site: ReturnType<typeof siteSnapshot>) =>
  (
    await createSite(fixtureOptions({ components })).request(
      '/about',
      {},
      envWith({}, memoryKv([page], [site])),
      executionContext
    )
  ).text()

describe('settings while a block renders', () => {
  it('hands the published settings to a page block and to a slot block', async () => {
    const html = await render(
      siteSnapshot({
        settings: { currency: 'EUR', orderPhone: '555-0100' },
        slots: footerSlot
      })
    )
    expect(html).toContain('<p>12 EUR</p>')
    expect(html).toContain('<footer>555-0100</footer>')
  })

  it('reads null when no settings were published', async () => {
    const html = await render(siteSnapshot({ slots: footerSlot }))
    expect(html).toContain('no settings')
    expect(html).toContain('no phone')
  })

  it('reads null when the published settings do not match the schema', async () => {
    const html = await render(siteSnapshot({ settings: { currency: 5 }, slots: footerSlot }))
    expect(html).toContain('no settings')
    expect(html).toContain('no phone')
  })
})
