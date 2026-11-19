import { UserRound } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { initialsOf } from '@/lib/initials'
import { cn } from '@/lib/utils'

const AVATAR_ROLE = 'img'

interface UserAvatarProps {
  name?: string | null
  email?: string | null
  decorative?: boolean
  className?: string
}

export function UserAvatar({ name, email, decorative = false, className }: UserAvatarProps) {
  const { t } = useTranslation()
  const label = name?.trim() || email?.trim() || t('userAvatar.unknown')
  const initials = initialsOf(name, email)
  return (
    <Avatar
      className={cn('size-6 rounded-lg', className)}
      aria-hidden={decorative || undefined}
      aria-label={decorative ? undefined : label}
      role={decorative ? undefined : AVATAR_ROLE}
    >
      <AvatarFallback className="rounded-lg text-foreground">
        {initials || <UserRound aria-hidden className="size-[60%]" />}
      </AvatarFallback>
    </Avatar>
  )
}
