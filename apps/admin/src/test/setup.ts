import '@testing-library/jest-dom/vitest'
import '@/i18n/config'

window.scrollTo = () => {}

window.matchMedia = (query: string) =>
  ({
    matches: false,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {}
  }) as unknown as MediaQueryList
Object.assign(globalThis, { cookieStore: { set: async () => {} } })

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
Object.assign(globalThis, { ResizeObserver: globalThis.ResizeObserver ?? ResizeObserverStub })

Element.prototype.getAnimations ??= () => []
