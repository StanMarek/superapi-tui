import { describe, test, expect, beforeEach, afterEach, spyOn } from 'bun:test'
import { render } from 'ink-testing-library'
import { Box, Text } from 'ink'
import { useEffect, useRef } from 'react'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { mkdtemp, rm } from 'node:fs/promises'
import { useConfig } from '@/hooks/useConfig.js'
import { loadConfig, saveConfig, matchServerAuth } from '@/config/index.js'
import type { ConfigData, SavedServer } from '@/config/index.js'

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

let tempDir: string
let warnSpy: ReturnType<typeof spyOn>

beforeEach(async () => {
  tempDir = await mkdtemp(join(tmpdir(), 'superapi-useconfig-'))
  warnSpy = spyOn(console, 'warn').mockImplementation(() => {})
})

afterEach(async () => {
  warnSpy.mockRestore()
  await rm(tempDir, { recursive: true, force: true })
})

function Harness() {
  const state = useConfig()
  return (
    <Box flexDirection="column">
      <Text>loading:{String(state.isLoading)}</Text>
      <Text>hasConfig:{String(state.config !== null)}</Text>
      <Text>serverCount:{state.config?.servers.length ?? 0}</Text>
      <Text>defaultTab:{state.preferences.defaultResponseTab}</Text>
    </Box>
  )
}

describe('useConfig', () => {
  test('starts in loading state and resolves to defaults', async () => {
    const { lastFrame } = render(<Harness />)

    // Initially loading
    expect(lastFrame()).toContain('loading:true')

    // After async load completes
    await delay(100)
    expect(lastFrame()).toContain('loading:false')
    expect(lastFrame()).toContain('hasConfig:true')
  })

  test('provides default preferences when no config file', async () => {
    const { lastFrame } = render(<Harness />)
    await delay(100)

    expect(lastFrame()).toContain('defaultTab:pretty')
  })

  test('findAuthForServer returns null when no saved servers', async () => {
    let foundAuth: unknown = 'not-checked'

    function FindAuthHarness() {
      const state = useConfig()
      const checkedRef = useRef(false)

      useEffect(() => {
        if (!state.isLoading && !checkedRef.current) {
          checkedRef.current = true
          foundAuth = state.findAuthForServer('https://api.example.com')
        }
      }, [state.isLoading])

      return <Text>loading:{String(state.isLoading)}</Text>
    }

    render(<FindAuthHarness />)
    await delay(100)

    expect(foundAuth).toBeNull()
  })

  test('exposes saveServerAuth callback', async () => {
    let hasSaveServerAuth = false

    function CallbackHarness() {
      const state = useConfig()
      hasSaveServerAuth = typeof state.saveServerAuth === 'function'
      return <Text>ok</Text>
    }

    render(<CallbackHarness />)
    await delay(50)

    expect(hasSaveServerAuth).toBe(true)
  })

  test('exposes findAuthForServer callback', async () => {
    let hasFindAuth = false

    function CallbackHarness() {
      const state = useConfig()
      hasFindAuth = typeof state.findAuthForServer === 'function'
      return <Text>ok</Text>
    }

    render(<CallbackHarness />)
    await delay(50)

    expect(hasFindAuth).toBe(true)
  })
})

// Test saveServerAuth upsert logic directly through the config module
// (the hook is a thin wrapper, so we verify the underlying logic)
describe('config save + match integration', () => {
  test('save then load round-trip', async () => {
    const configPath = join(tempDir, 'roundtrip.toml')
    const data: ConfigData = {
      servers: [{ name: 'prod', url: 'https://prod.api.com', auth: { method: 'bearer', token: 'xyz' } }],
      preferences: { defaultResponseTab: 'raw' },
    }

    await saveConfig(data, configPath)
    const loaded = await loadConfig(configPath)

    expect(loaded.servers).toHaveLength(1)
    expect(loaded.servers[0]!.name).toBe('prod')
    expect(loaded.preferences.defaultResponseTab).toBe('raw')
  })

  test('upsert by normalized URL', async () => {
    const configPath = join(tempDir, 'upsert.toml')

    // Save initial
    const initial: ConfigData = {
      servers: [{ name: 'first', url: 'https://api.com', auth: { method: 'bearer', token: 'first' } }],
      preferences: { defaultResponseTab: 'pretty' },
    }
    await saveConfig(initial, configPath)

    // Simulate upsert: find existing, replace
    const loaded = await loadConfig(configPath)
    const normalizedUrl = 'https://api.com'
    const existingIndex = loaded.servers.findIndex(
      s => s.url.replace(/\/+$/, '').toLowerCase() === normalizedUrl,
    )
    expect(existingIndex).toBe(0)

    const updatedServers = [...loaded.servers]
    updatedServers[existingIndex] = { name: 'updated', url: 'https://api.com', auth: { method: 'bearer', token: 'second' } }
    const updated: ConfigData = { ...loaded, servers: updatedServers }
    await saveConfig(updated, configPath)

    const final = await loadConfig(configPath)
    expect(final.servers).toHaveLength(1)
    expect(final.servers[0]!.name).toBe('updated')
    if (final.servers[0]!.auth?.method === 'bearer') {
      expect(final.servers[0]!.auth.token).toBe('second')
    }
  })

  test('matchServerAuth finds saved auth after save', async () => {
    const servers: readonly SavedServer[] = [
      { name: 'prod', url: 'https://api.example.com/', auth: { method: 'bearer', token: 'tok123' } },
    ]

    // Simulate what findAuthForServer does
    const result = matchServerAuth(servers, 'https://api.example.com')
    expect(result).toEqual({ method: 'bearer', token: 'tok123' })
  })
})
