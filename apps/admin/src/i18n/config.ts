import i18n from 'i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import { initReactI18next } from 'react-i18next'

import { site } from '@/config/site'

type Catalog = Record<string, unknown>

const catalogs = import.meta.glob('../locales/*/*.json', {
  eager: true,
  import: 'default'
}) as Record<string, Catalog>

export const resources: Record<string, Record<string, Catalog>> = {}
for (const [path, catalog] of Object.entries(catalogs)) {
  const [language, file] = path.split('/').slice(-2)
  resources[language] = { ...resources[language], [file.replace(/\.json$/, '')]: catalog }
}

export const defaultLanguage = site.locale.split('_')[0]

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: defaultLanguage,
    supportedLngs: Object.keys(resources),
    defaultNS: 'common',
    interpolation: { escapeValue: false },
    initAsync: false,
    detection: { order: ['querystring', 'localStorage', 'navigator'], caches: ['localStorage'] },
    saveMissing: import.meta.env.DEV,
    missingKeyHandler: (_languages, namespace, key) => {
      const message = `i18n: no string for ${namespace}:${key}`
      if (import.meta.env.MODE === 'test') throw new Error(message)
      console.warn(message)
    }
  })

const setLang = (language: string) => (document.documentElement.lang = language)
setLang(i18n.resolvedLanguage ?? defaultLanguage)
i18n.on('languageChanged', setLang)

export default i18n
