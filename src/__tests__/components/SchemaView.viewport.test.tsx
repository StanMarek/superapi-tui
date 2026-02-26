import { describe, test, expect, mock } from 'bun:test'
import { render } from 'ink-testing-library'
import { SchemaView } from '@/components/SchemaView.js'
import type { SchemaInfo } from '@/types/index.js'

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

function makeLargeSchema(fieldCount: number): SchemaInfo {
  const properties = new Map<string, SchemaInfo>()
  for (let i = 0; i < fieldCount; i++) {
    properties.set(`field${i}`, schema({ type: 'string', displayType: 'string' }))
  }
  return schema({ type: 'object', displayType: 'object', properties })
}

describe('SchemaView viewport', () => {
  test('constrains visible rows with maxVisibleRows in self-managed mode', async () => {
    const largeSchema = makeLargeSchema(25)
    const onNav = mock(() => {})
    const { lastFrame } = render(
      <SchemaView
        schema={largeSchema}
        cursorIndex={-1}
        onNavigateRef={onNav}
        isFocused={true}
        maxVisibleRows={8}
      />,
    )
    await delay(50)
    const frame = lastFrame()!
    // Should not render all 25 fields
    // Count field occurrences
    const fieldMatches = frame.match(/field\d+/g) ?? []
    expect(fieldMatches.length).toBeLessThan(25)
    expect(fieldMatches.length).toBeGreaterThanOrEqual(1)
    // Should show overflow below
    expect(frame).toContain('more below')
    expect(frame).not.toContain('more above')
  })

  test('scroll indicators appear when navigating down', async () => {
    const largeSchema = makeLargeSchema(25)
    const onNav = mock(() => {})
    const { lastFrame, stdin } = render(
      <SchemaView
        schema={largeSchema}
        cursorIndex={-1}
        onNavigateRef={onNav}
        isFocused={true}
        maxVisibleRows={8}
      />,
    )
    await delay(50)
    // Navigate down past viewport
    for (let i = 0; i < 10; i++) {
      stdin.write('j')
      await delay(20)
    }
    await delay(50)
    const frame = lastFrame()!
    expect(frame).toContain('more above')
    expect(frame).toContain('more below')
  })

  test('G jump to bottom shows only overflow above', async () => {
    const largeSchema = makeLargeSchema(25)
    const onNav = mock(() => {})
    const { lastFrame, stdin } = render(
      <SchemaView
        schema={largeSchema}
        cursorIndex={-1}
        onNavigateRef={onNav}
        isFocused={true}
        maxVisibleRows={8}
      />,
    )
    await delay(50)
    stdin.write('G')
    await delay(50)
    const frame = lastFrame()!
    expect(frame).toContain('more above')
    expect(frame).not.toContain('more below')
    expect(frame).toContain('field24')
  })

  test('g jump to top shows only overflow below', async () => {
    const largeSchema = makeLargeSchema(25)
    const onNav = mock(() => {})
    const { lastFrame, stdin } = render(
      <SchemaView
        schema={largeSchema}
        cursorIndex={-1}
        onNavigateRef={onNav}
        isFocused={true}
        maxVisibleRows={8}
      />,
    )
    await delay(50)
    stdin.write('G')
    await delay(50)
    stdin.write('g')
    await delay(50)
    const frame = lastFrame()!
    expect(frame).not.toContain('more above')
    expect(frame).toContain('more below')
    expect(frame).toContain('field0')
  })

  test('no viewport scrolling without maxVisibleRows', async () => {
    const largeSchema = makeLargeSchema(25)
    const onNav = mock(() => {})
    const { lastFrame } = render(
      <SchemaView
        schema={largeSchema}
        cursorIndex={-1}
        onNavigateRef={onNav}
        isFocused={true}
      />,
    )
    await delay(50)
    const frame = lastFrame()!
    // All fields should render
    const fieldMatches = frame.match(/field\d+/g) ?? []
    expect(fieldMatches.length).toBe(25)
    expect(frame).not.toContain('more above')
    expect(frame).not.toContain('more below')
  })

  test('no scrolling when rows fit within maxVisibleRows', async () => {
    const smallSchema = makeLargeSchema(3)
    const onNav = mock(() => {})
    const { lastFrame } = render(
      <SchemaView
        schema={smallSchema}
        cursorIndex={-1}
        onNavigateRef={onNav}
        isFocused={true}
        maxVisibleRows={8}
      />,
    )
    await delay(50)
    const frame = lastFrame()!
    expect(frame).not.toContain('more above')
    expect(frame).not.toContain('more below')
    const fieldMatches = frame.match(/field\d+/g) ?? []
    expect(fieldMatches.length).toBe(3)
  })
})
