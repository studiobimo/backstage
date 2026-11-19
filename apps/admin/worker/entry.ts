import { createAdminEntrypoint } from '@studiobimo/backstage/admin/entrypoint'
import { registry } from 'backstage-site/registry'

export { default } from './index.ts'
export const AdminEntrypoint = createAdminEntrypoint(registry)
