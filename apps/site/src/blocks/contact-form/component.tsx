import { useLocale, useSettings } from '@studiobimo/backstage/render'
import type { z } from 'zod'

import { CONTACT, contactSchema } from '../../forms/contact/form.ts'
import { formPathOf } from '../../forms/route.ts'
import { siteSettingsSchema } from '../../settings/schema.ts'
import { useLocalizer } from '../content.ts'
import { Heading } from '../parts.tsx'
import { CONTACT_LABELS } from './labels.ts'
import type { contactFormSchema } from './schema.ts'

const FIELD_KEYS = Object.keys(contactSchema.shape) as (keyof typeof contactSchema.shape)[]

const INPUT_TYPE = {
  name: 'text',
  email: 'email',
  message: 'textarea'
} as const satisfies Record<(typeof FIELD_KEYS)[number], string>

const MAX_LENGTH = {
  name: CONTACT.person.maxLength,
  email: undefined,
  message: CONTACT.message.maxLength
} as const satisfies Record<(typeof FIELD_KEYS)[number], number | undefined>

function useLabels() {
  const locale = useLocale()
  return locale in CONTACT_LABELS
    ? CONTACT_LABELS[locale as keyof typeof CONTACT_LABELS]
    : CONTACT_LABELS.en
}

function ContactField({ name }: { name: (typeof FIELD_KEYS)[number] }) {
  const labels = useLabels()
  const type = INPUT_TYPE[name]
  return (
    <label>
      {labels[name]}
      {type === 'textarea' ? (
        <textarea name={name} required maxLength={MAX_LENGTH[name]} />
      ) : (
        <input name={name} type={type} required maxLength={MAX_LENGTH[name]} />
      )}
    </label>
  )
}

function CallUs() {
  const labels = useLabels()
  const localize = useLocalizer()
  const contact = useSettings(siteSettingsSchema)?.contact
  if (!contact?.phone) return null
  const address = localize(contact.address)
  return (
    <p data-contact>
      {labels.callUs} <a href={`tel:${contact.phone}`}>{contact.phone}</a>
      {address ? <address>{address}</address> : null}
    </p>
  )
}

export function ContactForm({ heading, turnstileSiteKey }: z.output<typeof contactFormSchema>) {
  const labels = useLabels()
  return (
    <section data-block="contact-form">
      <Heading value={heading} />
      <form method="post" action={formPathOf(CONTACT.name)}>
        {FIELD_KEYS.map((name) => (
          <ContactField key={name} name={name} />
        ))}
        {turnstileSiteKey ? <div className="cf-turnstile" data-sitekey={turnstileSiteKey} /> : null}
        <button type="submit">{labels.submit}</button>
      </form>
      <CallUs />
    </section>
  )
}
