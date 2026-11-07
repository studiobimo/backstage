import '@testing-library/jest-dom/vitest'
import '@/i18n/config'

// jsdom lays nothing out, so it has no scrollTo for the router's scroll restoration to call.
window.scrollTo = () => {}

// Nor does it have the media queries the sidebar and the theme read, or the Cookie Store
// API the sidebar saves its state with.
window.matchMedia = (query: string) =>
  ({
    matches: false,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {}
  }) as unknown as MediaQueryList
Object.assign(globalThis, { cookieStore: { set: async () => {} } })
