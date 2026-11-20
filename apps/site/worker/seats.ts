import { API_ERROR } from '@studiobimo/backstage'
import { findCollectionEntries, findCollectionEntry } from '@studiobimo/backstage/site'
import type { SiteApp } from '@studiobimo/backstage/site/hono'

import { registry } from '../src/blocks/registry'
import { SEATS_ROUTE } from '../src/collections/seats/route'
import { SEAT, type Seat } from '../src/collections/seats/schema'
import { respondWithError } from './forms'

const isZone = (value: string | undefined): value is Seat['zone'] =>
  SEAT.zones.some((zone) => zone === value)

export const seatRoutes = <Extra extends object>(app: SiteApp<Extra>) => {
  app.get(SEATS_ROUTE.path.list, async (c) => {
    const zone = c.req.query(SEATS_ROUTE.query.zone)
    const seats = await findCollectionEntries(c.env.SITE, registry, SEAT.name, {
      where: isZone(zone) ? { zone } : {},
      orderBy: { field: 'capacity', direction: 'desc' },
      limit: SEATS_ROUTE.limit
    })
    return c.json({ seats })
  })
  app.get(SEATS_ROUTE.path.byKey, async (c) => {
    const seat = await findCollectionEntry(c.env.SITE, registry, SEAT.name, c.req.param('key'))
    return seat ? c.json({ seat }) : respondWithError(c, API_ERROR.notFound)
  })
}
