import type { ServerInfo, RequestOptions, HttpResponse } from '@/types/index.js'
import { HttpRequestError } from '@/types/index.js'

const LOCALHOST_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]'])

export function resolveServerUrl(server: ServerInfo): string {
  return server.url.replace(/\{([^}]+)\}/g, (_match, name: string) => {
    const variable = server.variables.get(name)
    return variable !== undefined ? variable.defaultValue : `{${name}}`
  })
}

export function buildRequestUrl(
  serverUrl: string,
  path: string,
  pathParams: ReadonlyMap<string, string>,
): string {
  const resolvedPath = path.replace(/\{([^}]+)\}/g, (_match, name: string) => {
    const value = pathParams.get(name)
    return value !== undefined ? encodeURIComponent(value) : `{${name}}`
  })

  const needsSlashTrim = serverUrl.endsWith('/') && resolvedPath.startsWith('/')
  return needsSlashTrim ? serverUrl.slice(0, -1) + resolvedPath : serverUrl + resolvedPath
}

export function validateSsrf(url: string): void {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch (error) {
    throw new HttpRequestError(`Invalid URL: ${url}`, error)
  }

  if (parsed.protocol === 'https:') {
    return
  }

  if (parsed.protocol === 'http:') {
    if (LOCALHOST_HOSTS.has(parsed.hostname)) {
      return
    }
    throw new HttpRequestError(
      `HTTP requests are only allowed to localhost. Refusing to connect to: ${parsed.hostname}`,
    )
  }

  throw new HttpRequestError(`Unsupported protocol: ${parsed.protocol}`)
}

export async function sendRequest(options: RequestOptions): Promise<HttpResponse> {
  validateSsrf(options.url)

  const start = performance.now()

  let response: Response
  try {
    response = await fetch(options.url, {
      method: options.method.toUpperCase(),
      headers: Object.fromEntries(options.headers),
      body: options.body,
    })
  } catch (error) {
    if (error instanceof HttpRequestError) {
      throw error
    }
    throw new HttpRequestError('Request failed', error)
  }

  const durationMs = Math.round(performance.now() - start)

  let body: string
  try {
    body = await response.text()
  } catch (error) {
    throw new HttpRequestError('Failed to read response body', error)
  }

  const headers = new Map<string, string>()
  response.headers.forEach((value, key) => {
    headers.set(key, value)
  })

  return {
    status: response.status,
    statusText: response.statusText,
    headers,
    body,
    durationMs,
  }
}
