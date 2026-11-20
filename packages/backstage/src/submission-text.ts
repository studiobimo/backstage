import { LOCALE } from './locales.ts'

export interface SubmissionStrings {
  yes: string
  no: string
  none: string
  missingEntry: string
  email: {
    subject: (form: string) => string
    intro: (form: string) => string
    reference: string
    open: string
  }
}

export const SUBMISSION_TEXT: Readonly<Record<string, SubmissionStrings>> = {
  en: {
    yes: 'Yes',
    no: 'No',
    none: 'Not provided',
    missingEntry: 'An entry that is no longer available',
    email: {
      subject: (form) => `New ${form} submission`,
      intro: (form) => `A visitor sent the "${form}" form.`,
      reference: 'Reference',
      open: 'Open it in the inbox'
    }
  },
  es: {
    yes: 'Sí',
    no: 'No',
    none: 'Sin indicar',
    missingEntry: 'Una entrada que ya no está disponible',
    email: {
      subject: (form) => `Nuevo envío de ${form}`,
      intro: (form) => `Un visitante envió el formulario "${form}".`,
      reference: 'Referencia',
      open: 'Abrirlo en la bandeja'
    }
  }
}

const baseLanguage = (language: string) => language.split('-')[0] ?? language

export const submissionStringsFor = (language: string): SubmissionStrings =>
  SUBMISSION_TEXT[baseLanguage(language)] ?? SUBMISSION_TEXT[LOCALE.default.defaultLocale]!
