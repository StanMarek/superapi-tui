import { describe, it, expect } from 'bun:test'
import { render } from 'ink-testing-library'
import { SchemaView } from '@/components/SchemaView.js'
import type { SchemaInfo } from '@/types/index.js'

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

// Helper to build SchemaInfo objects with defaults
function schema(overrides: Partial<SchemaInfo> & { type: SchemaInfo['type'] }): SchemaInfo {
  return {
    displayType: overrides.type,
    nullable: false,
    readOnly: false,
    writeOnly: false,
    ...overrides,
  }
}

describe('SchemaView', () => {
  describe('Object rendering', () => {
    it('renders object properties with names and types', () => {
      const objectSchema = schema({
        type: 'object',
        displayType: 'object',
        properties: new Map([
          ['id', schema({ type: 'integer', displayType: 'integer' })],
          ['name', schema({ type: 'string', displayType: 'string' })],
        ]),
      })
      const { lastFrame } = render(
        <SchemaView schema={objectSchema} cursorIndex={-1} onNavigateRef={() => {}} />,
      )
      const frame = lastFrame()!
      expect(frame).toContain('id')
      expect(frame).toContain('integer')
      expect(frame).toContain('name')
      expect(frame).toContain('string')
    })

    it('marks required fields with asterisk', () => {
      const objectSchema = schema({
        type: 'object',
        displayType: 'object',
        properties: new Map([
          ['id', schema({ type: 'integer', displayType: 'integer' })],
          ['name', schema({ type: 'string', displayType: 'string' })],
        ]),
        required: ['id'],
      })
      const { lastFrame } = render(
        <SchemaView schema={objectSchema} cursorIndex={-1} onNavigateRef={() => {}} />,
      )
      const frame = lastFrame()!
      expect(frame).toContain('*')
    })
  })

  describe('$ref rendering', () => {
    it('shows ref name with arrow indicator for navigable refs', () => {
      const objectSchema = schema({
        type: 'object',
        displayType: 'object',
        properties: new Map([
          ['profile', schema({ type: 'object', displayType: 'Profile', refName: 'Profile' })],
        ]),
      })
      const { lastFrame } = render(
        <SchemaView schema={objectSchema} cursorIndex={-1} onNavigateRef={() => {}} />,
      )
      const frame = lastFrame()!
      expect(frame).toContain('→')
      expect(frame).toContain('Profile')
    })
  })

  describe('Array rendering', () => {
    it('renders array items type', () => {
      const arraySchema = schema({
        type: 'array',
        displayType: 'string[]',
        items: schema({ type: 'string', displayType: 'string' }),
      })
      const { lastFrame } = render(
        <SchemaView schema={arraySchema} cursorIndex={-1} onNavigateRef={() => {}} />,
      )
      const frame = lastFrame()!
      expect(frame).toContain('string[]')
    })
  })

  describe('Enum rendering', () => {
    it('shows enum values', () => {
      const enumSchema = schema({
        type: 'string',
        displayType: 'string',
        enumValues: ['asc', 'desc'],
      })
      const { lastFrame } = render(
        <SchemaView schema={enumSchema} cursorIndex={-1} onNavigateRef={() => {}} />,
      )
      const frame = lastFrame()!
      expect(frame).toContain('enum')
      expect(frame).toContain('asc')
      expect(frame).toContain('desc')
    })
  })

  describe('Composition rendering', () => {
    it('renders allOf group', () => {
      const composed = schema({
        type: 'object',
        displayType: 'object',
        allOf: [
          schema({ type: 'object', displayType: 'Base', refName: 'Base' }),
          schema({
            type: 'object',
            displayType: 'object',
            properties: new Map([
              ['extra', schema({ type: 'string', displayType: 'string' })],
            ]),
          }),
        ],
      })
      const { lastFrame } = render(
        <SchemaView schema={composed} cursorIndex={-1} onNavigateRef={() => {}} />,
      )
      const frame = lastFrame()!
      expect(frame).toContain('allOf')
    })

    it('renders oneOf group', () => {
      const composed = schema({
        type: 'object',
        displayType: 'object',
        oneOf: [
          schema({ type: 'object', displayType: 'Cat', refName: 'Cat' }),
          schema({ type: 'object', displayType: 'Dog', refName: 'Dog' }),
        ],
      })
      const { lastFrame } = render(
        <SchemaView schema={composed} cursorIndex={-1} onNavigateRef={() => {}} />,
      )
      const frame = lastFrame()!
      expect(frame).toContain('oneOf')
    })
  })

  describe('Empty / primitive schema', () => {
    it('renders primitive type display', () => {
      const primitiveSchema = schema({ type: 'string', displayType: 'string', format: 'email' })
      const { lastFrame } = render(
        <SchemaView schema={primitiveSchema} cursorIndex={-1} onNavigateRef={() => {}} />,
      )
      const frame = lastFrame()!
      expect(frame).toContain('string')
      expect(frame).toContain('email')
    })

    it('shows nullable indicator', () => {
      const nullableSchema = schema({ type: 'string', displayType: 'string', nullable: true })
      const { lastFrame } = render(
        <SchemaView schema={nullableSchema} cursorIndex={-1} onNavigateRef={() => {}} />,
      )
      const frame = lastFrame()!
      expect(frame).toContain('nullable')
    })
  })

  describe('Field detail expansion', () => {
    it('shows description when field is expanded', async () => {
      const objectSchema = schema({
        type: 'object',
        displayType: 'object',
        properties: new Map([
          ['email', schema({ type: 'string', displayType: 'string', description: 'User email address' })],
        ]),
      })
      // cursorIndex 0 = the 'email' field row
      const { lastFrame, stdin } = render(
        <SchemaView schema={objectSchema} cursorIndex={0} onNavigateRef={() => {}} isFocused={true} />,
      )
      // Press Enter to expand detail
      stdin.write('\r')
      await delay(50)
      const frame = lastFrame()!
      expect(frame).toContain('User email address')
    })
  })
})
