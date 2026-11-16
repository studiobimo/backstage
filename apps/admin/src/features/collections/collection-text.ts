import { localizedText } from '../page-editor/localized-text'

interface TitledCollection {
  name: string
  title?: Readonly<Record<string, string>>
}

const baseLanguage = (language: string) => language.split('-')[0] ?? language

export const collectionTitle = (
  collection: TitledCollection,
  language: string,
  fallbackLocale: string
) => localizedText(collection.title, baseLanguage(language), fallbackLocale) ?? collection.name

export const entryLabelText = (
  label: Readonly<Record<string, string>>,
  language: string,
  fallbackLocale: string
) =>
  localizedText(label, baseLanguage(language), fallbackLocale) ??
  Object.values(label).find((text) => text !== '') ??
  ''
