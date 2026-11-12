import { API_ERROR } from '@studiobimo/backstage'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { toastManager } from '@/components/ui/toast'
import i18n from '@/i18n/config'

import { ApiError, SESSION_EXPIRED, SessionExpiredError } from './api'
import { apiErrorMessage, notifySessionExpired } from './api-feedback'

const codes = [...Object.values(API_ERROR), SESSION_EXPIRED].map(({ code }) => code)

describe('apiErrorMessage', () => {
  afterEach(() => i18n.changeLanguage('en'))

  describe.each(['en', 'es'])('in %s', (language) => {
    const fallback = () => i18n.getFixedT(language, 'common')('apiErrors.fallback')

    it.each(codes)('has its own string for %s', async (code) => {
      await i18n.changeLanguage(language)
      const message = apiErrorMessage(i18n, new ApiError(code, 'server text'))
      expect(message).not.toMatch(/^apiErrors\./)
      expect(message).not.toBe(fallback())
    })

    it('falls back to the generic message for a code with no string', async () => {
      await i18n.changeLanguage(language)
      expect(apiErrorMessage(i18n, new ApiError('no_such_code', 'x'))).toBe(fallback())
    })

    it('falls back for an error that did not come from the API', async () => {
      await i18n.changeLanguage(language)
      expect(apiErrorMessage(i18n, new TypeError('Failed to fetch'))).toBe(fallback())
    })
  })
})

describe('notifySessionExpired', () => {
  afterEach(() => vi.restoreAllMocks())

  it('raises one persistent prompt that signs in again in a new tab', () => {
    const add = vi.spyOn(toastManager, 'add').mockReturnValue('toast-1')
    const close = vi.spyOn(toastManager, 'close').mockReturnValue(undefined)
    const open = vi.spyOn(window, 'open').mockReturnValue(null)
    notifySessionExpired(new SessionExpiredError())
    notifySessionExpired(new SessionExpiredError())
    expect(add).toHaveBeenCalledOnce()
    const options = add.mock.calls[0]![0]
    expect(options.timeout).toBe(0)
    expect(options.actionProps?.children).toBe('Sign in again')
    options.actionProps?.onClick?.({} as never)
    expect(open).toHaveBeenCalledWith('/', '_blank', 'noopener')
    expect(close).toHaveBeenCalledWith('toast-1')
    options.onClose?.()
  })

  it('ignores every other failure', () => {
    const add = vi.spyOn(toastManager, 'add')
    notifySessionExpired(new ApiError('internal', 'x'))
    notifySessionExpired(new TypeError('Failed to fetch'))
    expect(add).not.toHaveBeenCalled()
  })
})
