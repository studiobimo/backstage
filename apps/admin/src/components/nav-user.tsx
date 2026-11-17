import { AUTH } from '@studiobimo/backstage/internal'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { ChevronsUpDown, Languages, LogOut, Monitor, Moon, Sun } from 'lucide-react'
import { useSyncExternalStore } from 'react'
import { useTranslation } from 'react-i18next'

import {
  Menu,
  MenuItem,
  MenuPopup,
  MenuRadioGroup,
  MenuRadioItem,
  MenuSeparator,
  MenuSub,
  MenuSubPopup,
  MenuSubTrigger,
  MenuTrigger
} from '@/components/ui/menu'
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar
} from '@/components/ui/sidebar'
import { UserAvatar } from '@/components/user-avatar'
import { authSessionQuery, signOutMutation } from '@/features/auth/queries'
import { currentUserQuery } from '@/features/users/queries'
import { resources } from '@/i18n/config'
import {
  getThemePreference,
  setThemePreference,
  subscribeToTheme,
  THEME,
  type ThemePreference
} from '@/lib/theme'

const languages = Object.keys(resources)

const SUBMENU_OFFSET_PX = 8

const THEME_ICON = { light: Sun, dark: Moon, system: Monitor } as const

function isThemePreference(value: unknown): value is ThemePreference {
  return THEME.preferences.some((preference) => preference === value)
}

function LanguageSubmenu() {
  const { t, i18n } = useTranslation()
  const current = i18n.resolvedLanguage ?? i18n.language
  return (
    <MenuSub>
      <MenuSubTrigger>
        <Languages />
        <span>{t('language.label')}</span>
        <span className="ms-auto text-muted-foreground text-xs">
          {t(`language.names.${current}`, { defaultValue: current })}
        </span>
      </MenuSubTrigger>
      <MenuSubPopup sideOffset={SUBMENU_OFFSET_PX}>
        <MenuRadioGroup
          value={current}
          onValueChange={(language) => void i18n.changeLanguage(String(language))}
        >
          {languages.map((language) => (
            <MenuRadioItem key={language} value={language}>
              {t(`language.names.${language}`)}
            </MenuRadioItem>
          ))}
        </MenuRadioGroup>
      </MenuSubPopup>
    </MenuSub>
  )
}

function ThemeSubmenu() {
  const { t } = useTranslation()
  const preference = useSyncExternalStore(subscribeToTheme, getThemePreference)
  const Icon = THEME_ICON[preference]
  return (
    <MenuSub>
      <MenuSubTrigger>
        <Icon />
        <span>{t('theme.label')}</span>
        <span className="ms-auto text-muted-foreground text-xs">
          {t(`theme.options.${preference}`)}
        </span>
      </MenuSubTrigger>
      <MenuSubPopup sideOffset={SUBMENU_OFFSET_PX}>
        <MenuRadioGroup
          value={preference}
          onValueChange={(value) => {
            if (isThemePreference(value)) setThemePreference(value)
          }}
        >
          {THEME.preferences.map((option) => (
            <MenuRadioItem key={option} value={option}>
              {t(`theme.options.${option}`)}
            </MenuRadioItem>
          ))}
        </MenuRadioGroup>
      </MenuSubPopup>
    </MenuSub>
  )
}

function useSignOut() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const { data: session } = useQuery(authSessionQuery)
  const mutation = useMutation({
    ...signOutMutation,
    onSuccess: async () => {
      queryClient.clear()
      await navigate({ to: AUTH.signInPath })
    }
  })
  const kind = session?.signOut ?? AUTH.signOut.none
  if (kind === AUTH.signOut.none) return null
  return () =>
    kind === AUTH.signOut.access ? window.location.assign(AUTH.accessLogoutPath) : mutation.mutate()
}

function displayName(user: { name: string; email: string } | undefined, fallback: string) {
  return user?.name || user?.email || fallback
}

export function NavUser() {
  const { t } = useTranslation()
  const signOut = useSignOut()
  const { isMobile } = useSidebar()
  const { data: user } = useQuery(currentUserQuery)
  const name = displayName(user, t('user.name'))
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <Menu>
          <MenuTrigger
            render={
              <SidebarMenuButton
                size="lg"
                className="data-popup-open:bg-sidebar-accent data-popup-open:text-sidebar-accent-foreground"
              />
            }
          >
            <UserAvatar name={user?.name} email={user?.email} decorative className="size-8" />
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">{name}</span>
              {user?.name && (
                <span className="truncate text-muted-foreground text-xs">{user.email}</span>
              )}
            </div>
            <ChevronsUpDown className="ml-auto size-4" />
          </MenuTrigger>
          <MenuPopup
            className="min-w-56"
            side={isMobile ? 'bottom' : 'right'}
            align="end"
            sideOffset={4}
          >
            <LanguageSubmenu />
            <ThemeSubmenu />
            {signOut && (
              <>
                <MenuSeparator />
                <MenuItem onClick={signOut}>
                  <LogOut />
                  {t('user.signOut')}
                </MenuItem>
              </>
            )}
          </MenuPopup>
        </Menu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
