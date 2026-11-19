export { AdminEntrypoint } from '../../src/admin/entrypoint.ts'

export default {
  fetch: () => new Response('admin default fetch')
} satisfies ExportedHandler
