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

import { IconButton } from '@/components/icon-button'
import { LeaveGuard } from '@/components/leave-guard'
import { localeOfIssue } from '@/lib/api-feedback'
import { useShortcut } from '@/lib/shortcuts'

import { BlockForm } from '../block-form/block-form'
import { EditingLocaleContext, type LocaleStatus } from '../block-form/locale-status'
import { type JsonSchema, parseBlockSchema } from '../block-form/spec'
import { type BlockValue, initialGroup } from '../block-form/value'
import { collectionTitle, entryLabelText } from '../collections/collection-text'
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
import { useEntrySave } from './use-entry-save'

const newEntryContent = (schema: JsonSchema): BlockValue => {
  try {
    return JSON.parse(JSON.stringify(initialGroup(parseBlockSchema(schema))))
  } catch {
    return {}
  }
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

function usePublishing(collection: string, entry: Entry | undefined) {
  const queryClient = useQueryClient()
  const id = entry?.id ?? ''
  return usePublishActions(entry?.version ?? 0, {
    publish: publishEntryMutation(queryClient, collection, id),
    unpublish: unpublishEntryMutation(queryClient, collection, id),
    context: 'entry'
  })
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
  const dirty = !sameContent(content, saved) && !created
  const save = useEntrySave({
    collection: collection.name,
    entry,
    content,
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
  return { content, setContent, dirty, save, onSave, locale, setLocale }
}

interface EntryNoticesProps {
  entry?: Entry
  draft: ReturnType<typeof useEntryDraft>
  publishError: unknown
  unsavedChanges: boolean
  hintId: string
  onReload: () => void
}

function EntryNotices({
  entry,
  draft,
  publishError,
  unsavedChanges,
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
      />
    </>
  )
}

function EntryEditorBody({ collection, entry, onReload }: EntryEditorBodyProps) {
  const { t, i18n } = useTranslation('entryEditor')
  const hintId = useId()
  const { locales, defaultLocale } = useLocaleConfig()
  const draft = useEntryDraft(collection, entry)
  const { content, dirty, save, locale } = draft
  const publish = usePublishing(collection.name, entry)
  const editing = useMemo(
    () => ({ locales, active: locale, fallback: defaultLocale }),
    [locales, locale, defaultLocale]
  )
  const published = entry !== undefined && entry.publishedAt !== null
  const unsavedChanges = entry !== undefined && hasUnpublishedChanges(entry)
  const title = entry
    ? entryLabelText(entry.label, i18n.language, defaultLocale) || t('untitled')
    : t('new')
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
          hintId={hintId}
          onReload={onReload}
        />
        <BlockForm
          schema={collection.schema}
          locales={locales}
          value={content}
          onChange={draft.setContent}
          issues={save.issues}
          className="max-w-none"
        />
      </div>
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
