import { INBOX } from '../form-inbox.ts'
import type { Form } from '../forms.ts'
import { escapeXml } from '../seo.ts'
import {
  plainTextOf,
  type PresentedColumn,
  type PresentedField,
  type PresentedValue
} from '../submission-presentation.ts'
import type { SubmissionStrings } from '../submission-text.ts'
import type { MailMessage } from './mailer.ts'

const EMAIL = {
  indent: '  ',
  bullet: '- ',
  separator: ': ',
  cellSeparator: ', ',
  paragraphBreak: '\n\n'
} as const

export interface SubmissionEmailInput {
  form: Form
  title: string
  id: string
  fields: PresentedField[]
  strings: SubmissionStrings
  subject: string
  adminOrigin?: string
  html: boolean
}

const inboxLinkOf = (adminOrigin: string | undefined, form: string, id: string) => {
  try {
    return new URL(INBOX.submissionPath(form, id), adminOrigin).toString()
  } catch {
    return undefined
  }
}

const isFilled = (field: PresentedField) => plainTextOf(field.value) !== ''

const rowText = (columns: PresentedColumn[], row: string[]) =>
  columns
    .flatMap(({ label }, index) => (row[index] ? [`${label}${EMAIL.separator}${row[index]}`] : []))
    .join(EMAIL.cellSeparator)

const fieldLines = ({ label, value }: PresentedField, depth: number): string[] => {
  const pad = EMAIL.indent.repeat(depth)
  if (value.kind === 'text') return [`${pad}${label}${EMAIL.separator}${value.text}`]
  const children =
    value.kind === 'fields'
      ? value.fields.filter(isFilled).flatMap((child) => fieldLines(child, depth + 1))
      : value.rows.map(
          (row) => `${pad}${EMAIL.indent}${EMAIL.bullet}${rowText(value.columns, row)}`
        )
  return [`${pad}${label}${EMAIL.separator}`, ...children]
}

const textBody = ({ fields, strings, title, id }: SubmissionEmailInput, link: string | undefined) =>
  [
    strings.email.intro(title),
    [
      `${strings.email.reference}${EMAIL.separator}${id}`,
      ...fields.filter(isFilled).flatMap((field) => fieldLines(field, 0))
    ].join('\n'),
    ...(link ? [`${strings.email.open}${EMAIL.separator}${link}`] : [])
  ].join(EMAIL.paragraphBreak)

const htmlRows = (columns: PresentedColumn[], rows: string[][]) =>
  [
    '<table>',
    `<tr>${columns.map(({ label }) => `<th align="left">${escapeXml(label)}</th>`).join('')}</tr>`,
    ...rows.map((row) => `<tr>${row.map((cell) => `<td>${escapeXml(cell)}</td>`).join('')}</tr>`),
    '</table>'
  ].join('')

const htmlValue = (value: PresentedValue): string => {
  if (value.kind === 'text') return escapeXml(value.text)
  if (value.kind === 'table') return htmlRows(value.columns, value.rows)
  return htmlList(value.fields)
}

function htmlList(fields: PresentedField[]): string {
  const items = fields
    .filter(isFilled)
    .map(({ label, value }) => `<dt>${escapeXml(label)}</dt><dd>${htmlValue(value)}</dd>`)
  return `<dl>${items.join('')}</dl>`
}

const htmlBody = ({ fields, strings, title, id }: SubmissionEmailInput, link: string | undefined) =>
  [
    `<p>${escapeXml(strings.email.intro(title))}</p>`,
    `<p>${escapeXml(strings.email.reference)}${EMAIL.separator}${escapeXml(id)}</p>`,
    htmlList(fields),
    ...(link ? [`<p><a href="${escapeXml(link)}">${escapeXml(strings.email.open)}</a></p>`] : [])
  ].join('')

export const submissionMessage = (input: SubmissionEmailInput): Omit<MailMessage, 'to'> => {
  const link = inboxLinkOf(input.adminOrigin, input.form.name, input.id)
  return {
    subject: input.subject,
    text: textBody(input, link),
    ...(input.html && { html: htmlBody(input, link) })
  }
}
