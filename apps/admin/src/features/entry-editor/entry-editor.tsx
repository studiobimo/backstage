import {
  type Entry,
  countMissingTranslations,
  hasUnpublishedChanges
} from '@studiobimo/backstage/internal'
import { useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import { Trash2Icon } from 'lucide-react'
import { useId, useMemo, useState } from 'react'
import { flushSync } from 'react-dom'
import { useTranslation } from 'react-i18next'

import { FrameSection } from '@/components/frame-section'
import { IconButton } from '@/components/icon-button'
import { LeaveGuard } from '@/components/leave-guard'
import { localeOfIssue } from '@/lib/api-feedback'
import { useShortcut } from '@/lib/shortcuts'

import { BlockForm } from '../block-form/block-form'
import { EditingLocaleContext, type LocaleStatus } from '../block-form/locale-status'
import { type JsonSchema, parseBlockSchema } from '../block-form/spec'
import { type BlockValue, initialGroup } from '../block-form/value'
import { collectionTitle, entryLabelText } from '../collections/collection-text'
import { EntryRepublishDialog } from '../collections/entry-republish'
import {
  reportingOutcome,
  useDependentsNote,
  useDependentsOutcome
} from '../collections/use-entry-dependents'
import { DeleteEntryDialog } from '../collections/delete-entry-dialog'
import {
  type CollectionOption,
  collectionsQuery,
  entryKey,
  entryQuery,
  publishEntryMutation,
  unpublishEntryMutation
} from '../collections/queries'
import { useLocaleConfig } from '../config/queries'
import { EDITOR_BODY, EditorHeader } from '../page-editor/editor-header'
import { PublishNotes } from '../page-editor/publish-notes'
import { SavePublishGroup } from '../page-editor/save-publish-group'
import { StaleAlert } from '../page-editor/stale-alert'
import { usePublishActions } from '../page-editor/use-publish-actions'
import { EntrySlugField } from './entry-slug-field'
import { useEntrySave } from './use-entry-save'

const newEntryContent = (schema: JsonSchema): BlockValue => {
  try {
    return JSON.parse(JSON.stringify(initialGroup(parseBlockSchema(schema))))
  } catch {
    return {}
  }
}

const typedSlugs = (edits: Record<string, string>) => {
  const typed = Object.entries(edits).filter(([, value]) => value !== '')
  return typed.length > 0 ? Object.fromEntries(typed) : undefined
}

const UNPUBLISHED = { publishedAt: null, publishedBy: null } as const

const sameContent = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)

const localeGaps = (
  collection: CollectionOption,
  content: BlockValue,
  locales: readonly string[]
): Record<string, LocaleStatus> =>
  Object.fromEntries(
    locales.map((locale) => [
      locale,
      { missing: countMissingTranslations(collection.schema, content, locale), invalid: 0 }
    ])
  )

function usePublishing(collection: string, entry: Entry | undefined, dirty: boolean) {
  const queryClient = useQueryClient()
  const outcome = useDependentsOutcome()
  const id = entry?.id ?? ''
  const actions = usePublishActions(entry?.version ?? 0, {
    publish: reportingOutcome(publishEntryMutation(queryClient, collection, id), outcome.report),
    unpublish: reportingOutcome(
      unpublishEntryMutation(queryClient, collection, id),
      outcome.report
    ),
    context: 'entry'
  })
  const target = entry && { collection, entryId: entry.id }
  const dependents = useDependentsNote(target, !dirty && !actions.publishing)
  return { ...actions, outcome, target, dependents }
}

function PendingRepublish({ publishing }: { publishing: ReturnType<typeof usePublishing> }) {
  const { target, outcome } = publishing
  if (!target) return null
  return <EntryRepublishDialog entry={target} pending={outcome.pending} onClose={outcome.clear} />
}

interface EntryEditorBodyProps {
  collection: CollectionOption
  entry?: Entry
  onReload: () => void
}

