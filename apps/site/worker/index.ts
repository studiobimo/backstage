import { createSite } from '@studiobimo/backstage/site/hono'

import { components } from '../src/blocks/component-map'
import stylesheet from '../src/site.css?inline'
import { preview } from './preview'
import { formRoutes } from './forms'

export default createSite({
  components,
  stylesheet,
  preview,
  turnstile: true,
  routes: formRoutes(components.registry)
})
