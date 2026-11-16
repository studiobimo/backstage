import type { Context } from 'hono'

import type { AdminRegistry } from '../collections.ts'
import { siteLinksToPage } from '../db/page-link-references.ts'
import { planSitePublish, recordSitePublished, SITE_PUBLISH_PLAN } from '../db/site-publishing.ts'
import { ensureUser } from '../db/users.ts'
import type { EntryDependents } from '../republish.ts'
import type { AccessEnv } from './auth.ts'
import { republishDependents } from './entry-dependents.ts'
import { writeSiteSnapshots } from './snapshots.ts'

const republishSiteLinkedTo = async (
  c: Context<AccessEnv>,
  registry: AdminRegistry,
  id: string
) => {
  if (!(await siteLinksToPage(c.env.DB, id))) return
  const publishedAt = Date.now()
  const plan = await planSitePublish(c.env.DB, registry, publishedAt)
  if (plan.status !== SITE_PUBLISH_PLAN.ready) return
  await writeSiteSnapshots(c.env.SITE, plan.snapshots)
  const editorId = await ensureUser(c.env.DB, c.get('editor'))
  await recordSitePublished(c.env.DB, editorId, publishedAt, plan.versions, plan.linkedPageIds)
}

export const republishLinkedTo = async (
  c: Context<AccessEnv>,
  registry: AdminRegistry,
  id: string
): Promise<EntryDependents> => {
  const pages = await republishDependents(c, registry, { linkedTo: id })
  await republishSiteLinkedTo(c, registry, id)
  return pages
}
