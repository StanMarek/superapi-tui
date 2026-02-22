import { describe, it, expect } from 'bun:test'
import { render } from 'ink-testing-library'
import { EndpointDetail } from '@/components/EndpointDetail.js'
import type { Endpoint, SchemaInfo } from '@/types/index.js'

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

function schema(overrides: Partial<SchemaInfo> & { type: SchemaInfo['type'] }): SchemaInfo {
  return {
    displayType: overrides.type,
    nullable: false,
    readOnly: false,
    writeOnly: false,
    ...overrides,
  }
}

const userSchema = schema({
  type: 'object',
  displayType: 'User',
  refName: 'User',
  properties: new Map([
    ['id', schema({ type: 'integer', displayType: 'integer' })],
    ['name', schema({ type: 'string', displayType: 'string' })],
  ]),
})

const componentSchemas: ReadonlyMap<string, SchemaInfo> = new Map([
  ['User', userSchema],
])

const endpointWithDetails: Endpoint = {
  id: 'get-/users/{userId}',
  method: 'get',
  path: '/users/{userId}',
  summary: 'Get user by ID',
  tags: ['users'],
  deprecated: false,
  parameters: [
    {
      name: 'userId',
      location: 'path',
      required: true,
      deprecated: false,
      schema: schema({ type: 'integer', displayType: 'integer' }),
    },
    {
      name: 'include',
      location: 'query',
      required: false,
      deprecated: false,
      schema: schema({ type: 'string', displayType: 'string', enumValues: ['profile', 'posts'] }),
    },
  ],
  responses: [
    {
      statusCode: '200',
      description: 'Success',
      content: [{ mediaType: 'application/json', schema: userSchema }],
      headers: [],
    },
    {
      statusCode: '404',
      description: 'Not found',
      content: [],
      headers: [],
    },
  ],
}

const endpointWithBody: Endpoint = {
  id: 'post-/users',
  method: 'post',
  path: '/users',
  summary: 'Create user',
  tags: ['users'],
  deprecated: false,
  parameters: [],
  requestBody: {
    required: true,
    content: [
      {
        mediaType: 'application/json',
        schema: schema({
          type: 'object',
          displayType: 'object',
          properties: new Map([
            ['name', schema({ type: 'string', displayType: 'string' })],
            ['email', schema({ type: 'string', displayType: 'string', format: 'email' })],
          ]),
          required: ['name', 'email'],
        }),
      },
    ],
  },
  responses: [
    {
      statusCode: '201',
      description: 'Created',
      content: [{ mediaType: 'application/json', schema: userSchema }],
      headers: [],
    },
  ],
}

