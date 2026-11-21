import { API_ERROR } from '@studiobimo/backstage'
import {
  bookableSlots,
  bookingDuration,
  findFormProjection,
  findRegistrySettings
} from '@studiobimo/backstage/site'
import type { SiteApp } from '@studiobimo/backstage/site/hono'

import { SITE_LOCALES } from '../src/blocks/locales'
import { registry } from '../src/blocks/registry'
import { BOOKING_FORM } from '../src/forms/booking/form'
import { SLOTS_ROUTE } from '../src/forms/route'
import { respondWithError } from './forms'

export const slotRoutes = <Extra extends object>(app: SiteApp<Extra>) =>
  app.get(SLOTS_ROUTE.path, async (c) => {
    const settings = await findRegistrySettings(c.env.SITE, registry, SITE_LOCALES.defaultLocale)
    const booking = settings?.booking
    if (!booking) return respondWithError(c, API_ERROR.notFound)
    const date = c.req.query(SLOTS_ROUTE.query.date)
    const duration = bookingDuration(booking).safeParse(
      Number(c.req.query(SLOTS_ROUTE.query.duration))
    )
    if (!date || !duration.success) {
      return respondWithError(c, API_ERROR.invalid, duration.error?.issues)
    }
    const projection = await findFormProjection(c.env.SITE, registry, BOOKING_FORM.name)
    const slots = bookableSlots(booking.hours, projection?.entries ?? [], date, {
      step: booking.step,
      leadTime: booking.leadTime,
      duration: duration.data,
      resource: c.req.param('resource')
    })
    return c.json({ slots })
  })