function DeleteEntryButton({ collection, entry }: { collection: string; entry: Entry }) {
  const { t } = useTranslation('entryEditor')
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  return (
    <>
      <IconButton
        variant="outline"
        label={t('delete')}
        className="hidden sm:inline-flex"
        onClick={() => setOpen(true)}
      >
        <Trash2Icon aria-hidden />
      </IconButton>
      <DeleteEntryDialog
        entry={entry}
        collection={collection}
        open={open}
        onOpenChange={setOpen}
        onDeleted={() => void navigate({ to: '/collections/$name', params: { name: collection } })}
      />
    </>
  )
}

function useEntryDraft(collection: CollectionOption, entry: Entry | undefined) {
  const navigate = useNavigate()
  const { locales, defaultLocale } = useLocaleConfig()
  const [locale, setLocale] = useState(defaultLocale)
  const saved = useMemo(
    () => (entry?.content as BlockValue | undefined) ?? newEntryContent(collection.schema),
    [entry, collection.schema]
  )
  const [content, setContent] = useState(saved)
  const [created, setCreated] = useState(false)
  const [slugEdits, setSlugEdits] = useState<Record<string, string>>({})
  const slugsDirty = Object.entries(slugEdits).some(
    ([slug, value]) => value !== (entry?.slugs[slug] ?? '')
  )
  const dirty = (!sameContent(content, saved) || slugsDirty) && !created
  const save = useEntrySave({
    collection: collection.name,
    entry,
    content,
    slugs: typedSlugs(slugEdits),
    onCreated: (next) => {
      flushSync(() => setCreated(true))
      void navigate({
        to: '/collections/$name/$entryId',
        params: { name: collection.name, entryId: next.id },
        replace: true
      })
    }
  })
  const onSave = () =>
    void save.save().then((refused) => {
      const refusedLocale = refused.map((issue) => localeOfIssue(issue, locales)).find(Boolean)
      if (refusedLocale) setLocale(refusedLocale)
    })
  useShortcut('save', (dirty || entry === undefined) && !save.saving, onSave)
  const setSlug = (slug: string) => setSlugEdits((edits) => ({ ...edits, [locale]: slug }))
  const slug = slugEdits[locale] ?? entry?.slugs[locale] ?? ''
  return { content, setContent, dirty, save, onSave, locale, setLocale, slug, setSlug }
}

interface EntryNoticesProps {
  entry?: Entry
  draft: ReturnType<typeof useEntryDraft>
  publishError: unknown
  unsavedChanges: boolean
  dependents?: string
  hintId: string
  onReload: () => void
}

function EntryNotices({
  entry,
  draft,
  publishError,
  unsavedChanges,
  dependents,
  hintId,
  onReload
}: EntryNoticesProps) {
  const { save, content, dirty } = draft
  return (
    <>
      {save.stale && (
        <StaleAlert
          scope="entry"
          current={save.stale.current}
          draft={content}
          onReload={onReload}
        />
      )}
      {save.failure && (
        <p role="alert" className="text-destructive-foreground text-sm">
          {save.failure}
        </p>
      )}
      <PublishNotes
        page={entry ?? UNPUBLISHED}
        context="entry"
        dirty={dirty}
        changed={unsavedChanges}
        error={publishError}
        blocks={[]}
        hintId={hintId}
        dependents={dependents}
      />
    </>
  )
}

function RoutedSlug({
  collection,
  draft
}: {
  collection: CollectionOption
  draft: ReturnType<typeof useEntryDraft>
}) {
  const { t } = useTranslation('entryEditor')
  const { defaultLocale } = useLocaleConfig()
  if (!collection.route) return null
  return (
    <FrameSection title={t('address.heading')} description={t('address.description')}>
      <EntrySlugField
        route={collection.route}
        locale={draft.locale}
        defaultLocale={defaultLocale}
        value={draft.slug}
        onChange={draft.setSlug}
      />
    </FrameSection>
  )
}

