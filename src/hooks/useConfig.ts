import { useState, useCallback, useEffect, useRef } from 'react'
import type { ConfigData, SavedAuth, Preferences } from '@/config/index.js'
import { DEFAULT_CONFIG, DEFAULT_PREFERENCES, loadConfig, saveConfig, matchServerAuth } from '@/config/index.js'

export interface ConfigState {
  readonly config: ConfigData | null
  readonly isLoading: boolean
  readonly saveServerAuth: (name: string, url: string, auth?: SavedAuth) => void
  readonly findAuthForServer: (specServerUrl: string) => SavedAuth | null
  readonly preferences: Preferences
}

function normalizeUrl(url: string): string {
  return url.replace(/\/+$/, '').toLowerCase()
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
      .catch(() => {
        if (cancelled) return
        configRef.current = DEFAULT_CONFIG
        setConfig(DEFAULT_CONFIG)
      })
      .finally(() => {
        if (cancelled) return
        setIsLoading(false)
      })

    return () => { cancelled = true }
  }, [])

  const saveServerAuth = useCallback((name: string, url: string, auth?: SavedAuth) => {
    const current = configRef.current ?? DEFAULT_CONFIG
    const normalizedUrl = normalizeUrl(url)

    const existingIndex = current.servers.findIndex(
      s => normalizeUrl(s.url) === normalizedUrl,
    )

    const serverEntry = auth ? { name, url, auth } : { name, url }

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

    saveConfig(updated).catch(err => {
      console.warn('superapi-tui: failed to save config:', err instanceof Error ? err.message : String(err))
    })
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
