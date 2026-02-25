import { describe, test, expect, beforeEach, afterEach, spyOn } from 'bun:test'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { mkdtemp, rm } from 'node:fs/promises'
import { loadConfig, saveConfig, getConfigPath, getJsonConfigPath } from '@/config/io.js'
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
  test('writes TOML config to file', async () => {
    const tomlPath = join(tempDir, 'config.toml')
    const data = {
      servers: [{ name: 'prod', url: 'https://prod.api.com', auth: { method: 'bearer' as const, token: 'xyz' } }],
      preferences: { defaultResponseTab: 'raw' as const },
    }

    await saveConfig(data, tomlPath)

    const written = await Bun.file(tomlPath).text()
    expect(written).toContain('[[servers]]')
    expect(written).toContain('name = "prod"')
    expect(written).toContain('method = "bearer"')
    expect(written).toContain('token = "xyz"')
  })

  test('writes TOML with trailing newline', async () => {
    const tomlPath = join(tempDir, 'config.toml')
    await saveConfig(DEFAULT_CONFIG, tomlPath)

    const written = await Bun.file(tomlPath).text()
    expect(written).toEndWith('\n')
  })

  test('TOML save then load round-trip', async () => {
    const tomlPath = join(tempDir, 'roundtrip.toml')
    const data = {
      servers: [
        { name: 'prod', url: 'https://prod.api.com', auth: { method: 'bearer' as const, token: 'xyz' } },
        { name: 'dev', url: 'https://dev.api.com' },
      ],
      preferences: { defaultResponseTab: 'headers' as const },
    }

    await saveConfig(data, tomlPath)
    const loaded = await loadConfig(tomlPath)

    expect(loaded.servers).toHaveLength(2)
    expect(loaded.servers[0]!.name).toBe('prod')
    expect(loaded.servers[0]!.auth).toEqual({ method: 'bearer', token: 'xyz' })
    expect(loaded.servers[1]!.name).toBe('dev')
    expect(loaded.servers[1]!.auth).toBeUndefined()
    expect(loaded.preferences.defaultResponseTab).toBe('headers')
  })

  test('writes JSON when path ends with .json', async () => {
    const jsonPath = join(tempDir, 'config.json')
    const data = {
      servers: [{ name: 'prod', url: 'https://prod.api.com', auth: { method: 'bearer' as const, token: 'xyz' } }],
      preferences: { defaultResponseTab: 'raw' as const },
    }

    await saveConfig(data, jsonPath)

    const written = await Bun.file(jsonPath).text()
    const parsed = JSON.parse(written)
    expect(parsed.servers[0].name).toBe('prod')
    expect(parsed.preferences.defaultResponseTab).toBe('raw')
  })

  test('JSON save then load round-trip via explicit path', async () => {
    const jsonPath = join(tempDir, 'roundtrip.json')
    const data = {
      servers: [
        { name: 'prod', url: 'https://prod.api.com', auth: { method: 'bearer' as const, token: 'xyz' } },
      ],
      preferences: { defaultResponseTab: 'headers' as const },
    }

    await saveConfig(data, jsonPath)
    const loaded = await loadConfig(jsonPath)

    expect(loaded.servers).toHaveLength(1)
    expect(loaded.servers[0]!.name).toBe('prod')
    expect(loaded.servers[0]!.auth).toEqual({ method: 'bearer', token: 'xyz' })
    expect(loaded.preferences.defaultResponseTab).toBe('headers')
  })

  test('throws ConfigError on write failure', async () => {
    const badPath = '/nonexistent-dir-12345/config.toml'

    try {
      await saveConfig(DEFAULT_CONFIG, badPath)
      expect(true).toBe(false)
    } catch (err) {
      expect(err).toBeInstanceOf(ConfigError)
      expect((err as ConfigError).message).toContain('Failed to write config file')
    }
  })
})

describe('getConfigPath', () => {
  test('returns TOML path in home directory', () => {
    const path = getConfigPath()
    expect(path).toEndWith('.superapi-tui.toml')
  })
})

describe('getJsonConfigPath', () => {
  test('returns JSON path in home directory', () => {
    const path = getJsonConfigPath()
    expect(path).toEndWith('.superapi-tui.json')
  })
})

