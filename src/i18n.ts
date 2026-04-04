import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import Backend from 'i18next-http-backend'
import {
  DEFAULT_LOCALE,
  SUPPORTED_LOCALES,
  getLocaleFromPath,
  isValidLocale,
} from '@/lib/i18n-utils'

const languageFromPath =
  typeof window !== 'undefined' ? getLocaleFromPath(window.location.pathname) : DEFAULT_LOCALE

const initialLanguage = isValidLocale(languageFromPath) ? languageFromPath : DEFAULT_LOCALE
const localesCdn = import.meta.env.VITE_LOCALES_CDN || '/locales'

i18n
  .use(Backend)
  .use(initReactI18next)
  .init({
    lng: initialLanguage,
    fallbackLng: DEFAULT_LOCALE,
    supportedLngs: [...SUPPORTED_LOCALES],
    nonExplicitSupportedLngs: false,
    load: 'currentOnly',
    defaultNS: 'common',
    ns: ['common', 'seo', 'landing', 'auth', 'blog', 'pages', 'services', 'innovation-lab'],
    fallbackNS: 'common',
    backend: {
      loadPath: (lngs: string[], namespaces: string[]) => {
        const lng = Array.isArray(lngs) ? (lngs[0] ?? DEFAULT_LOCALE) : DEFAULT_LOCALE
        const ns = Array.isArray(namespaces) ? namespaces[0] : 'common'
        return `${localesCdn}/${lng}/${ns}.json`
      },
    },
    interpolation: {
      escapeValue: false,
    },
    returnNull: false,
    returnEmptyString: false,
    react: {
      useSuspense: true,
    },
  })

export default i18n
