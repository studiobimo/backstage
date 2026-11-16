import { ROLE } from '@studiobimo/backstage/internal'
import { useSuspenseQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'

import { PageHeader } from '@/components/page-header'

import { InviteForm } from './invite-form'
import { currentUserQuery, usersQuery } from './queries'
import { UsersTable } from './users-table'

export function UsersPage() {
  const { t } = useTranslation('users')
  const { data: users } = useSuspenseQuery(usersQuery)
  const { data: me } = useSuspenseQuery(currentUserQuery)
  const canManage = me.role === ROLE.owner
  return (
    <>
      <PageHeader
        title={t('title')}
        description={canManage ? t('description.owner') : t('description.editor')}
      />
      {canManage && <InviteForm />}
      <UsersTable users={users} currentUserId={me.id} canManage={canManage} />
    </>
  )
}