describe('loadConfig TOML', () => {
  test('parses valid TOML config', async () => {
    const tomlPath = join(tempDir, 'config.toml')
    const toml = [
      '[[servers]]',
      'name = "dev"',
      'url = "https://dev.example.com"',
      '',
      '[servers.auth]',
      'method = "bearer"',
      'token = "abc"',
      '',
      '[preferences]',
      'defaultResponseTab = "raw"',
    ].join('\n')
    await Bun.write(tomlPath, toml)

    const result = await loadConfig(tomlPath)

    expect(result.servers).toHaveLength(1)
    expect(result.servers[0]!.name).toBe('dev')
    expect(result.servers[0]!.url).toBe('https://dev.example.com')
    expect(result.servers[0]!.auth).toEqual({ method: 'bearer', token: 'abc' })
    expect(result.preferences.defaultResponseTab).toBe('raw')
  })

  test('returns defaults for invalid TOML', async () => {
    const tomlPath = join(tempDir, 'bad.toml')
    await Bun.write(tomlPath, '[[invalid toml content {{{')

    const result = await loadConfig(tomlPath)

    expect(result).toEqual(DEFAULT_CONFIG)
    expect(warnSpy).toHaveBeenCalled()
  })

  test('parses all auth types from TOML', async () => {
    const tomlPath = join(tempDir, 'auth.toml')
    const toml = [
      '[[servers]]',
      'name = "bearer-api"',
      'url = "https://bearer.com"',
      '[servers.auth]',
      'method = "bearer"',
      'token = "tok"',
      '',
      '[[servers]]',
      'name = "apikey-api"',
      'url = "https://apikey.com"',
      '[servers.auth]',
      'method = "apiKey"',
      'key = "secret"',
      'paramName = "X-Key"',
      'location = "header"',
      '',
      '[[servers]]',
      'name = "basic-api"',
      'url = "https://basic.com"',
      '[servers.auth]',
      'method = "basic"',
      'username = "user"',
      'password = "pass"',
    ].join('\n')
    await Bun.write(tomlPath, toml)

    const result = await loadConfig(tomlPath)

    expect(result.servers).toHaveLength(3)
    expect(result.servers[0]!.auth).toEqual({ method: 'bearer', token: 'tok' })
    expect(result.servers[1]!.auth).toEqual({
      method: 'apiKey', key: 'secret', paramName: 'X-Key', location: 'header',
    })
    expect(result.servers[2]!.auth).toEqual({
      method: 'basic', username: 'user', password: 'pass',
    })
  })

  test('returns defaults when TOML file does not exist', async () => {
    const tomlPath = join(tempDir, 'nonexistent.toml')
    const result = await loadConfig(tomlPath)
    expect(result).toEqual(DEFAULT_CONFIG)
  })
})

describe('loadConfig fallback', () => {
  test('falls back to JSON when TOML absent', async () => {
    const tomlPath = join(tempDir, 'config.toml')
    const jsonPath = join(tempDir, 'config.json')
    await Bun.write(jsonPath, JSON.stringify({
      servers: [{ name: 'json-server', url: 'https://json.com' }],
    }))

    const result = await loadConfig(tomlPath, jsonPath)

    expect(result.servers).toHaveLength(1)
    expect(result.servers[0]!.name).toBe('json-server')
  })

  test('TOML takes precedence when both exist', async () => {
    const tomlPath = join(tempDir, 'config.toml')
    const jsonPath = join(tempDir, 'config.json')
    await Bun.write(tomlPath, [
      '[[servers]]',
      'name = "toml-server"',
      'url = "https://toml.com"',
    ].join('\n'))
    await Bun.write(jsonPath, JSON.stringify({
      servers: [{ name: 'json-server', url: 'https://json.com' }],
    }))

    const result = await loadConfig(tomlPath, jsonPath)

    expect(result.servers).toHaveLength(1)
    expect(result.servers[0]!.name).toBe('toml-server')
  })

  test('returns defaults when neither TOML nor JSON exist', async () => {
    const tomlPath = join(tempDir, 'missing.toml')
    const jsonPath = join(tempDir, 'missing.json')

    const result = await loadConfig(tomlPath, jsonPath)

    expect(result).toEqual(DEFAULT_CONFIG)
  })
})
