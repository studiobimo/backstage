import { createAdmin, type LoginLinkMessage } from '@studiobimo/backstage/admin'
import { registry } from 'backstage-site/registry'

export const sent: LoginLinkMessage[] = []
export const mail = { fail: false }

export const app = createAdmin(registry, {
  mailer: {
    sendLoginLink: async (message) => {
      if (mail.fail) throw new Error('mail down')
      sent.push(message)
    }
  }
})
