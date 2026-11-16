#!/usr/bin/env node
import { randomUUID } from 'node:crypto'

import { connect, SeedError } from './seed-api.mjs'
import { EDITED_POST, PAGES, POSTS, SEED, SITE_SETTINGS, SITE_SLOTS } from './seed-content.mjs'

const COMMANDS = ['seed', 'unseed']

const log = (message) => console.log(`[seed] ${message}`)

const isSeedSlug = (slug) => typeof slug === 'string' && slug.startsWith(SEED.slugPrefix)

const isSeedPage = ({ locales }) =>
  locales.some(
    ({ locale, slug, title }) =>
      locale === SEED.defaultLocale && (isSeedSlug(slug) || title.startsWith(SEED.titlePrefix))
  )

const isSeedEntry = ({ slugs }) => isSeedSlug(slugs[SEED.defaultLocale])

const postsPath = (suffix = '') => `/collections/${SEED.collection}/entries${suffix}`

const publishEntry = (api, id, version) =>
  api.request('POST', postsPath(`/${id}/publish`), { expectedVersion: version })

const createPosts = async (api) => {
  const { entries } = await api.request('GET', postsPath())
  const existing = new Map(entries.map((entry) => [entry.slugs[SEED.defaultLocale], entry]))
  const ids = new Map()
  for (const post of POSTS) {
    const found = existing.get(post.slugs[SEED.defaultLocale])
    if (found) {
      ids.set(post.slugs.en, found.id)
      continue
    }
    const { entry } = await api.request('POST', postsPath(), {
      content: post.content,
      slugs: post.slugs
    })
    ids.set(post.slugs.en, entry.id)
    if (post.status === SEED.status.published) await publishEntry(api, entry.id, entry.version)
    if (post.slugs.en === EDITED_POST.slug) await editPost(api, entry.id, post)
    log(`post ${post.slugs.en} (${post.status})`)
  }
  return ids
}

const editPost = async (api, id, post) => {
  const { entry } = await api.request('GET', postsPath(`/${id}`))
  await api.request('PUT', postsPath(`/${id}`), {
    content: { ...post.content, summary: EDITED_POST.summary },
    slugs: post.slugs,
    expectedVersion: entry.version
  })
}

const blockRow = (versions, [name, content]) => ({
  id: randomUUID(),
  block: name,
  schemaVersion: versions.get(name),
  content
})

const saveBlocks = async (api, versions, page, blocks) => {
  const saved = await api.request('PUT', `/pages/${page.id}/blocks`, {
    blocks: blocks.map((block) => blockRow(versions, block)),
    expectedVersion: page.version
  })
  return { ...page, version: saved.version }
}

const pageInput = (spec) => ({
  isHome: Boolean(spec.isHome),
  titles: spec.titles,
  ...(spec.isHome ? {} : { slugs: spec.slugs })
})

const publishPage = async (api, page) => {
  const published = await api.request('POST', `/pages/${page.id}/publish`, {
    expectedVersion: page.version
  })
  return published.page
}

const createPage = async (api, versions, entryIds, spec) => {
  const created = await api.request('POST', '/pages', pageInput(spec))
  const entryId = (post) => entryIds.get(post.slugs.en)
  let page = await saveBlocks(api, versions, created.page, spec.blocks({ entryId }))
  if (spec.status === SEED.status.draft) return
  page = await publishPage(api, page)
  if (spec.status === SEED.status.changed) {
    await saveBlocks(api, versions, page, spec.changedBlocks())
  }
}

const isDefaultLocale = ({ locale }) => locale === SEED.defaultLocale

const labelOf = (spec) => spec.titles[SEED.defaultLocale]

const createPages = async (api, entryIds) => {
  const [{ blocks }, { pages }] = await Promise.all([
    api.request('GET', '/blocks'),
    api.request('GET', '/pages')
  ])
  const versions = new Map(blocks.map(({ name, version }) => [name, version]))
  const titles = new Set(pages.map((page) => page.locales.find(isDefaultLocale)?.title))
  const hasHome = pages.some((page) => page.isHome)
  for (const spec of PAGES) {
    if (titles.has(labelOf(spec)) || (spec.isHome && hasHome)) continue
    await createPage(api, versions, entryIds, spec)
    log(`page ${labelOf(spec)} (${spec.status})`)
  }
}

const writeSiteContent = async (api) => {
  let wrote = false
  const { settings, version } = await api.request('GET', '/settings')
  if (Object.keys(settings.siteName).length === 0) {
    await api.request('PUT', '/settings', { ...SITE_SETTINGS, expectedVersion: version })
    wrote = true
    log('site settings')
  }
  const { slots } = await api.request('GET', '/slots')
  for (const slot of slots) {
    const [name, content] = SITE_SLOTS[slot.name] ?? []
    if (slot.current || !name) continue
    const schemaVersion = slot.blocks.find((block) => block.name === name).version
    await api.request('PUT', `/slots/${slot.name}`, {
      block: name,
      schemaVersion,
      content,
      expectedVersion: slot.version
    })
    wrote = true
    log(`slot ${slot.name}`)
  }
  if (wrote) await api.request('POST', '/site/publish')
}

const seed = async (api) => {
  await writeSiteContent(api)
  const entryIds = await createPosts(api)
  await createPages(api, entryIds)
}

const removePages = async (api) => {
  const { pages } = await api.request('GET', '/pages')
  for (const page of pages.filter(isSeedPage)) {
    if (page.publishedAt) await api.request('DELETE', `/pages/${page.id}/publish`)
    await api.request('DELETE', `/pages/${page.id}`)
    log(`removed page ${page.locales.find(isDefaultLocale)?.title}`)
  }
}

const removeEntries = async (api) => {
  const { entries } = await api.request('GET', postsPath())
  for (const entry of entries.filter(isSeedEntry)) {
    if (entry.publishedAt) await api.request('DELETE', postsPath(`/${entry.id}/publish`))
    await api.request('DELETE', postsPath(`/${entry.id}`))
    log(`removed post ${entry.slugs[SEED.defaultLocale]}`)
  }
}

const unseed = async (api) => {
  await removePages(api)
  await removeEntries(api)
}

const ACTIONS = { seed, unseed }

const run = async (command) => {
  await ACTIONS[command](connect())
}

const command = process.argv[2]
if (!COMMANDS.includes(command)) {
  console.error(`Usage: seed.mjs ${COMMANDS.join('|')}`)
  process.exit(1)
}
run(command).catch((error) => {
  console.error(error instanceof SeedError ? `[seed] ${error.message}` : error)
  process.exit(1)
})
