import { createAdmin } from '@studiobimo/backstage/admin'
import { registry } from 'backstage-site/registry'

export interface SentLink {
  to: string
  link: string
}

export const sent: SentLink[] = []

const linkIn = (text: string) => text.split('\n\n')[1]!
export const mail = { fail: false }

export const app = createAdmin(registry, {
  mailer: {
    send: async ({ to, text }) => {
      if (mail.fail) throw new Error('mail down')
      sent.push({ to, link: linkIn(text) })
    }
  }
})
