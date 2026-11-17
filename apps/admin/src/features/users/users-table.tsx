import { roleSchema, type User } from '@studiobimo/backstage/internal'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Trash2Icon } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { CardTable } from '@/components/card-table'
import { OptionSelect } from '@/components/choice-select'
import { DeleteDialog } from '@/components/delete-dialog'
import { IconButton } from '@/components/icon-button'
import { Badge } from '@/components/ui/badge'
import { TableCell, TableHead, TableRow } from '@/components/ui/table'
import { toastManager } from '@/components/ui/toast'
import { useApiErrorMessage } from '@/lib/api-feedback'
import { CONTROL_WIDTH } from '@/lib/content-width'
import { cn } from '@/lib/utils'

import { changeRoleMutation, removeUserMutation } from './queries'
import { useRoleOptions } from './role-options'

interface UsersTableProps {
  users: User[]
  currentUserId: string
  canManage: boolean
}

function UserCell({ user, isSelf }: { user: User; isSelf: boolean }) {
  const { t } = useTranslation('users')
  return (
    <TableCell className="w-full max-w-0">
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="truncate font-medium">{user.email}</span>
        {(isSelf || user.name) && (
          <span className="flex min-w-0 items-center gap-2 text-muted-foreground text-sm">
            {isSelf && <Badge variant="outline">{t('list.you')}</Badge>}
            {user.name && <span className="truncate">{user.name}</span>}
          </span>
        )}
      </div>
    </TableCell>
  )
}

function RoleCell({ user, canManage }: { user: User; canManage: boolean }) {
  const { t } = useTranslation('users')
  const messageOf = useApiErrorMessage()
  const options = useRoleOptions()
  const change = useMutation(changeRoleMutation(useQueryClient()))
  if (!canManage) return <TableCell>{t(`role.${user.role}`)}</TableCell>
  return (
    <TableCell>
      <OptionSelect
        label={t('list.roleOf', { email: user.email })}
        value={user.role}
        options={options}
        disabled={change.isPending}
        className={CONTROL_WIDTH.compact}
        onChange={(next) => {
          const role = roleSchema.safeParse(next)
          if (!role.success || role.data === user.role) return
          change.mutate(
            { id: user.id, role: role.data },
            {
              onError: (error) =>
                toastManager.add({
                  type: 'error',
                  title: t('role.failed'),
                  description: messageOf(error)
                })
            }
          )
        }}
      />
    </TableCell>
  )
}

function RemoveCell({ user }: { user: User }) {
  const { t } = useTranslation('users')
  const [open, setOpen] = useState(false)
  const remove = useMutation(removeUserMutation(useQueryClient()))
  return (
    <TableCell className={cn(CONTROL_WIDTH.rowAction, 'text-end')}>
      <IconButton
        variant="ghost"
        label={t('list.remove', { email: user.email })}
        onClick={() => setOpen(true)}
      >
        <Trash2Icon aria-hidden />
      </IconButton>
      <DeleteDialog
        id={user.id}
        remove={remove}
        open={open}
        onOpenChange={setOpen}
        title={t('remove.title')}
        description={
          <>
            <span className="block break-all font-medium text-foreground">{user.email}</span>
            {t('remove.description')}
          </>
        }
        cancelLabel={t('remove.cancel')}
        confirmLabel={t('remove.confirm')}
      />
    </TableCell>
  )
}

export function UsersTable({ users, currentUserId, canManage }: UsersTableProps) {
  const { t } = useTranslation('users')
  return (
    <CardTable
      title={t('list.heading')}
      description={t('list.description')}
      head={
        <>
          <TableHead>{t('list.person')}</TableHead>
          <TableHead>{t('list.role')}</TableHead>
          {canManage && (
            <TableHead className={CONTROL_WIDTH.rowAction}>
              <span className="sr-only">{t('list.actions')}</span>
            </TableHead>
          )}
        </>
      }
    >
      {users.map((user) => (
        <TableRow key={user.id}>
          <UserCell user={user} isSelf={user.id === currentUserId} />
          <RoleCell user={user} canManage={canManage} />
          {canManage && <RemoveCell user={user} />}
        </TableRow>
      ))}
    </CardTable>
  )
}
