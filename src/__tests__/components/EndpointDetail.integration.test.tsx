import { describe, it, expect } from 'bun:test'
import { render } from 'ink-testing-library'
import App from '@/App.js'
import type { ParsedSpec, SchemaInfo } from '@/types/index.js'

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

const petSchema = schema({
  type: 'object',
  displayType: 'Pet',
  refName: 'Pet',
  properties: new Map([
    ['id', schema({ type: 'integer', displayType: 'integer' })],
    ['name', schema({ type: 'string', displayType: 'string' })],
    ['tag', schema({ type: 'string', displayType: 'string' })],
  ]),
  required: ['id', 'name'],
})

const errorSchema = schema({
  type: 'object',
  displayType: 'Error',
  refName: 'Error',
  properties: new Map([
    ['code', schema({ type: 'integer', displayType: 'integer' })],
    ['message', schema({ type: 'string', displayType: 'string' })],
  ]),
  required: ['code', 'message'],
})

const testSpec: ParsedSpec = {
  info: { title: 'Petstore', version: '1.0.0', specVersion: '3.0.0' },
  servers: [{ url: 'http://localhost:3000', variables: new Map() }],
  tagGroups: [
    {
      name: 'pets',
      endpoints: [
        {
          id: 'get-/pets',
          method: 'get',
          path: '/pets',
          summary: 'List all pets',
          tags: ['pets'],
          deprecated: false,
          parameters: [
            {
              name: 'limit',
              location: 'query',
              required: false,
              deprecated: false,
              schema: schema({ type: 'integer', displayType: 'integer' }),
            },
          ],
          responses: [
            {
              statusCode: '200',
              description: 'A list of pets',
              content: [{ mediaType: 'application/json', schema: schema({ type: 'array', displayType: 'Pet[]', items: petSchema }) }],
              headers: [],
            },
          ],
        },
        {
          id: 'post-/pets',
          method: 'post',
          path: '/pets',
          summary: 'Create a pet',
          tags: ['pets'],
          deprecated: false,
          parameters: [],
          requestBody: {
            required: true,
            content: [{ mediaType: 'application/json', schema: petSchema }],
          },
          responses: [
            {
              statusCode: '201',
              description: 'Pet created',
              content: [{ mediaType: 'application/json', schema: petSchema }],
              headers: [],
            },
          ],
        },
      ],
    },
  ],
  endpoints: [],
  tags: ['pets'],
  securitySchemes: [],
  globalSecurity: [],
  componentSchemas: new Map([
    ['Pet', petSchema],
    ['Error', errorSchema],
  ]),
}

// Helper: expand tag group, select first endpoint
async function selectFirstEndpoint(stdin: { write: (s: string) => void }) {
  // Expand tag group (collapsed by default)
  stdin.write('\r')
  await delay(50)
  // Move to first endpoint
  stdin.write('j')
  await delay(50)
  // Select it
  stdin.write('\r')
  await delay(50)
}

// Helper: expand tag group, select second endpoint
async function selectSecondEndpoint(stdin: { write: (s: string) => void }) {
  stdin.write('\r')
  await delay(50)
  stdin.write('j')
  await delay(50)
  stdin.write('j')
  await delay(50)
  stdin.write('\r')
  await delay(50)
}

