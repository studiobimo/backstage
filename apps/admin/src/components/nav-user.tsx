import { AUTH } from '@studiobimo/backstage/internal'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { Bell, ChevronsUpDown, LogOut, UserRound } from 'lucide-react'
import { useSyncExternalStore } from 'react'
import { useTranslation } from 'react-i18next'

import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Menu,
  MenuGroup,
  MenuGroupLabel,
  MenuItem,
  MenuPopup,
  MenuRadioGroup,
  MenuRadioItem,
  MenuSeparator,
  MenuTrigger
} from '@/components/ui/menu'
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar
} from '@/components/ui/sidebar'
import { authSessionQuery, signOutMutation } from '@/features/auth/queries'
import { resources } from '@/i18n/config'
import {
  getThemePreference,
  setThemePreference,
  subscribeToTheme,
  THEME,
  type ThemePreference
} from '@/lib/theme'

const languages = Object.keys(resources)

function isThemePreference(value: unknown): value is ThemePreference {
  return THEME.preferences.some((preference) => preference === value)
}

function LanguageMenuGroup() {
  const { t, i18n } = useTranslation()
  return (
    <MenuGroup>
      <MenuGroupLabel>{t('language.label')}</MenuGroupLabel>
      <MenuRadioGroup
        value={i18n.resolvedLanguage}
        onValueChange={(language) => void i18n.changeLanguage(String(language))}
      >
        {languages.map((language) => (
          <MenuRadioItem key={language} value={language}>
            {t(`language.names.${language}`)}
          </MenuRadioItem>
        ))}
      </MenuRadioGroup>
    </MenuGroup>
  )
}

function ThemeMenuGroup() {
  const { t } = useTranslation()
  const preference = useSyncExternalStore(subscribeToTheme, getThemePreference)
  return (
    <MenuGroup>
      <MenuGroupLabel>{t('theme.label')}</MenuGroupLabel>
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
    </MenuGroup>
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
  return { enabled: session?.mode === AUTH.mode.magicLink, run: () => mutation.mutate() }
}

export function NavUser() {
  const { t } = useTranslation()
  const signOut = useSignOut()
  const { isMobile } = useSidebar()
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
            <Avatar className="rounded-lg">
              <AvatarFallback className="rounded-lg">
                <UserRound className="size-4" />
              </AvatarFallback>
            </Avatar>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">{t('user.name')}</span>
            </div>
            <ChevronsUpDown className="ml-auto size-4" />
          </MenuTrigger>
          <MenuPopup
            className="min-w-56"
            side={isMobile ? 'bottom' : 'right'}
            align="end"
            sideOffset={4}
          >
            <LanguageMenuGroup />
            <MenuSeparator />
            <ThemeMenuGroup />
            <MenuSeparator />
            <MenuItem disabled>
              <Bell />
              {t('user.notifications')}
            </MenuItem>
            <MenuSeparator />
            <MenuItem disabled={!signOut.enabled} onClick={signOut.run}>
              <LogOut />
              {t('user.signOut')}
            </MenuItem>
          </MenuPopup>
        </Menu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
