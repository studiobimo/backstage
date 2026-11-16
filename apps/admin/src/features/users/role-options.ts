import { ROLES } from '@studiobimo/backstage/internal'
import { useTranslation } from 'react-i18next'

export function useRoleOptions() {
  const { t } = useTranslation('users')
  return ROLES.map((role) => ({ value: role, label: t(`role.${role}`) }))
}