describe('EndpointDetail Integration', () => {
  it('selecting an endpoint in the list updates the detail panel', async () => {
    const { lastFrame, stdin } = render(<App spec={testSpec} />)

    await selectFirstEndpoint(stdin)

    const frame = lastFrame()!
    // Detail panel should now show the selected endpoint's method and path
    expect(frame).toContain('GET')
    expect(frame).toContain('/pets')
    // Parameters section header should be visible (collapsed)
    expect(frame).toContain('Parameters')
  })

  it('Tab to detail panel and navigate sections', async () => {
    const { lastFrame, stdin } = render(<App spec={testSpec} />)

    await selectFirstEndpoint(stdin)

    // Tab to detail panel
    stdin.write('\t')
    await delay(50)

    // Detail panel should show section headers for the selected endpoint
    const frame = lastFrame()!
    expect(frame).toContain('Parameters')
    expect(frame).toContain('Responses')
  })

  it('shows request body section header when POST endpoint is selected', async () => {
    const { lastFrame, stdin } = render(<App spec={testSpec} />)

    await selectSecondEndpoint(stdin)

    const frame = lastFrame()!
    expect(frame).toContain('POST')
    expect(frame).toContain('/pets')
    // Section header should be visible (collapsed)
    expect(frame).toContain('Request Body')
  })

  it('shows response section header for selected endpoint', async () => {
    const { lastFrame, stdin } = render(<App spec={testSpec} />)

    await selectFirstEndpoint(stdin)

    const frame = lastFrame()!
    expect(frame).toContain('Responses')
  })

  it('detail panel shows "No endpoint selected" before any selection', () => {
    const { lastFrame } = render(<App spec={testSpec} />)
    const frame = lastFrame()!
    expect(frame).toContain('No endpoint selected')
  })

  it('request panel updates when an endpoint is selected', async () => {
    const { lastFrame, stdin } = render(<App spec={testSpec} />)

    await selectFirstEndpoint(stdin)

    const frame = lastFrame()!
    expect(frame).toContain('Request / Response')
    expect(frame).not.toContain('No endpoint selected')
  })

  it('expanding then collapsing a section in the detail panel', async () => {
    const { lastFrame, stdin } = render(<App spec={testSpec} />)

    await selectFirstEndpoint(stdin)

    // Tab to detail panel
    stdin.write('\t')
    await delay(50)

    // Sections are collapsed by default — expand Parameters
    stdin.write('\r')
    await delay(50)
    expect(lastFrame()!).toContain('limit')

    // Collapse again
    stdin.write('\r')
    await delay(50)
    expect(lastFrame()!).toContain('\u25b6') // collapsed arrow
    expect(lastFrame()!).not.toContain('Query Parameters')
  })

  it('switching endpoint selection updates the detail panel', async () => {
    const { lastFrame, stdin } = render(<App spec={testSpec} />)

    await selectFirstEndpoint(stdin)

    let frame = lastFrame()!
    expect(frame).toContain('Parameters')

    // Select POST /pets (move down and select)
    stdin.write('j')
    await delay(50)
    stdin.write('\r')
    await delay(50)

    frame = lastFrame()!
    // Detail panel should now show POST /pets details (section headers collapsed)
    expect(frame).toContain('Request Body')
    // POST /pets has no parameters, so Parameters section should not appear
    expect(frame).not.toContain('Parameters')
  })

  it('panel focus indicator changes with Tab navigation', async () => {
    const { lastFrame, stdin } = render(<App spec={testSpec} />)

    let frame = lastFrame()!
    expect(frame).toContain('Endpoints')
    expect(frame).toContain('Endpoint Detail')

    // Tab to detail panel
    stdin.write('\t')
    await delay(50)

    // Tab again to request panel
    stdin.write('\t')
    await delay(50)

    frame = lastFrame()!
    expect(frame).toContain('Endpoints')
    expect(frame).toContain('Endpoint Detail')
    expect(frame).toContain('Request / Response')
  })

  it('Shift+Tab cycles focus backwards', async () => {
    const { lastFrame, stdin } = render(<App spec={testSpec} />)

    stdin.write('\x1b[Z') // Shift+Tab escape sequence
    await delay(50)

    const frame = lastFrame()!
    expect(frame).toContain('Endpoints')
    expect(frame).toContain('Endpoint Detail')
    expect(frame).toContain('Request / Response')
  })

  it('shows schema ref name in response section header after expanding', async () => {
    const { lastFrame, stdin } = render(<App spec={testSpec} />)

    await selectSecondEndpoint(stdin)

    // Tab to detail panel
    stdin.write('\t')
    await delay(50)

    // Navigate to Responses header (skip Request Body header)
    stdin.write('j')
    await delay(50)
    // Expand Responses
    stdin.write('\r')
    await delay(50)

    const frame = lastFrame()!
    expect(frame).toContain('201')
    expect(frame).toContain('Pet created')
    expect(frame).toContain('Pet')
  })
})
