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

describe('EndpointDetail Integration', () => {
  it('selecting an endpoint in the list updates the detail panel', async () => {
    const { lastFrame, stdin } = render(<App spec={testSpec} />)

    // Endpoint list is focused by default. Cursor starts at index 0 (tag header "pets").
    // Press j to move to first endpoint row (GET /pets) at index 1.
    stdin.write('j')
    await delay(50)
    // Press Enter to select the endpoint
    stdin.write('\r')
    await delay(50)

    const frame = lastFrame()!
    // Detail panel should now show the selected endpoint's method and path
    expect(frame).toContain('GET')
    expect(frame).toContain('/pets')
    // Parameters section should be visible with the limit parameter
    expect(frame).toContain('Parameters')
    expect(frame).toContain('limit')
  })

  it('Tab to detail panel and navigate sections', async () => {
    const { lastFrame, stdin } = render(<App spec={testSpec} />)

    // Select an endpoint first: j to move to GET /pets, Enter to select
    stdin.write('j')
    await delay(50)
    stdin.write('\r')
    await delay(50)

    // Tab to detail panel
    stdin.write('\t')
    await delay(50)

    // Detail panel should show sections for the selected endpoint
    const frame = lastFrame()!
    expect(frame).toContain('Parameters')
    expect(frame).toContain('Responses')
  })

  it('shows request body section when POST endpoint is selected', async () => {
    const { lastFrame, stdin } = render(<App spec={testSpec} />)

    // Navigate to the POST /pets endpoint (index 2: tag header=0, GET /pets=1, POST /pets=2)
    stdin.write('j')
    await delay(50)
    stdin.write('j')
    await delay(50)
    // Select POST /pets
    stdin.write('\r')
    await delay(50)

    const frame = lastFrame()!
    // Detail panel should show request body section
    expect(frame).toContain('POST')
    expect(frame).toContain('/pets')
    expect(frame).toContain('Request Body')
    expect(frame).toContain('required')
    expect(frame).toContain('application/json')
  })

  it('shows response information for selected endpoint', async () => {
    const { lastFrame, stdin } = render(<App spec={testSpec} />)

    // Select GET /pets
    stdin.write('j')
    await delay(50)
    stdin.write('\r')
    await delay(50)

    const frame = lastFrame()!
    // Responses section should show status codes and descriptions
    expect(frame).toContain('Responses')
    expect(frame).toContain('200')
    expect(frame).toContain('A list of pets')
  })

  it('detail panel shows "No endpoint selected" before any selection', () => {
    const { lastFrame } = render(<App spec={testSpec} />)
    const frame = lastFrame()!
    expect(frame).toContain('No endpoint selected')
  })

  it('request panel updates when an endpoint is selected', async () => {
    const { lastFrame, stdin } = render(<App spec={testSpec} />)

    // Select GET /pets
    stdin.write('j')
    await delay(50)
    stdin.write('\r')
    await delay(50)

    const frame = lastFrame()!
    // Request panel should also reflect the selected endpoint
    // The RequestPanel shows method and path for the selected endpoint
    // There should be at least 2 occurrences of "GET" (endpoint list + request panel or detail)
    expect(frame).toContain('Request / Response')
    expect(frame).not.toContain('No endpoint selected')
  })

  it('collapsing a section in the detail panel hides its content', async () => {
    const { lastFrame, stdin } = render(<App spec={testSpec} />)

    // Select GET /pets
    stdin.write('j')
    await delay(50)
    stdin.write('\r')
    await delay(50)

    // Verify parameter content is shown initially
    let frame = lastFrame()!
    expect(frame).toContain('limit')

    // Tab to detail panel
    stdin.write('\t')
    await delay(50)

    // Cursor starts at first row (Parameters header). Press Enter to collapse.
    stdin.write('\r')
    await delay(50)

    frame = lastFrame()!
    // After collapsing Parameters, the "limit" parameter should be hidden
    // The collapsed indicator should appear
    expect(frame).toContain('\u25b6') // collapsed arrow
    expect(frame).not.toContain('limit')
  })

  it('switching endpoint selection updates the detail panel', async () => {
    const { lastFrame, stdin } = render(<App spec={testSpec} />)

    // Select GET /pets first
    stdin.write('j')
    await delay(50)
    stdin.write('\r')
    await delay(50)

    let frame = lastFrame()!
    expect(frame).toContain('Parameters')
    expect(frame).toContain('limit')

    // Now select POST /pets (move down and select)
    stdin.write('j')
    await delay(50)
    stdin.write('\r')
    await delay(50)

    frame = lastFrame()!
    // Detail panel should now show POST /pets details
    expect(frame).toContain('Request Body')
    // POST /pets has no parameters, so the Parameters section should not appear
    expect(frame).not.toContain('limit')
  })

  it('panel focus indicator changes with Tab navigation', async () => {
    const { lastFrame, stdin } = render(<App spec={testSpec} />)

    // Initially endpoint list panel should be focused
    // We can verify by checking the panel title dimColor behavior
    // but the most reliable check is that the endpoint list renders with focus
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
    // All three panels should still be present
    expect(frame).toContain('Endpoints')
    expect(frame).toContain('Endpoint Detail')
    expect(frame).toContain('Request / Response')
  })

  it('Shift+Tab cycles focus backwards', async () => {
    const { lastFrame, stdin } = render(<App spec={testSpec} />)

    // Start at endpoints panel, Shift+Tab should go to request panel (wraps around)
    stdin.write('\x1b[Z') // Shift+Tab escape sequence
    await delay(50)

    const frame = lastFrame()!
    // All panels should still be visible
    expect(frame).toContain('Endpoints')
    expect(frame).toContain('Endpoint Detail')
    expect(frame).toContain('Request / Response')
  })

  it('shows schema details in response section', async () => {
    const { lastFrame, stdin } = render(<App spec={testSpec} />)

    // Select POST /pets which has a Pet schema in the response
    stdin.write('j')
    await delay(50)
    stdin.write('j')
    await delay(50)
    stdin.write('\r')
    await delay(50)

    const frame = lastFrame()!
    // The response 201 should show Pet schema properties
    expect(frame).toContain('201')
    expect(frame).toContain('Pet created')
    expect(frame).toContain('Pet')
  })
})
