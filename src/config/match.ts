import type { SavedServer, SavedAuth } from './types.js'

export function normalizeUrl(url: string): string {
  return url.replace(/\/+$/, '').toLowerCase()
}

export function matchServerAuth(
  savedServers: readonly SavedServer[],
  specServerUrl: string,
): SavedAuth | null {
  const normalized = normalizeUrl(specServerUrl)

  for (const server of savedServers) {
    if (normalizeUrl(server.url) === normalized) {
      return server.auth ?? null
    }
  }

  return null
}
