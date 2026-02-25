import { describe, test, expect } from 'bun:test'
import { render } from 'ink-testing-library'
import { useState, useEffect, useRef } from 'react'
import { Box, Text, useInput } from 'ink'
import { useLineEditor } from '@/hooks/useLineEditor.js'

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

function EditorHarness({
  multiline,
  initialText = '',
}: {
  readonly multiline?: boolean
  readonly initialText?: string
}) {
  const editor = useLineEditor({ multiline })
  const [action, setAction] = useState<string>('none')
  const initRef = useRef(false)

  useEffect(() => {
    if (!initRef.current) {
      initRef.current = true
      editor.init(initialText)
    }
  }, [])

  useInput((input, key) => {
    const result = editor.handleInput(input, key)
    if (result !== 'handled') {
      setAction(result)
    }
  })

  return (
    <Box flexDirection="column">
      <Text>text:{editor.text}</Text>
      <Text>cursor:{editor.cursorPos}</Text>
      <Text>mode:{editor.mode}</Text>
      <Text>action:{action}</Text>
    </Box>
  )
}

describe('useLineEditor — insert mode basics', () => {
  test('init sets text and cursor at end', async () => {
    const { lastFrame } = render(<EditorHarness initialText="hello" />)
    await delay(50)
    expect(lastFrame()).toContain('text:hello')
    expect(lastFrame()).toContain('cursor:5')
    expect(lastFrame()).toContain('mode:insert')
  })

  test('typing appends at cursor (end)', async () => {
    const { lastFrame, stdin } = render(<EditorHarness initialText="" />)
    await delay(50)
    stdin.write('a')
    await delay(50)
    stdin.write('b')
    await delay(50)
    expect(lastFrame()).toContain('text:ab')
    expect(lastFrame()).toContain('cursor:2')
  })

  test('typing inserts at cursor position (middle)', async () => {
    const { lastFrame, stdin } = render(<EditorHarness initialText="ac" />)
    await delay(50)
    // Move cursor left once (cursor goes from 2 to 1)
    stdin.write('\x1b[D') // left arrow
    await delay(50)
    stdin.write('b')
    await delay(50)
    expect(lastFrame()).toContain('text:abc')
    expect(lastFrame()).toContain('cursor:2')
  })

  test('backspace deletes char before cursor', async () => {
    const { lastFrame, stdin } = render(<EditorHarness initialText="abc" />)
    await delay(50)
    stdin.write('\x7f') // backspace
    await delay(50)
    expect(lastFrame()).toContain('text:ab')
    expect(lastFrame()).toContain('cursor:2')
  })

  test('backspace at position 0 is a no-op', async () => {
    const { lastFrame, stdin } = render(<EditorHarness initialText="a" />)
    await delay(50)
    // Move to start
    stdin.write('\x1b[D') // left arrow
    await delay(50)
    expect(lastFrame()).toContain('cursor:0')
    stdin.write('\x7f') // backspace
    await delay(50)
    expect(lastFrame()).toContain('text:a')
    expect(lastFrame()).toContain('cursor:0')
  })

  test('backspace in middle of text', async () => {
    const { lastFrame, stdin } = render(<EditorHarness initialText="abcd" />)
    await delay(50)
    // Move cursor left twice (cursor at position 2, between 'b' and 'c')
    stdin.write('\x1b[D')
    await delay(50)
    stdin.write('\x1b[D')
    await delay(50)
    expect(lastFrame()).toContain('cursor:2')
    // Backspace removes 'b'
    stdin.write('\x7f')
    await delay(50)
    expect(lastFrame()).toContain('text:acd')
    expect(lastFrame()).toContain('cursor:1')
  })
})
