import { homedir } from 'node:os'
import { join } from 'node:path'
import type { ConfigData, SavedServer, SavedAuth, Preferences } from './types.js'
import { DEFAULT_CONFIG, DEFAULT_PREFERENCES } from './types.js'
import { ConfigError } from './errors.js'

export function getConfigPath(): string {
  return join(homedir(), '.superapi-tui.json')
}

export async function loadConfig(configPath?: string): Promise<ConfigData> {
  const path = configPath ?? getConfigPath()

  try {
    const file = Bun.file(path)
    const exists = await file.exists()
    if (!exists) {
      return DEFAULT_CONFIG
    }

    const text = await file.text()
    let raw: unknown
    try {
      raw = JSON.parse(text)
    } catch {
      console.warn(`superapi-tui: invalid JSON in config file ${path}, using defaults`)
      return DEFAULT_CONFIG
    }

    return parseConfigData(raw)
  } catch (err) {
    if (err instanceof ConfigError) throw err
    console.warn(`superapi-tui: failed to read config file ${path}, using defaults`)
    return DEFAULT_CONFIG
  }
}

export async function saveConfig(data: ConfigData, configPath?: string): Promise<void> {
  const path = configPath ?? getConfigPath()

  try {
    await Bun.write(path, JSON.stringify(data, null, 2) + '\n')
  } catch (err) {
    throw new ConfigError(`Failed to write config file: ${path}`, err)
  }
}

function parseConfigData(raw: unknown): ConfigData {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    console.warn('superapi-tui: config root is not an object, using defaults')
    return DEFAULT_CONFIG
  }

  const obj = raw as Record<string, unknown>

  return {
    servers: parseServers(obj['servers']),
    preferences: parsePreferences(obj['preferences']),
  }
}

function parseServers(raw: unknown): readonly SavedServer[] {
  if (!Array.isArray(raw)) {
    return []
  }

  const servers: SavedServer[] = []
  for (const entry of raw) {
    const server = parseSavedServer(entry)
    if (server) {
      servers.push(server)
    }
  }
  return servers
}

function parseSavedServer(raw: unknown): SavedServer | null {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    console.warn('superapi-tui: skipping non-object server entry')
    return null
  }

  const obj = raw as Record<string, unknown>

  if (typeof obj['name'] !== 'string' || obj['name'].length === 0) {
    console.warn('superapi-tui: skipping server entry missing name')
    return null
  }

  if (typeof obj['url'] !== 'string' || obj['url'].length === 0) {
    console.warn('superapi-tui: skipping server entry missing url')
    return null
  }

  const auth = obj['auth'] !== undefined ? parseSavedAuth(obj['auth']) : undefined

  return {
    name: obj['name'],
    url: obj['url'],
    ...(auth !== undefined ? { auth } : {}),
  }
}

function parseSavedAuth(raw: unknown): SavedAuth | undefined {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    console.warn('superapi-tui: skipping non-object auth entry')
    return undefined
  }

  const obj = raw as Record<string, unknown>
  const method = obj['method']

  switch (method) {
    case 'bearer': {
      const token = typeof obj['token'] === 'string' ? obj['token'] : ''
      return { method: 'bearer', token }
    }
    case 'apiKey': {
      const key = typeof obj['key'] === 'string' ? obj['key'] : ''
      const paramName = typeof obj['paramName'] === 'string' ? obj['paramName'] : ''
      const location = obj['location'] === 'query' ? 'query' as const : 'header' as const
      return { method: 'apiKey', key, paramName, location }
    }
    case 'basic': {
      const username = typeof obj['username'] === 'string' ? obj['username'] : ''
      const password = typeof obj['password'] === 'string' ? obj['password'] : ''
      return { method: 'basic', username, password }
    }
    default: {
      console.warn(`superapi-tui: unknown auth method '${String(method)}', skipping`)
      return undefined
    }
  }
}

const VALID_RESPONSE_TABS = new Set(['pretty', 'raw', 'headers'])

function parsePreferences(raw: unknown): Preferences {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    return DEFAULT_PREFERENCES
  }

  const obj = raw as Record<string, unknown>

  const tab = obj['defaultResponseTab']
  if (typeof tab === 'string' && VALID_RESPONSE_TABS.has(tab)) {
    return { defaultResponseTab: tab as Preferences['defaultResponseTab'] }
  }

  if (tab !== undefined) {
    console.warn(`superapi-tui: invalid defaultResponseTab '${String(tab)}', using default`)
  }

  return DEFAULT_PREFERENCES
}
