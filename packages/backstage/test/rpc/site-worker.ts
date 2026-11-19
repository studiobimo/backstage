import type { AdminEntrypoint } from '../../src/admin/entrypoint.ts'
import { adminRpc, requestContextOf } from '../../src/site/rpc.ts'
import { PATH } from './paths.ts'

interface Env {
  ADMIN: Service<AdminEntrypoint>
}

const messageOf = (error: unknown) => (error instanceof Error ? error.message : String(error))

const respond = async (action: () => Promise<unknown>) => {
  try {
    return Response.json(await action())
  } catch (error) {
    return Response.json({ error: messageOf(error) }, { status: 500 })
  }
}

export default {
  fetch(request, env) {
    const { pathname } = new URL(request.url)
    if (pathname === PATH.invalidContext) {
      const unvalidated = { ip: 42, country: 'ESP' } as unknown as { ip: string; country: string }
      return respond(() => env.ADMIN.ping(unvalidated))
    }
    if (pathname === PATH.http) {
      return respond(async () => (await env.ADMIN.fetch(request)).status)
    }
    return respond(() => adminRpc(env.ADMIN).ping(requestContextOf(request)))
  }
} satisfies ExportedHandler<Env>
