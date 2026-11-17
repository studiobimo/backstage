import { AUTH } from '../auth.ts'
import type { AdminEnv } from './env.ts'

export interface LoginLinkMessage {
  to: string
  link: string
}

export interface LoginMailer {
  sendLoginLink(message: LoginLinkMessage, env: AdminEnv): Promise<void>
}

export interface EmailBinding {
  send(message: { to: string; from: string; subject: string; text: string }): Promise<unknown>
}

const MAILER = {
  notConfigured: 'Magic-link sign-in needs the EMAIL binding and AUTH_EMAIL_FROM'
} as const

const loginLinkText = (link: string) => [AUTH.email.intro, link, AUTH.email.ignore].join('\n\n')

export const cloudflareMailer: LoginMailer = {
  async sendLoginLink({ to, link }, env) {
    if (!env.EMAIL || !env.AUTH_EMAIL_FROM) throw new Error(MAILER.notConfigured)
    await env.EMAIL.send({
      to,
      from: env.AUTH_EMAIL_FROM,
      subject: AUTH.email.subject,
      text: loginLinkText(link)
    })
  }
}
