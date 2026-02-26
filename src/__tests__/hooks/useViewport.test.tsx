import { describe, test, expect } from 'bun:test'
import { render } from 'ink-testing-library'
import { useState } from 'react'
import { Text, Box, useInput } from 'ink'
import { useViewport } from '@/hooks/useViewport.js'

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

function Harness({ rowCount, reservedLines, terminalHeight }: {
  readonly rowCount: number
  readonly reservedLines: number
  readonly terminalHeight: number
}) {
  const [cursor, setCursor] = useState(0)
  const viewport = useViewport({ rowCount, cursorIndex: cursor, reservedLines, terminalHeight })

  useInput((input: string) => {
    if (input === 'j') setCursor(prev => Math.min(prev + 1, rowCount - 1))
    if (input === 'k') setCursor(prev => Math.max(prev - 1, 0))
    if (input === 'g') setCursor(0)
    if (input === 'G') setCursor(Math.max(rowCount - 1, 0))
  })

  return (
    <Box flexDirection="column">
      <Text>cursor:{cursor}</Text>
      <Text>offset:{viewport.scrollOffset}</Text>
      <Text>visible:{viewport.visibleCount}</Text>
      <Text>above:{viewport.hasOverflowAbove ? 'yes' : 'no'}</Text>
      <Text>below:{viewport.hasOverflowBelow ? 'yes' : 'no'}</Text>
    </Box>
  )
}

describe('useViewport', () => {
  test('all rows fit — no scrolling', async () => {
    const { lastFrame } = render(<Harness rowCount={5} reservedLines={6} terminalHeight={20} />)
    await delay(50)
    const frame = lastFrame()!
    expect(frame).toContain('offset:0')
    expect(frame).toContain('visible:5')
    expect(frame).toContain('above:no')
    expect(frame).toContain('below:no')
  })

  test('rows exceed viewport — shows overflow below', async () => {
    // 20 rows, terminal=16, reserved=6 → available=10, but 20 rows
    const { lastFrame } = render(<Harness rowCount={20} reservedLines={6} terminalHeight={16} />)
    await delay(50)
    const frame = lastFrame()!
    expect(frame).toContain('offset:0')
    expect(frame).toContain('above:no')
    expect(frame).toContain('below:yes')
  })

  test('cursor down past viewport scrolls offset', async () => {
    const { lastFrame, stdin } = render(<Harness rowCount={20} reservedLines={6} terminalHeight={16} />)
    await delay(50)
    // Move cursor down past visible area
    for (let i = 0; i < 12; i++) {
      stdin.write('j')
      await delay(20)
    }
    await delay(50)
    const frame = lastFrame()!
    expect(frame).toContain('cursor:12')
    expect(frame).toContain('above:yes')
    expect(frame).toContain('below:yes')
  })

  test('jump to bottom with G', async () => {
    const { lastFrame, stdin } = render(<Harness rowCount={20} reservedLines={6} terminalHeight={16} />)
    await delay(50)
    stdin.write('G')
    await delay(50)
    const frame = lastFrame()!
    expect(frame).toContain('cursor:19')
    expect(frame).toContain('above:yes')
    expect(frame).toContain('below:no')
  })

  test('jump to top with g', async () => {
    const { lastFrame, stdin } = render(<Harness rowCount={20} reservedLines={6} terminalHeight={16} />)
    await delay(50)
    stdin.write('G')
    await delay(50)
    stdin.write('g')
    await delay(50)
    const frame = lastFrame()!
    expect(frame).toContain('cursor:0')
    expect(frame).toContain('offset:0')
    expect(frame).toContain('above:no')
    expect(frame).toContain('below:yes')
  })

  test('zero rows — no overflow', async () => {
    const { lastFrame } = render(<Harness rowCount={0} reservedLines={6} terminalHeight={20} />)
    await delay(50)
    const frame = lastFrame()!
    expect(frame).toContain('visible:0')
    expect(frame).toContain('above:no')
    expect(frame).toContain('below:no')
  })

  test('very small terminal — minimum 1 visible row', async () => {
    const { lastFrame } = render(<Harness rowCount={10} reservedLines={6} terminalHeight={8} />)
    await delay(50)
    const frame = lastFrame()!
    const visible = parseInt(frame.match(/visible:(\d+)/)?.[1] ?? '0')
    expect(visible).toBeGreaterThanOrEqual(1)
  })
})
