import { SaveIcon } from 'lucide-react'
import type { ComponentProps } from 'react'
import { useTranslation } from 'react-i18next'

import { PageTitle } from '@/components/page-title'
import { StickyHeader } from '@/components/sticky-header'
import { ShortcutHint, ShortcutTooltip } from '@/components/shortcut-hint'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ariaKeyShortcuts } from '@/lib/shortcuts'

import { EditorLocaleTabs } from '../page-editor/editor-header'

interface SettingsHeaderProps {
  title: string
  dirty: boolean
  saving: boolean
  locale: ComponentProps<typeof EditorLocaleTabs>
  onSave: () => void
}

export function SettingsHeader({ title, dirty, saving, locale, onSave }: SettingsHeaderProps) {
  const { t } = useTranslation('settings')
  return (
    <StickyHeader>
      <div className="flex items-center gap-2 sm:gap-3">
        <PageTitle className="flex-1 truncate">{title}</PageTitle>
        {dirty && <Badge variant="warning">{t('unsaved')}</Badge>}
        <EditorLocaleTabs {...locale} />
        <ShortcutTooltip id="save" label={t('save')}>
          <Button
            variant="outline"
            aria-keyshortcuts={ariaKeyShortcuts('save')}
            loading={saving}
            disabled={!dirty || saving}
            onClick={onSave}
          >
            <SaveIcon aria-hidden />
            <span className="sr-only sm:not-sr-only">{t('save')}</span>
            <ShortcutHint id="save" className="-me-1 lg:inline-flex" />
          </Button>
        </ShortcutTooltip>
      </div>
    </StickyHeader>
  )
}
