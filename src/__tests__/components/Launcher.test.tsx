import { describe, test, expect, mock, beforeEach, spyOn } from 'bun:test'
import { render } from 'ink-testing-library'
import { Launcher } from '@/components/Launcher.js'
import type { ConfigData } from '@/config/types.js'

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

const defaultConfig: ConfigData = {
  servers: [],
  preferences: { defaultResponseTab: 'pretty' },
}

const configWithServers: ConfigData = {
  servers: [
    { name: 'Pet Store', swaggerEndpointUrl: 'https://petstore.example.com/v3/api-docs', url: 'https://petstore.example.com' },
    { name: 'Users API', swaggerEndpointUrl: 'https://users.example.com/openapi.json' },
  ],
  preferences: { defaultResponseTab: 'pretty' },
}

const configWithLegacyServer: ConfigData = {
  servers: [
    { name: 'Legacy API', url: 'https://legacy.example.com/api-docs' },
  ],
  preferences: { defaultResponseTab: 'pretty' },
}

const mockLoadConfig = mock(() => Promise.resolve(defaultConfig))

beforeEach(() => {
  mockLoadConfig.mockClear()
  mockLoadConfig.mockResolvedValue(defaultConfig)
})

describe('Launcher', () => {
  test('shows spinner while loading config', () => {
    mockLoadConfig.mockReturnValue(new Promise(() => {}))
    const onSelect = mock(() => {})
    const { lastFrame } = render(
      <Launcher onSelect={onSelect} deps={{ loadConfig: mockLoadConfig }} />,
    )
    const frame = lastFrame()!
    expect(frame).toContain('superapi-tui')
    expect(frame).toContain('Loading config')
  })

  test('skips to text input when no saved servers', async () => {
    mockLoadConfig.mockResolvedValue(defaultConfig)
    const onSelect = mock(() => {})
    const { lastFrame } = render(
      <Launcher onSelect={onSelect} deps={{ loadConfig: mockLoadConfig }} />,
    )
    await delay(50)
    const frame = lastFrame()!
    expect(frame).toContain('Enter a spec URL or file path')
  })

  test('renders saved servers as Select options when config has servers', async () => {
    mockLoadConfig.mockResolvedValue(configWithServers)
    const onSelect = mock(() => {})
    const { lastFrame } = render(
      <Launcher onSelect={onSelect} deps={{ loadConfig: mockLoadConfig }} />,
    )
    await delay(50)
    const frame = lastFrame()!
    expect(frame).toContain('Select a server or enter a spec URL')
    expect(frame).toContain('Pet Store')
    expect(frame).toContain('petstore.example.com/v3/api-docs')
    expect(frame).toContain('Users API')
  })

  test('shows "Enter URL or file path" as last Select option', async () => {
    mockLoadConfig.mockResolvedValue(configWithServers)
    const onSelect = mock(() => {})
    const { lastFrame } = render(
      <Launcher onSelect={onSelect} deps={{ loadConfig: mockLoadConfig }} />,
    )
    await delay(50)
    const frame = lastFrame()!
    expect(frame).toContain('Enter URL or file path')
  })

  test('calls onSelect with swaggerEndpointUrl when a server is picked', async () => {
    mockLoadConfig.mockResolvedValue(configWithServers)
    const onSelect = mock(() => {})
    const { stdin } = render(
      <Launcher onSelect={onSelect} deps={{ loadConfig: mockLoadConfig }} />,
    )
    await delay(50)
    stdin.write('\r')
    await delay(50)
    expect(onSelect).toHaveBeenCalledTimes(1)
    const args = onSelect.mock.lastCall as unknown as [string, string | undefined]
    expect(args[0]).toBe('https://petstore.example.com/v3/api-docs')
    expect(args[1]).toBe('https://petstore.example.com')
  })

  test('transitions to text input when "Enter URL" option is selected', async () => {
    mockLoadConfig.mockResolvedValue(configWithServers)
    const onSelect = mock(() => {})
    const { lastFrame, stdin } = render(
      <Launcher onSelect={onSelect} deps={{ loadConfig: mockLoadConfig }} />,
    )
    await delay(50)
    stdin.write('\x1b[B')
    await delay(50)
    stdin.write('\x1b[B')
    await delay(50)
    stdin.write('\r')
    await delay(50)
    const frame = lastFrame()!
    expect(frame).toContain('Enter a spec URL or file path')
    expect(onSelect).not.toHaveBeenCalled()
  })

  test('calls onSelect with entered text on submit', async () => {
    mockLoadConfig.mockResolvedValue(defaultConfig)
    const onSelect = mock(() => {})
    const { stdin } = render(
      <Launcher onSelect={onSelect} deps={{ loadConfig: mockLoadConfig }} />,
    )
    await delay(50)
    stdin.write('https://example.com/api.json')
    await delay(50)
    stdin.write('\r')
    await delay(50)
    expect(onSelect).toHaveBeenCalledTimes(1)
    const args = onSelect.mock.lastCall as unknown as [string]
    expect(args[0]).toBe('https://example.com/api.json')
  })

  test('does not call onSelect for empty text input', async () => {
    mockLoadConfig.mockResolvedValue(defaultConfig)
    const onSelect = mock(() => {})
    const { stdin } = render(
      <Launcher onSelect={onSelect} deps={{ loadConfig: mockLoadConfig }} />,
    )
    await delay(50)
    stdin.write('\r')
    await delay(50)
    expect(onSelect).not.toHaveBeenCalled()
  })

  test('falls back to url when swaggerEndpointUrl missing', async () => {
    mockLoadConfig.mockResolvedValue(configWithLegacyServer)
    const onSelect = mock(() => {})
    const { stdin } = render(
      <Launcher onSelect={onSelect} deps={{ loadConfig: mockLoadConfig }} />,
    )
    await delay(50)
    stdin.write('\r')
    await delay(50)
    expect(onSelect).toHaveBeenCalledTimes(1)
    const args = onSelect.mock.lastCall as unknown as [string, string | undefined]
    expect(args[0]).toBe('https://legacy.example.com/api-docs')
    expect(args[1]).toBe('https://legacy.example.com/api-docs')
  })

  test('warns when falling back to url for loading', async () => {
    const warnSpy = spyOn(console, 'warn').mockImplementation(() => {})
    mockLoadConfig.mockResolvedValue(configWithLegacyServer)
    const onSelect = mock(() => {})
    const { stdin } = render(
      <Launcher onSelect={onSelect} deps={{ loadConfig: mockLoadConfig }} />,
    )
    await delay(50)
    stdin.write('\r')
    await delay(50)
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('falling back to url'),
    )
    warnSpy.mockRestore()
  })

  test('onSelect receives undefined savedRequestBaseUrl for swagger-only server', async () => {
    const singleSwaggerConfig: ConfigData = {
      servers: [
        { name: 'Swagger Only', swaggerEndpointUrl: 'https://swagger.example.com/docs' },
      ],
      preferences: { defaultResponseTab: 'pretty' },
    }
    mockLoadConfig.mockResolvedValue(singleSwaggerConfig)
    const onSelect = mock(() => {})
    const { stdin } = render(
      <Launcher onSelect={onSelect} deps={{ loadConfig: mockLoadConfig }} />,
    )
    await delay(50)
    stdin.write('\r')
    await delay(50)
    const args = onSelect.mock.lastCall as unknown as [string, string | undefined]
    expect(args[0]).toBe('https://swagger.example.com/docs')
    expect(args[1]).toBeUndefined()
  })
})