function EntryEditorBody({ collection, entry, onReload }: EntryEditorBodyProps) {
  const { t, i18n } = useTranslation('entryEditor')
  const hintId = useId()
  const { locales, defaultLocale } = useLocaleConfig()
  const draft = useEntryDraft(collection, entry)
  const { content, dirty, save, locale } = draft
  const publish = usePublishing(collection.name, entry, dirty)
  const { dependents } = publish
  const editing = useMemo(
    () => ({ locales, active: locale, fallback: defaultLocale }),
    [locales, locale, defaultLocale]
  )
  const published = entry !== undefined && entry.publishedAt !== null
  const unsavedChanges = entry !== undefined && hasUnpublishedChanges(entry)
  const label = entry && entryLabelText(entry.label, i18n.language, defaultLocale)
  const title = entry ? label || t('untitled') : t('new')
  return (
    <EditingLocaleContext.Provider value={editing}>
      <EditorHeader
        back={{
          link: <Link to="/collections/$name" params={{ name: collection.name }} />,
          label: t('back', { name: collectionTitle(collection, i18n.language, defaultLocale) })
        }}
        title={title}
        published={published}
        changed={unsavedChanges}
        dirty={dirty}
        locale={{
          locales,
          active: locale,
          gaps: localeGaps(collection, content, locales),
          onChange: draft.setLocale
        }}
        actions={
          <>
            {entry && <DeleteEntryButton collection={collection.name} entry={entry} />}
            <SavePublishGroup
              name={title}
              context="entry"
              dependents={dependents}
              hintId={hintId}
              dirty={dirty || entry === undefined}
              saving={save.saving}
              published={published}
              changed={unsavedChanges}
              publishing={publish.publishing}
              unpublishing={publish.unpublishing}
              onSave={draft.onSave}
              onPublish={publish.publish}
              onUnpublish={publish.unpublish}
            />
          </>
        }
      />
      <LeaveGuard dirty={dirty} />
      <div className={EDITOR_BODY}>
        <EntryNotices
          entry={entry}
          draft={draft}
          publishError={publish.error}
          unsavedChanges={unsavedChanges}
          dependents={dependents}
          hintId={hintId}
          onReload={onReload}
        />
        <RoutedSlug collection={collection} draft={draft} />
        <FrameSection title={t('content.heading')} description={t('content.description')}>
          <BlockForm
            schema={collection.schema}
            locales={locales}
            value={content}
            onChange={draft.setContent}
            issues={save.issues}
          />
        </FrameSection>
      </div>
      <PendingRepublish publishing={publish} />
    </EditingLocaleContext.Provider>
  )
}

function ExistingEntry({
  collection,
  entryId,
  onReload
}: {
  collection: CollectionOption
  entryId: string
  onReload: () => void
}) {
  const { data: entry } = useSuspenseQuery(entryQuery(collection.name, entryId))
  return <EntryEditorBody collection={collection} entry={entry} onReload={onReload} />
}

interface EntryEditorProps {
  name: string
  entryId?: string
}

export function EntryEditor({ name, entryId }: EntryEditorProps) {
  const { t } = useTranslation('entryEditor')
  const queryClient = useQueryClient()
  const { data: collections } = useSuspenseQuery(collectionsQuery)
  const [generation, setGeneration] = useState(0)
  const collection = collections.find((candidate) => candidate.name === name)
  if (!collection) return <p role="alert">{t('missing')}</p>
  const reload = async () => {
    if (entryId) await queryClient.invalidateQueries({ queryKey: entryKey(name, entryId) })
    setGeneration((current) => current + 1)
  }
  return entryId ? (
    <ExistingEntry
      key={generation}
      collection={collection}
      entryId={entryId}
      onReload={() => void reload()}
    />
  ) : (
    <EntryEditorBody key={generation} collection={collection} onReload={() => void reload()} />
  )
}