describe('EndpointDetail', () => {
  describe('Empty state', () => {
    it('shows placeholder when no endpoint selected', () => {
      const { lastFrame } = render(
        <EndpointDetail endpoint={null} isFocused={false} componentSchemas={new Map()} />,
      )
      expect(lastFrame()!).toContain('No endpoint selected')
    })
  })

  describe('Endpoint header', () => {
    it('shows method and path', () => {
      const { lastFrame } = render(
        <EndpointDetail endpoint={endpointWithDetails} isFocused={false} componentSchemas={componentSchemas} />,
      )
      const frame = lastFrame()!
      expect(frame).toContain('GET')
      expect(frame).toContain('/users/{userId}')
    })

    it('shows summary', () => {
      const { lastFrame } = render(
        <EndpointDetail endpoint={endpointWithDetails} isFocused={false} componentSchemas={componentSchemas} />,
      )
      expect(lastFrame()!).toContain('Get user by ID')
    })
  })

  describe('Sections', () => {
    it('shows Parameters section header', () => {
      const { lastFrame } = render(
        <EndpointDetail endpoint={endpointWithDetails} isFocused={false} componentSchemas={componentSchemas} />,
      )
      expect(lastFrame()!).toContain('Parameters')
    })

    it('shows parameter names and types', () => {
      const { lastFrame } = render(
        <EndpointDetail endpoint={endpointWithDetails} isFocused={false} componentSchemas={componentSchemas} />,
      )
      const frame = lastFrame()!
      expect(frame).toContain('userId')
      expect(frame).toContain('include')
    })

    it('shows Responses section header', () => {
      const { lastFrame } = render(
        <EndpointDetail endpoint={endpointWithDetails} isFocused={false} componentSchemas={componentSchemas} />,
      )
      const frame = lastFrame()!
      expect(frame).toContain('Responses')
      expect(frame).toContain('200')
      expect(frame).toContain('404')
    })

    it('shows Request Body section for POST endpoints', () => {
      const { lastFrame } = render(
        <EndpointDetail endpoint={endpointWithBody} isFocused={false} componentSchemas={componentSchemas} />,
      )
      const frame = lastFrame()!
      expect(frame).toContain('Request Body')
      expect(frame).toContain('name')
      expect(frame).toContain('email')
    })

    it('does not show Request Body section when endpoint has no body', () => {
      const { lastFrame } = render(
        <EndpointDetail endpoint={endpointWithDetails} isFocused={false} componentSchemas={componentSchemas} />,
      )
      expect(lastFrame()!).not.toContain('Request Body')
    })
  })

  describe('Section collapsing', () => {
    it('collapses Parameters section with Enter on header', async () => {
      const { lastFrame, stdin } = render(
        <EndpointDetail endpoint={endpointWithDetails} isFocused={true} componentSchemas={componentSchemas} />,
      )
      // Verify parameter content is visible before collapse
      expect(lastFrame()!).toContain('include')
      // Cursor starts at first row (Parameters header). Press Enter to collapse.
      stdin.write('\r')
      await delay(50)
      const frame = lastFrame()!
      // After collapse, parameter names should be hidden (check 'include' which only appears in parameters)
      expect(frame).not.toContain('include')
      // The collapsed arrow should be visible
      expect(frame).toContain('\u25b6')
    })
  })

  describe('Schema navigation', () => {
    it('shows User ref in the Responses section', () => {
      const { lastFrame } = render(
        <EndpointDetail endpoint={endpointWithDetails} isFocused={true} componentSchemas={componentSchemas} />,
      )
      const frame = lastFrame()!
      expect(frame).toContain('User')
    })

    it('shows endpoint view sections on initial render', () => {
      const { lastFrame } = render(
        <EndpointDetail endpoint={endpointWithDetails} isFocused={true} componentSchemas={componentSchemas} />,
      )
      const frame = lastFrame()!
      expect(frame).toContain('Parameters')
      expect(frame).toContain('Responses')
    })
  })

  describe('h/l collapse/expand', () => {
    it('collapses section with h key', async () => {
      const { lastFrame, stdin } = render(
        <EndpointDetail endpoint={endpointWithDetails} isFocused={true} componentSchemas={componentSchemas} />,
      )
      expect(lastFrame()!).toContain('include')
      // h on Parameters header should collapse it
      stdin.write('h')
      await delay(50)
      expect(lastFrame()!).not.toContain('include')
    })

    it('expands collapsed section with l key', async () => {
      const { lastFrame, stdin } = render(
        <EndpointDetail endpoint={endpointWithDetails} isFocused={true} componentSchemas={componentSchemas} />,
      )
      // Collapse first
      stdin.write('h')
      await delay(50)
      expect(lastFrame()!).not.toContain('include')
      // Expand with l
      stdin.write('l')
      await delay(50)
      expect(lastFrame()!).toContain('include')
    })
  })

  describe('State reset on endpoint change', () => {
    it('re-expands previously collapsed sections when endpoint changes', async () => {
      const { lastFrame, stdin, rerender } = render(
        <EndpointDetail endpoint={endpointWithDetails} isFocused={true} componentSchemas={componentSchemas} />,
      )
      // Collapse Parameters section
      stdin.write('\r')
      await delay(50)
      expect(lastFrame()!).not.toContain('include')
      // Switch endpoint
      rerender(
        <EndpointDetail endpoint={endpointWithBody} isFocused={true} componentSchemas={componentSchemas} />,
      )
      await delay(50)
      // New endpoint should have expanded sections
      expect(lastFrame()!).toContain('Request Body')
    })
  })
})
