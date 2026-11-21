import { createSite } from '@studiobimo/backstage/site/hono'

import { RESERVE } from '../src/reserve/reserve'
import { components } from '../src/blocks/component-map'
import stylesheet from '../src/site.css?inline'
import { preview } from './preview'
import { formRoutes, type FormBindings } from './forms'
import { reserveRoutes } from './reserve'

export default createSite<FormBindings>({
  components,
  stylesheet,
  preview,
  turnstile: true,
  contentSecurityPolicy: RESERVE.contentSecurityPolicy,
  routes: (app) => {
    formRoutes(components.registry)(app)
    reserveRoutes(app)
  }
})
