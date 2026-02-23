import { describe, test, expect, beforeEach, afterEach, spyOn } from 'bun:test'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { mkdtemp, rm } from 'node:fs/promises'
import { loadConfig, saveConfig } from '@/config/io.js'
import { DEFAULT_CONFIG } from '@/config/types.js'
import { ConfigError } from '@/config/errors.js'

let tempDir: string
let configPath: string
let warnSpy: ReturnType<typeof spyOn>

beforeEach(async () => {
  tempDir = await mkdtemp(join(tmpdir(), 'superapi-config-'))
  configPath = join(tempDir, 'config.json')
  warnSpy = spyOn(console, 'warn').mockImplementation(() => {})
})

afterEach(async () => {
  warnSpy.mockRestore()
  await rm(tempDir, { recursive: true, force: true })
})

describe('loadConfig', () => {
  test('returns defaults when file does not exist', async () => {
    const result = await loadConfig(configPath)
    expect(result).toEqual(DEFAULT_CONFIG)
  })

  test('parses valid config', async () => {
    const data = {
      servers: [
        { name: 'dev', url: 'https://dev.example.com', auth: { method: 'bearer', token: 'abc' } },
      ],
      preferences: { defaultResponseTab: 'raw' },
    }
    await Bun.write(configPath, JSON.stringify(data))

    const result = await loadConfig(configPath)

    expect(result.servers).toHaveLength(1)
    expect(result.servers[0]!.name).toBe('dev')
    expect(result.servers[0]!.url).toBe('https://dev.example.com')
    expect(result.servers[0]!.auth).toEqual({ method: 'bearer', token: 'abc' })
    expect(result.preferences.defaultResponseTab).toBe('raw')
  })

  test('returns defaults for invalid JSON', async () => {
    await Bun.write(configPath, '{not valid json')

    const result = await loadConfig(configPath)

    expect(result).toEqual(DEFAULT_CONFIG)
    expect(warnSpy).toHaveBeenCalled()
  })

  test('returns defaults for non-object root', async () => {
    await Bun.write(configPath, '"just a string"')

    const result = await loadConfig(configPath)

    expect(result).toEqual(DEFAULT_CONFIG)
    expect(warnSpy).toHaveBeenCalled()
  })

  test('returns defaults for array root', async () => {
    await Bun.write(configPath, '[1, 2, 3]')

    const result = await loadConfig(configPath)

    expect(result).toEqual(DEFAULT_CONFIG)
    expect(warnSpy).toHaveBeenCalled()
  })

  test('skips server entries missing name', async () => {
    const data = {
      servers: [
        { url: 'https://example.com' },
        { name: 'valid', url: 'https://valid.com' },
      ],
    }
    await Bun.write(configPath, JSON.stringify(data))

    const result = await loadConfig(configPath)

    expect(result.servers).toHaveLength(1)
    expect(result.servers[0]!.name).toBe('valid')
    expect(warnSpy).toHaveBeenCalled()
  })

  test('skips server entries missing url', async () => {
    const data = {
      servers: [
        { name: 'no-url' },
        { name: 'valid', url: 'https://valid.com' },
      ],
    }
    await Bun.write(configPath, JSON.stringify(data))

    const result = await loadConfig(configPath)

    expect(result.servers).toHaveLength(1)
    expect(result.servers[0]!.name).toBe('valid')
  })

  test('skips server entries with empty name', async () => {
    const data = {
      servers: [{ name: '', url: 'https://example.com' }],
    }
    await Bun.write(configPath, JSON.stringify(data))

    const result = await loadConfig(configPath)

    expect(result.servers).toHaveLength(0)
  })

  test('skips server entries with empty url', async () => {
    const data = {
      servers: [{ name: 'test', url: '' }],
    }
    await Bun.write(configPath, JSON.stringify(data))

    const result = await loadConfig(configPath)

    expect(result.servers).toHaveLength(0)
  })

  test('parses bearer auth', async () => {
    const data = {
      servers: [{ name: 'api', url: 'https://api.com', auth: { method: 'bearer', token: 'my-token' } }],
    }
    await Bun.write(configPath, JSON.stringify(data))

    const result = await loadConfig(configPath)
    const auth = result.servers[0]!.auth!

    expect(auth.method).toBe('bearer')
    if (auth.method === 'bearer') {
      expect(auth.token).toBe('my-token')
    }
  })

  test('parses apiKey auth', async () => {
    const data = {
      servers: [{
        name: 'api',
        url: 'https://api.com',
        auth: { method: 'apiKey', key: 'secret', paramName: 'X-API-Key', location: 'header' },
      }],
    }
    await Bun.write(configPath, JSON.stringify(data))

    const result = await loadConfig(configPath)
    const auth = result.servers[0]!.auth!

    expect(auth.method).toBe('apiKey')
    if (auth.method === 'apiKey') {
      expect(auth.key).toBe('secret')
      expect(auth.paramName).toBe('X-API-Key')
      expect(auth.location).toBe('header')
    }
  })

  test('parses apiKey auth with query location', async () => {
    const data = {
      servers: [{
        name: 'api',
        url: 'https://api.com',
        auth: { method: 'apiKey', key: 'secret', paramName: 'api_key', location: 'query' },
      }],
    }
    await Bun.write(configPath, JSON.stringify(data))

    const result = await loadConfig(configPath)
    const auth = result.servers[0]!.auth!

    if (auth.method === 'apiKey') {
      expect(auth.location).toBe('query')
    }
  })

  test('parses basic auth', async () => {
    const data = {
      servers: [{
        name: 'api',
        url: 'https://api.com',
        auth: { method: 'basic', username: 'user', password: 'pass' },
      }],
    }
    await Bun.write(configPath, JSON.stringify(data))

    const result = await loadConfig(configPath)
    const auth = result.servers[0]!.auth!

    expect(auth.method).toBe('basic')
    if (auth.method === 'basic') {
      expect(auth.username).toBe('user')
      expect(auth.password).toBe('pass')
    }
  })

  test('skips unknown auth method', async () => {
    const data = {
      servers: [{ name: 'api', url: 'https://api.com', auth: { method: 'oauth2' } }],
    }
    await Bun.write(configPath, JSON.stringify(data))

    const result = await loadConfig(configPath)

    expect(result.servers[0]!.auth).toBeUndefined()
    expect(warnSpy).toHaveBeenCalled()
  })

  test('server without auth field has no auth', async () => {
    const data = {
      servers: [{ name: 'api', url: 'https://api.com' }],
    }
    await Bun.write(configPath, JSON.stringify(data))

    const result = await loadConfig(configPath)

    expect(result.servers[0]!.auth).toBeUndefined()
  })

  test('uses default preferences for invalid defaultResponseTab', async () => {
    const data = {
      preferences: { defaultResponseTab: 'invalid' },
    }
    await Bun.write(configPath, JSON.stringify(data))

    const result = await loadConfig(configPath)

    expect(result.preferences.defaultResponseTab).toBe('pretty')
    expect(warnSpy).toHaveBeenCalled()
  })

  test('uses default preferences when preferences is not an object', async () => {
    const data = { preferences: 'nope' }
    await Bun.write(configPath, JSON.stringify(data))

    const result = await loadConfig(configPath)

    expect(result.preferences.defaultResponseTab).toBe('pretty')
  })

  test('uses default preferences for headers tab', async () => {
    const data = { preferences: { defaultResponseTab: 'headers' } }
    await Bun.write(configPath, JSON.stringify(data))

    const result = await loadConfig(configPath)

    expect(result.preferences.defaultResponseTab).toBe('headers')
  })

  test('handles non-array servers gracefully', async () => {
    const data = { servers: 'not-an-array' }
    await Bun.write(configPath, JSON.stringify(data))

    const result = await loadConfig(configPath)

    expect(result.servers).toEqual([])
  })

  test('skips non-object server entries', async () => {
    const data = { servers: ['string', 42, null, { name: 'ok', url: 'https://ok.com' }] }
    await Bun.write(configPath, JSON.stringify(data))

    const result = await loadConfig(configPath)

    expect(result.servers).toHaveLength(1)
    expect(result.servers[0]!.name).toBe('ok')
  })

  test('skips non-object auth entry', async () => {
    const data = {
      servers: [{ name: 'api', url: 'https://api.com', auth: 'not-object' }],
    }
    await Bun.write(configPath, JSON.stringify(data))

    const result = await loadConfig(configPath)

    expect(result.servers[0]!.auth).toBeUndefined()
  })

  test('empty object returns defaults', async () => {
    await Bun.write(configPath, '{}')

    const result = await loadConfig(configPath)

    expect(result.servers).toEqual([])
    expect(result.preferences.defaultResponseTab).toBe('pretty')
  })
})

describe('saveConfig', () => {
  test('writes config to file', async () => {
    const data = {
      servers: [{ name: 'prod', url: 'https://prod.api.com', auth: { method: 'bearer' as const, token: 'xyz' } }],
      preferences: { defaultResponseTab: 'raw' as const },
    }

    await saveConfig(data, configPath)

    const written = await Bun.file(configPath).text()
    const parsed = JSON.parse(written)
    expect(parsed.servers[0].name).toBe('prod')
    expect(parsed.preferences.defaultResponseTab).toBe('raw')
  })

  test('writes pretty-printed JSON with trailing newline', async () => {
    await saveConfig(DEFAULT_CONFIG, configPath)

    const written = await Bun.file(configPath).text()
    expect(written).toEndWith('\n')
    expect(written).toContain('  ')
  })

  test('throws ConfigError on write failure', async () => {
    const badPath = '/nonexistent-dir-12345/config.json'

    try {
      await saveConfig(DEFAULT_CONFIG, badPath)
      expect(true).toBe(false) // should not reach
    } catch (err) {
      expect(err).toBeInstanceOf(ConfigError)
      expect((err as ConfigError).message).toContain('Failed to write config file')
    }
  })
})
