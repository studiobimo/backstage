import { ChevronDownIcon, GlobeIcon, GlobeLockIcon, SaveIcon } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import {
  AlertDialog,
  AlertDialogClose,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogPopup,
  AlertDialogTitle
} from '@/components/ui/alert-dialog'
import { ShortcutHint, ShortcutTooltip } from '@/components/shortcut-hint'
import { Button } from '@/components/ui/button'
import { Group, GroupSeparator } from '@/components/ui/group'
import { Menu, MenuItem, MenuPopup, MenuTrigger } from '@/components/ui/menu'
import { ariaKeyShortcuts } from '@/lib/shortcuts'

const LABEL = 'sr-only sm:not-sr-only'

interface UnpublishDialogProps {
  name: string
  context?: 'entry'
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}

function UnpublishDialog({ name, context, open, onOpenChange, onConfirm }: UnpublishDialogProps) {
  const { t } = useTranslation('pageEditor')
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogPopup>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('publish.unpublishTitle', { name })}</AlertDialogTitle>
          <AlertDialogDescription>
            {t('publish.unpublishDescription', { context })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogClose render={<Button variant="outline" />}>
            {t('publish.cancel')}
          </AlertDialogClose>
          <AlertDialogClose render={<Button variant="destructive" onClick={onConfirm} />}>
            {t('publish.unpublish')}
          </AlertDialogClose>
        </AlertDialogFooter>
      </AlertDialogPopup>
    </AlertDialog>
  )
}

interface SavePublishGroupProps {
  name: string
  context?: 'entry'
  hintId: string
  dirty: boolean
  saving: boolean
  published: boolean
  changed: boolean
  publishing: boolean
  unpublishing: boolean
  onSave: () => void
  onPublish: () => void
  onUnpublish: () => void
}

function UnpublishMenu({ disabled, onChoose }: { disabled: boolean; onChoose: () => void }) {
  const { t } = useTranslation('pageEditor')
  return (
    <Menu>
      <MenuTrigger
        render={<Button size="icon" aria-label={t('publish.more')} disabled={disabled} />}
      >
        <ChevronDownIcon aria-hidden />
      </MenuTrigger>
      <MenuPopup align="end">
        <MenuItem variant="destructive" onClick={onChoose}>
          <GlobeLockIcon aria-hidden />
          {t('publish.unpublish')}
        </MenuItem>
      </MenuPopup>
    </Menu>
  )
}

export function SavePublishGroup(props: SavePublishGroupProps) {
  const { t } = useTranslation('pageEditor')
  const [confirming, setConfirming] = useState(false)
  const { dirty, saving, published, publishing, unpublishing } = props
  return (
    <>
      <Group aria-label={t('publish.label')}>
        <ShortcutTooltip id="save" label={t('save')}>
          <Button
            variant="outline"
            aria-keyshortcuts={ariaKeyShortcuts('save')}
            loading={saving}
            disabled={!dirty || saving}
            onClick={props.onSave}
          >
            <SaveIcon aria-hidden />
            <span className={LABEL}>{t('save')}</span>
            <ShortcutHint id="save" className="-me-1 lg:inline-flex" />
          </Button>
        </ShortcutTooltip>
        <GroupSeparator />
        <Button
          aria-describedby={props.hintId}
          loading={publishing}
          disabled={dirty || publishing || unpublishing}
          onClick={props.onPublish}
        >
          <GlobeIcon aria-hidden />
          <span className={LABEL}>
            {t(props.changed ? 'publish.publishChanges' : 'publish.publish')}
          </span>
        </Button>
        {published && (
          <>
            <GroupSeparator className="bg-primary/72" />
            <UnpublishMenu disabled={unpublishing} onChoose={() => setConfirming(true)} />
          </>
        )}
      </Group>
      <UnpublishDialog
        name={props.name}
        context={props.context}
        open={confirming}
        onOpenChange={setConfirming}
        onConfirm={props.onUnpublish}
      />
    </>
  )
}
