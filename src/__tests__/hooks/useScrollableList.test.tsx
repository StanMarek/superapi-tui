import { describe, it, expect } from 'bun:test'
import React, { useState } from 'react'
import { render } from 'ink-testing-library'
import { Box, Text, useInput } from 'ink'
import { useScrollableList } from '@/hooks/useScrollableList.js'

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

/**
 * Test harness that renders cursor state and responds to key commands:
 *   j = moveDown, k = moveUp, g = moveToTop, G = moveToBottom
 */
function TestHarness({ rowCount }: { readonly rowCount: number }) {
  const list = useScrollableList(rowCount)

  useInput((input, key) => {
    if (input === 'j' || key.downArrow) list.moveDown()
    if (input === 'k' || key.upArrow) list.moveUp()
    if (input === 'g') list.moveToTop()
    if (input === 'G') list.moveToBottom()
  })

  return (
    <Box>
      <Text>cursor:{list.cursorIndex}</Text>
    </Box>
  )
}

/**
 * Wrapper that allows changing rowCount dynamically via stdin commands.
 * 'r2' sets rowCount to 2 (via 'r' trigger then '2').
 * Simplified: 'S' shrinks rowCount to 2.
 */
function DynamicRowCountHarness({ initialRowCount }: { readonly initialRowCount: number }) {
  const [rowCount, setRowCount] = useState(initialRowCount)
  const list = useScrollableList(rowCount)

  useInput((input) => {
    if (input === 'j') list.moveDown()
    if (input === 'k') list.moveUp()
    if (input === 'g') list.moveToTop()
    if (input === 'G') list.moveToBottom()
    if (input === 'S') setRowCount(2) // shrink to 2 rows
  })

  return (
    <Box>
      <Text>cursor:{list.cursorIndex} rows:{rowCount}</Text>
    </Box>
  )
}

describe('useScrollableList', () => {
  it('starts at cursor index 0', () => {
    const { lastFrame } = render(<TestHarness rowCount={5} />)
    expect(lastFrame()).toContain('cursor:0')
  })

  it('moveDown increments cursor', async () => {
    const { lastFrame, stdin } = render(<TestHarness rowCount={5} />)
    stdin.write('j')
    await delay(50)
    expect(lastFrame()).toContain('cursor:1')
  })

  it('moveUp decrements cursor', async () => {
    const { lastFrame, stdin } = render(<TestHarness rowCount={5} />)
    stdin.write('j')
    await delay(50)
    stdin.write('j')
    await delay(50)
    stdin.write('k')
    await delay(50)
    expect(lastFrame()).toContain('cursor:1')
  })

  it('clamps cursor at bottom', async () => {
    const { lastFrame, stdin } = render(<TestHarness rowCount={3} />)
    stdin.write('j')
    await delay(50)
    stdin.write('j')
    await delay(50)
    stdin.write('j') // past end
    await delay(50)
    expect(lastFrame()).toContain('cursor:2')
  })

  it('clamps cursor at top', async () => {
    const { lastFrame, stdin } = render(<TestHarness rowCount={3} />)
    stdin.write('k') // past start
    await delay(50)
    expect(lastFrame()).toContain('cursor:0')
  })

  it('moveToTop sets cursor to 0', async () => {
    const { lastFrame, stdin } = render(<TestHarness rowCount={5} />)
    stdin.write('j')
    await delay(50)
    stdin.write('j')
    await delay(50)
    stdin.write('g')
    await delay(50)
    expect(lastFrame()).toContain('cursor:0')
  })

  it('moveToBottom sets cursor to last index', async () => {
    const { lastFrame, stdin } = render(<TestHarness rowCount={5} />)
    stdin.write('G')
    await delay(50)
    expect(lastFrame()).toContain('cursor:4')
  })

  it('handles rowCount of 0', async () => {
    const { lastFrame, stdin } = render(<TestHarness rowCount={0} />)
    expect(lastFrame()).toContain('cursor:0')
    stdin.write('j')
    await delay(50)
    expect(lastFrame()).toContain('cursor:0')
  })

  it('resets cursor when rowCount shrinks below cursor', async () => {
    const { lastFrame, stdin } = render(<DynamicRowCountHarness initialRowCount={5} />)
    stdin.write('G') // move to bottom (index 4)
    await delay(50)
    expect(lastFrame()).toContain('cursor:4')
    stdin.write('S') // shrink to 2 rows
    await delay(50)
    // cursor should be clamped to max valid index (1)
    expect(lastFrame()).toContain('cursor:1')
  })
})
