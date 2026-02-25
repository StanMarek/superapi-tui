import { useState, useCallback, useEffect, useRef } from 'react'
import type { ConfigData, SavedAuth, SavedServer, Preferences } from '@/config/index.js'
import { DEFAULT_CONFIG, DEFAULT_PREFERENCES, loadConfig, saveConfig, matchServerAuth, normalizeUrl } from '@/config/index.js'

export interface ConfigState {
  readonly config: ConfigData | null
  readonly isLoading: boolean
  readonly saveServerAuth: (name: string, url: string, auth?: SavedAuth, swaggerEndpointUrl?: string) => Promise<boolean>
  readonly findAuthForServer: (specServerUrl: string) => SavedAuth | null
  readonly preferences: Preferences
}

export function useConfig(): ConfigState {
  const [config, setConfig] = useState<ConfigData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const configRef = useRef<ConfigData | null>(null)

  useEffect(() => {
    let cancelled = false

    loadConfig()
      .then(data => {
        if (cancelled) return
        configRef.current = data
        setConfig(data)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        console.warn('superapi-tui: unexpected error loading config:', err instanceof Error ? err.message : String(err))
        configRef.current = DEFAULT_CONFIG
        setConfig(DEFAULT_CONFIG)
      })
      .finally(() => {
        if (cancelled) return
        setIsLoading(false)
      })

    return () => { cancelled = true }
  }, [])

  const saveServerAuth = useCallback(async (name: string, url: string, auth?: SavedAuth, swaggerEndpointUrl?: string): Promise<boolean> => {
    const current = configRef.current ?? DEFAULT_CONFIG
    const normalizedUrl = normalizeUrl(url)

    const existingIndex = current.servers.findIndex(
      s => s.url !== undefined && normalizeUrl(s.url) === normalizedUrl,
    )

    const serverEntry: SavedServer = {
      name,
      ...(swaggerEndpointUrl !== undefined ? { swaggerEndpointUrl } : {}),
      url,
      ...(auth !== undefined ? { auth } : {}),
    }

    let updatedServers: typeof current.servers
    if (existingIndex >= 0) {
      const mutableServers = [...current.servers]
      mutableServers[existingIndex] = serverEntry
      updatedServers = mutableServers
    } else {
      updatedServers = [...current.servers, serverEntry]
    }

    const updated: ConfigData = {
      ...current,
      servers: updatedServers,
    }

    configRef.current = updated
    setConfig(updated)

    try {
      await saveConfig(updated)
      return true
    } catch (err) {
      console.warn('superapi-tui: failed to save config:', err instanceof Error ? err.message : String(err))
      return false
    }
  }, [])

  const findAuthForServer = useCallback((specServerUrl: string): SavedAuth | null => {
    const current = configRef.current
    if (!current) return null
    return matchServerAuth(current.servers, specServerUrl)
  }, [])

  const preferences = config?.preferences ?? DEFAULT_PREFERENCES

  return {
    config,
    isLoading,
    saveServerAuth,
    findAuthForServer,
    preferences,
  }
}
