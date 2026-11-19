import { createAdminEntrypoint } from '../../src/admin/entrypoint.ts'
import { defineRegistry } from '../../src/blocks.ts'

export const AdminEntrypoint = createAdminEntrypoint(defineRegistry([]))

export default {
  fetch: () => new Response('admin default fetch')
} satisfies ExportedHandler
