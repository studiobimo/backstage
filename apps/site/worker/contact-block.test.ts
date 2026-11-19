import { afterAll, beforeEach, describe, expect, it } from 'vitest'

import { formPathOf } from '../src/forms/route'
import {
  clearKv,
  get,
  platform,
  publishSiteSnapshots,
  publishSnapshots,
  siteSnapshotOf,
  snapshotOf
} from './test-support'

afterAll(() => platform.dispose())
beforeEach(clearKv)

const SETTINGS = {
  contact: { phone: '+34 600 000 000', address: { en: '1 Main St', es: 'Plaza Mayor 1' } }
}
const SITE_KEY = '0x4AAAAAAA'

const contactBlock = (content: Record<string, unknown> = {}) => ({
  id: 'b1',
  block: 'contact-form',
  schemaVersion: 1,
  content: { heading: { en: 'Get in touch', es: 'Ponte en contacto' }, ...content }
})

const publish = (settings?: typeof SETTINGS, content?: Record<string, unknown>) =>
  Promise.all([
    publishSnapshots(
      snapshotOf({ locale: 'en', slug: 'contact', blocks: [contactBlock(content)] }),
      snapshotOf({ locale: 'es', slug: 'contacto', blocks: [contactBlock(content)] })
    ),
    publishSiteSnapshots(
      siteSnapshotOf({ locale: 'en', settings }),
      siteSnapshotOf({ locale: 'es', settings })
    )
  ])

const html = async (path: string) => (await get(path)).text()

describe('the contact form block', () => {
  it('posts every field of the form to the form route', async () => {
    await publish()
    const page = await html('/contact')
    expect(page).toContain(`<form action="${formPathOf('contact')}" method="post">`)
    for (const field of ['name', 'email', 'message']) {
      expect(page).toContain(`name="${field}"`)
    }
    expect(page).toContain('<button type="submit">Send message</button>')
  })

  it('labels the form in the language of the page', async () => {
    await publish()
    const page = await html('/es/contacto')
    expect(page).toContain('Enviar mensaje')
    expect(page).toContain('Correo electrónico')
  })

  it('renders the Turnstile widget only when the block has a site key', async () => {
    await publish(undefined, { turnstileSiteKey: SITE_KEY })
    expect(await html('/contact')).toContain(`data-sitekey="${SITE_KEY}"`)
    await publish()
    expect(await html('/contact')).not.toContain('cf-turnstile')
  })
})

describe('registry settings inside the contact form block', () => {
  it('shows the published phone and the address in the page language', async () => {
    await publish(SETTINGS)
    const english = await html('/contact')
    expect(english).toContain('href="tel:+34 600 000 000"')
    expect(english).toContain('<address>1 Main St</address>')
    expect(await html('/es/contacto')).toContain('<address>Plaza Mayor 1</address>')
  })

  it('shows no contact line when no settings were published', async () => {
    await publish()
    expect(await html('/contact')).not.toContain('data-contact')
  })
})
