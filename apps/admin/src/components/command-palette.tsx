import { useQuery } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import {
  ArrowDownIcon,
  ArrowUpIcon,
  CornerDownLeftIcon,
  FileTextIcon,
  ImageIcon,
  MoonIcon,
  PlusIcon,
  SearchIcon,
  SettingsIcon,
  SunIcon,
  SunMoonIcon
} from 'lucide-react'
import { Fragment, type ReactNode, useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { ShortcutHint } from '@/components/shortcut-hint'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandCollection,
  CommandDialog,
  CommandDialogPopup,
  CommandDialogTrigger,
  CommandEmpty,
  CommandFooter,
  CommandGroup,
  CommandGroupLabel,
  CommandInput,
  CommandItem,
  CommandList,
  CommandPanel,
  CommandSeparator
} from '@/components/ui/command'
import { Kbd, KbdGroup } from '@/components/ui/kbd'
import { pageLabel } from '@/features/pages/page-label'
import { pagesQuery } from '@/features/pages/queries'
import { setThemePreference, THEME, type ThemePreference } from '@/lib/theme'
import { useShortcut } from '@/lib/shortcuts'

interface PaletteItem {
  value: string
  label: string
  icon: ReactNode
  run: () => void
}

interface PaletteGroup {
  value: string
  heading: string
  items: PaletteItem[]
}

const THEME_ICONS: Record<ThemePreference, ReactNode> = {
  light: <SunIcon aria-hidden />,
  dark: <MoonIcon aria-hidden />,
  system: <SunMoonIcon aria-hidden />
}

function usePaletteGroups(close: () => void): PaletteGroup[] {
  const { t, i18n } = useTranslation('common')
  const navigate = useNavigate()
  const { data: pages = [] } = useQuery(pagesQuery)
  return useMemo(() => {
    const go = (to: '/pages' | '/media' | '/settings') => () => void navigate({ to })
    const item = (value: string, label: string, icon: ReactNode, run: () => void) => ({
      value,
      label,
      icon,
      run: () => {
        close()
        run()
      }
    })
    return [
      {
        value: 'go',
        heading: t('palette.groups.go'),
        items: [
          item(
            'go-pages',
            t('nav.sections.pages.title'),
            <FileTextIcon aria-hidden />,
            go('/pages')
          ),
          item('go-media', t('nav.sections.media.title'), <ImageIcon aria-hidden />, go('/media')),
          item(
            'go-settings',
            t('nav.sections.settings.title'),
            <SettingsIcon aria-hidden />,
            go('/settings')
          )
        ]
      },
      {
        value: 'pages',
        heading: t('palette.groups.pages'),
        items: pages.map((page) =>
          item(
            `page-${page.id}`,
            pageLabel(page, i18n.language) || page.id,
            <FileTextIcon aria-hidden />,
            () => void navigate({ to: '/pages/$pageId', params: { pageId: page.id } })
          )
        )
      },
      {
        value: 'actions',
        heading: t('palette.groups.actions'),
        items: [
          item(
            'action-new-page',
            t('palette.newPage'),
            <PlusIcon aria-hidden />,
            () => void navigate({ to: '/pages', search: { create: true } })
          ),
          ...THEME.preferences.map((preference) =>
            item(
              `theme-${preference}`,
              t('palette.theme', { theme: t(`theme.options.${preference}`) }),
              THEME_ICONS[preference],
              () => setThemePreference(preference)
            )
          )
        ]
      }
    ].filter((group) => group.items.length > 0)
  }, [t, i18n.language, navigate, pages, close])
}

function PaletteFooter() {
  const { t } = useTranslation('common')
  return (
    <CommandFooter>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <KbdGroup aria-hidden>
            <Kbd>
              <ArrowUpIcon />
            </Kbd>
            <Kbd>
              <ArrowDownIcon />
            </Kbd>
          </KbdGroup>
          <span>{t('palette.navigate')}</span>
        </div>
        <div className="flex items-center gap-2">
          <Kbd aria-hidden>
            <CornerDownLeftIcon />
          </Kbd>
          <span>{t('palette.open')}</span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Kbd aria-hidden>{t('palette.escape')}</Kbd>
        <span>{t('palette.close')}</span>
      </div>
    </CommandFooter>
  )
}

export function CommandPalette() {
  const { t } = useTranslation('common')
  const [open, setOpen] = useState(false)
  const close = useCallback(() => setOpen(false), [])
  const toggle = useCallback(() => setOpen((current) => !current), [])
  const groups = usePaletteGroups(close)
  useShortcut('palette', true, toggle)
  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandDialogTrigger render={<Button variant="outline" size="sm" />}>
        <SearchIcon aria-hidden />
        <span className="sr-only sm:not-sr-only">{t('palette.trigger')}</span>
        <ShortcutHint id="palette" className="-me-1" />
      </CommandDialogTrigger>
      <CommandDialogPopup aria-label={t('palette.title')}>
        <Command items={groups}>
          <CommandInput placeholder={t('palette.placeholder')} aria-label={t('palette.title')} />
          <CommandPanel>
            <CommandEmpty>{t('palette.empty')}</CommandEmpty>
            <CommandList>
              {(group: PaletteGroup) => (
                <Fragment key={group.value}>
                  <CommandGroup items={group.items}>
                    <CommandGroupLabel>{group.heading}</CommandGroupLabel>
                    <CommandCollection>
                      {(entry: PaletteItem) => (
                        <CommandItem
                          key={entry.value}
                          value={entry.label}
                          className="gap-2.5 [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4"
                          onClick={entry.run}
                        >
                          {entry.icon}
                          <span className="flex-1">{entry.label}</span>
                        </CommandItem>
                      )}
                    </CommandCollection>
                  </CommandGroup>
                  <CommandSeparator />
                </Fragment>
              )}
            </CommandList>
          </CommandPanel>
          <PaletteFooter />
        </Command>
      </CommandDialogPopup>
    </CommandDialog>
  )
}
