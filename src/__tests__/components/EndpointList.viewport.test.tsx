import { describe, test, expect, mock } from 'bun:test'
import { render } from 'ink-testing-library'
import { EndpointList } from '@/components/EndpointList.js'
import type { Endpoint, TagGroup } from '@/types/index.js'

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

function makeEndpoints(tag: string, count: number): readonly Endpoint[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `get-/${tag}/item${i}`,
    method: 'get' as const,
    path: `/${tag}/item${i}`,
    summary: `Get ${tag} item ${i}`,
    tags: [tag],
    deprecated: false,
    parameters: [],
    responses: [],
  }))
}

const largeTagGroups: readonly TagGroup[] = [
  { name: 'alpha', endpoints: makeEndpoints('alpha', 12) },
  { name: 'beta', endpoints: makeEndpoints('beta', 12) },
  { name: 'gamma', endpoints: makeEndpoints('gamma', 12) },
]

describe('EndpointList viewport', () => {
  test('constrains rendered rows when terminal height is small', async () => {
    const onSelect = mock(() => {})
    const { lastFrame, stdin } = render(
      <EndpointList
        tagGroups={largeTagGroups}
        isFocused={true}
        onSelectEndpoint={onSelect}
        terminalHeight={15}
      />,
    )
    // Expand alpha tag group to generate many rows
    stdin.write('\r')
    await delay(50)
    const frame = lastFrame()!
    // With terminalHeight=15 and reserved=6, available=9
    // Scroll indicator takes 1 line → 8 content rows
    // Should not render all 13 rows (1 tag + 12 endpoints)
    const lines = frame.split('\n')
    // Total lines (including border/padding from Ink) should not exceed terminalHeight
    expect(lines.length).toBeLessThanOrEqual(15)
    // Should show overflow below indicator
    expect(frame).toContain('more below')
  })

  test('shows overflow above after scrolling down', async () => {
    const onSelect = mock(() => {})
    const { lastFrame, stdin } = render(
      <EndpointList
        tagGroups={largeTagGroups}
        isFocused={true}
        onSelectEndpoint={onSelect}
        terminalHeight={15}
      />,
    )
    // Expand alpha group
    stdin.write('\r')
    await delay(50)
    // Navigate down past the viewport
    for (let i = 0; i < 10; i++) {
      stdin.write('j')
      await delay(20)
    }
    await delay(50)
    const frame = lastFrame()!
    expect(frame).toContain('more above')
  })

  test('g jump resets to top with only overflow below', async () => {
    const onSelect = mock(() => {})
    const { lastFrame, stdin } = render(
      <EndpointList
        tagGroups={largeTagGroups}
        isFocused={true}
        onSelectEndpoint={onSelect}
        terminalHeight={15}
      />,
    )
    // Expand alpha group
    stdin.write('\r')
    await delay(50)
    // Navigate down
    for (let i = 0; i < 10; i++) {
      stdin.write('j')
      await delay(20)
    }
    await delay(50)
    // Jump to top
    stdin.write('g')
    await delay(50)
    const frame = lastFrame()!
    expect(frame).not.toContain('more above')
    expect(frame).toContain('more below')
    // Alpha tag header should be visible at top
    expect(frame).toContain('alpha')
  })

  test('G jump scrolls to end with only overflow above', async () => {
    const onSelect = mock(() => {})
    const { lastFrame, stdin } = render(
      <EndpointList
        tagGroups={largeTagGroups}
        isFocused={true}
        onSelectEndpoint={onSelect}
        terminalHeight={15}
      />,
    )
    // Expand alpha group
    stdin.write('\r')
    await delay(50)
    // Jump to bottom
    stdin.write('G')
    await delay(50)
    const frame = lastFrame()!
    expect(frame).toContain('more above')
    expect(frame).not.toContain('more below')
  })

  test('no viewport scrolling when all rows fit', async () => {
    const onSelect = mock(() => {})
    // With all collapsed, only 3 tag headers → easily fits
    const { lastFrame } = render(
      <EndpointList
        tagGroups={largeTagGroups}
        isFocused={true}
        onSelectEndpoint={onSelect}
        terminalHeight={15}
      />,
    )
    await delay(50)
    const frame = lastFrame()!
    expect(frame).not.toContain('more above')
    expect(frame).not.toContain('more below')
  })

  test('viewport works with filter mode', async () => {
    const onSelect = mock(() => {})
    const { lastFrame, stdin } = render(
      <EndpointList
        tagGroups={largeTagGroups}
        isFocused={true}
        onSelectEndpoint={onSelect}
        terminalHeight={15}
      />,
    )
    // Enter filter mode — type "item" to match many endpoints
    stdin.write('/')
    await delay(50)
    stdin.write('item')
    await delay(50)
    const frame = lastFrame()!
    // 36 endpoints match "item" but only a few fit in the viewport
    const lines = frame.split('\n')
    expect(lines.length).toBeLessThanOrEqual(15)
    expect(frame).toContain('more below')
  })
})
