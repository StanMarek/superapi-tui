import { describe, it, expect } from 'bun:test'
import { render } from 'ink-testing-library'
import App from '../App.js'
import type { ParsedSpec } from '@/types/index.js'

const minimalSpec: ParsedSpec = {
  info: {
    title: 'Test API',
    version: '1.0.0',
    specVersion: '3.0.0',
  },
  servers: [],
  tagGroups: [
    {
      name: 'default',
      endpoints: [
        {
          id: 'get-/health',
          method: 'get',
          path: '/health',
          summary: 'Health check',
          tags: ['default'],
          deprecated: false,
          parameters: [],
          responses: [],
        },
      ],
    },
  ],
  endpoints: [
    {
      id: 'get-/health',
      method: 'get',
      path: '/health',
      summary: 'Health check',
      tags: ['default'],
      deprecated: false,
      parameters: [],
      responses: [],
    },
  ],
  tags: ['default'],
  securitySchemes: [],
  globalSecurity: [],
  componentSchemas: new Map(),
}

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

describe('App', () => {
  it('renders three panels', () => {
    const { lastFrame } = render(<App spec={minimalSpec} />)
    const frame = lastFrame()!
    expect(frame).toContain('Endpoints')
    expect(frame).toContain('Endpoint Detail')
    expect(frame).toContain('Request / Response')
  })

  it('renders endpoint list content', () => {
    const { lastFrame } = render(<App spec={minimalSpec} />)
    const frame = lastFrame()!
    expect(frame).toContain('GET')
    expect(frame).toContain('/health')
  })

  it('shows "No endpoint selected" in detail and request panels', () => {
    const { lastFrame } = render(<App spec={minimalSpec} />)
    const frame = lastFrame()!
    expect(frame).toContain('No endpoint selected')
  })

  describe('fullscreen', () => {
    it('f hides non-focused panels', async () => {
      const { lastFrame, stdin } = render(<App spec={minimalSpec} />)
      expect(lastFrame()).toContain('Endpoints')
      expect(lastFrame()).toContain('Endpoint Detail')
      expect(lastFrame()).toContain('Request / Response')

      stdin.write('f')
      await delay(50)
      const frame = lastFrame()!
      expect(frame).toContain('Endpoints')
      expect(frame).not.toContain('Endpoint Detail')
      expect(frame).not.toContain('Request / Response')
    })

    it('f again restores all three panels', async () => {
      const { lastFrame, stdin } = render(<App spec={minimalSpec} />)

      stdin.write('f')
      await delay(50)
      expect(lastFrame()).not.toContain('Endpoint Detail')

      stdin.write('f')
      await delay(50)
      const frame = lastFrame()!
      expect(frame).toContain('Endpoints')
      expect(frame).toContain('Endpoint Detail')
      expect(frame).toContain('Request / Response')
    })

    it('Tab during fullscreen restores normal layout', async () => {
      const { lastFrame, stdin } = render(<App spec={minimalSpec} />)

      stdin.write('f')
      await delay(50)
      expect(lastFrame()).not.toContain('Endpoint Detail')

      stdin.write('\t')
      await delay(50)
      const frame = lastFrame()!
      expect(frame).toContain('Endpoints')
      expect(frame).toContain('Endpoint Detail')
      expect(frame).toContain('Request / Response')
    })
  })

  describe('help overlay', () => {
    it('? shows Keyboard Shortcuts overlay', async () => {
      const { lastFrame, stdin } = render(<App spec={minimalSpec} />)

      stdin.write('?')
      await delay(50)
      expect(lastFrame()).toContain('Keyboard Shortcuts')
      expect(lastFrame()).toContain('Press ? or Esc to dismiss')
    })

    it('? again restores panels', async () => {
      const { lastFrame, stdin } = render(<App spec={minimalSpec} />)

      stdin.write('?')
      await delay(50)
      expect(lastFrame()).toContain('Keyboard Shortcuts')

      stdin.write('?')
      await delay(50)
      const frame = lastFrame()!
      expect(frame).not.toContain('Keyboard Shortcuts')
      expect(frame).toContain('Endpoints')
      expect(frame).toContain('Endpoint Detail')
    })

    it('help during fullscreen preserves fullscreen on dismiss', async () => {
      const { lastFrame, stdin } = render(<App spec={minimalSpec} />)

      // Enter fullscreen on endpoints panel
      stdin.write('f')
      await delay(50)
      expect(lastFrame()).not.toContain('Endpoint Detail')

      // Open help
      stdin.write('?')
      await delay(50)
      expect(lastFrame()).toContain('Keyboard Shortcuts')

      // Close help — fullscreen should be preserved
      stdin.write('?')
      await delay(50)
      const frame = lastFrame()!
      expect(frame).not.toContain('Keyboard Shortcuts')
      expect(frame).toContain('Endpoints')
      expect(frame).not.toContain('Endpoint Detail')
    })
  })
})
