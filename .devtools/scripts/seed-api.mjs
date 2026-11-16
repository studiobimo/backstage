export const ADMIN = {
  defaultUrl: 'http://localhost:5173',
  apiPath: '/api/v1',
  status: { forbidden: 403, noContent: 204 }
}

export class SeedError extends Error {}

const failureMessage = async (response, method, path) => {
  const detail = await response.text()
  return `${method} ${path} failed with ${response.status}: ${detail}`
}

const unreachableMessage = (baseUrl) =>
  `The admin is not reachable at ${baseUrl}. Start it with "make -C .devtools dev" or set ADMIN_URL.`

const devAuthMessage = (baseUrl) =>
  `The admin at ${baseUrl} refused the request. Set DEV_AUTH=true in apps/admin/.dev.vars and restart it.`

export const connect = (baseUrl = process.env.ADMIN_URL ?? ADMIN.defaultUrl) => {
  const request = async (method, path, body) => {
    const response = await fetch(`${baseUrl}${ADMIN.apiPath}${path}`, {
      method,
      headers: {
        origin: baseUrl,
        ...(body === undefined ? {} : { 'content-type': 'application/json' })
      },
      body: body === undefined ? undefined : JSON.stringify(body)
    }).catch(() => {
      throw new SeedError(unreachableMessage(baseUrl))
    })
    if (response.status === ADMIN.status.forbidden) throw new SeedError(devAuthMessage(baseUrl))
    if (!response.ok) throw new SeedError(await failureMessage(response, method, path))
    return response.status === ADMIN.status.noContent ? null : response.json()
  }
  return { baseUrl, request }
}
