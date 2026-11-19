import type { AdminEnv } from './env.ts'

export interface MailMessage {
  to: string
  subject: string
  text: string
}

export interface Mailer {
  send(message: MailMessage, env: AdminEnv): Promise<void>
}

export interface EmailBinding {
  send(message: { to: string; from: string; subject: string; text: string }): Promise<unknown>
}

const MAILER = {
  notConfigured: 'Sending email needs the EMAIL binding and AUTH_EMAIL_FROM'
} as const

export const cloudflareMailer: Mailer = {
  async send(message, env) {
    if (!env.EMAIL || !env.AUTH_EMAIL_FROM) throw new Error(MAILER.notConfigured)
    await env.EMAIL.send({ ...message, from: env.AUTH_EMAIL_FROM })
  }
}
