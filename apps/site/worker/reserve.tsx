import { viteAssets, type ViteManifest } from '@studiobimo/backstage/site'
import { renderInShell, type SiteApp } from '@studiobimo/backstage/site/hono'

import { RESERVE, type Availability } from '../src/reserve/reserve'

const BUILT_MANIFESTS = import.meta.glob<ViteManifest>('../dist/client/.vite/manifest.json', {
  eager: true,
  import: 'default'
})

const SERVED_BY_DEV_SERVER: ViteManifest = { [RESERVE.entry]: { file: RESERVE.entry } }

const manifestOf = () => {
  const [built] = Object.values(BUILT_MANIFESTS)
  if (built) return built
  if (import.meta.env.DEV) return SERVED_BY_DEV_SERVER
  throw new Error(`No client manifest: build the site before serving ${RESERVE.path}`)
}

export const reserveRoutes = <Extra extends object>(app: SiteApp<Extra>) => {
  const availability: Availability = { seats: RESERVE.seatsFree }
  app.get(RESERVE.availabilityPath, (c) => c.json(availability))
  app.get(RESERVE.path, (c) =>
    renderInShell(c, {
      locale: RESERVE.locale,
      title: RESERVE.title,
      body: <div id={RESERVE.mountId} />,
      ...viteAssets(manifestOf(), RESERVE.entry)
    })
  )
}
