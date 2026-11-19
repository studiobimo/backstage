import type { z } from 'zod'

export interface FieldLabel {
  title?: string
  description?: string
}

export type FieldLabels = Readonly<Record<string, FieldLabel>>

export const labeled = <T extends z.ZodType>(schema: T, labels: FieldLabels): T =>
  schema.meta({ ...schema.meta(), labels }) as T

export interface LabelledNode {
  title?: string
  description?: string
  labels?: FieldLabels
}

export function labelsFor(node: LabelledNode, language: string, defaultLocale: string): FieldLabel {
  const { labels = {} } = node
  const current = labels[language]
  const fallback = labels[defaultLocale]
  return {
    title: current?.title ?? fallback?.title ?? node.title,
    description: current?.description ?? fallback?.description ?? node.description
  }
}
