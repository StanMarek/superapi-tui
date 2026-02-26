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

describe('useLineEditor — cursor movement', () => {
  test('left arrow moves cursor left', async () => {
    const { lastFrame, stdin } = render(<EditorHarness initialText="abc" />)
    await delay(50)
    expect(lastFrame()).toContain('cursor:3')
    stdin.write('\x1b[D') // left arrow
    await delay(50)
    expect(lastFrame()).toContain('cursor:2')
  })

  test('right arrow at end is no-op', async () => {
    const { lastFrame, stdin } = render(<EditorHarness initialText="abc" />)
    await delay(50)
    expect(lastFrame()).toContain('cursor:3')
    stdin.write('\x1b[C') // right arrow
    await delay(50)
    expect(lastFrame()).toContain('cursor:3')
  })

  test('left arrow at position 0 is no-op', async () => {
    const { lastFrame, stdin } = render(<EditorHarness initialText="a" />)
    await delay(50)
    stdin.write('\x1b[D')
    await delay(50)
    expect(lastFrame()).toContain('cursor:0')
    stdin.write('\x1b[D')
    await delay(50)
    expect(lastFrame()).toContain('cursor:0')
  })
})

describe('useLineEditor — word operations', () => {
  test('Ctrl+W deletes word backward', async () => {
    const { lastFrame, stdin } = render(
      <EditorHarness initialText="hello world" />,
    )
    await delay(50)
    expect(lastFrame()).toContain('cursor:11')
    stdin.write('\x17') // Ctrl+W
    await delay(50)
    // "world" is deleted, trailing space may be trimmed in terminal output
    expect(lastFrame()).toContain('text:hello')
    expect(lastFrame()).not.toContain('world')
    expect(lastFrame()).toContain('cursor:6')
  })
})

describe('useLineEditor — normal mode', () => {
  test('Escape in multiline insert mode switches to normal', async () => {
    const { lastFrame, stdin } = render(
      <EditorHarness multiline initialText="hello" />,
    )
    await delay(50)
    expect(lastFrame()).toContain('mode:insert')
    stdin.write('\x1b') // Escape
    await delay(50)
    expect(lastFrame()).toContain('mode:normal')
    expect(lastFrame()).toContain('action:none')
  })

  test('Escape clamps cursor from EOL to last char in normal mode', async () => {
    const { lastFrame, stdin } = render(
      <EditorHarness multiline initialText="hello" />,
    )
    await delay(50)
    // In insert mode, cursor is at 5 (after last char)
    expect(lastFrame()).toContain('cursor:5')
    stdin.write('\x1b') // Escape → normal mode
    await delay(50)
    // Normal mode cursor must sit ON a character → clamped to 4
    expect(lastFrame()).toContain('cursor:4')
    expect(lastFrame()).toContain('mode:normal')
    // x should now delete 'o' (the last char), not be a no-op
    stdin.write('x')
    await delay(50)
    expect(lastFrame()).toContain('text:hell')
  })

  test('i in normal mode switches back to insert', async () => {
    const { lastFrame, stdin } = render(
      <EditorHarness multiline initialText="hello" />,
    )
    await delay(50)
    stdin.write('\x1b') // to normal mode
    await delay(50)
    expect(lastFrame()).toContain('mode:normal')
    stdin.write('i')
    await delay(50)
    expect(lastFrame()).toContain('mode:insert')
  })

  test('0 moves to start, $ moves to end in normal mode', async () => {
    const { lastFrame, stdin } = render(
      <EditorHarness multiline initialText="hello world" />,
    )
    await delay(50)
    stdin.write('\x1b') // to normal mode
    await delay(50)
    stdin.write('0')
    await delay(50)
    expect(lastFrame()).toContain('cursor:0')
    stdin.write('$')
    await delay(50)
    expect(lastFrame()).toContain('cursor:10')
  })

  test('x deletes char at cursor in normal mode', async () => {
    const { lastFrame, stdin } = render(
      <EditorHarness multiline initialText="abcde" />,
    )
    await delay(50)
    stdin.write('\x1b') // to normal mode
    await delay(50)
    stdin.write('0') // go to start
    await delay(50)
    stdin.write('x') // delete 'a'
    await delay(50)
    expect(lastFrame()).toContain('text:bcde')
    expect(lastFrame()).toContain('cursor:0')
  })

  test('a enters insert mode after cursor', async () => {
    const { lastFrame, stdin } = render(
      <EditorHarness multiline initialText="ac" />,
    )
    await delay(50)
    stdin.write('\x1b') // to normal mode
    await delay(50)
    stdin.write('0') // go to start (cursor on 'a')
    await delay(50)
    stdin.write('a') // insert after cursor (pos 1)
    await delay(50)
    expect(lastFrame()).toContain('mode:insert')
    expect(lastFrame()).toContain('cursor:1')
    stdin.write('b')
    await delay(50)
    expect(lastFrame()).toContain('text:abc')
  })

  test('I enters insert at start, A enters insert at end', async () => {
    const { lastFrame, stdin } = render(
      <EditorHarness multiline initialText="hello" />,
    )
    await delay(50)
    stdin.write('\x1b') // to normal mode
    await delay(50)
    stdin.write('I') // insert at start
    await delay(50)
    expect(lastFrame()).toContain('mode:insert')
    expect(lastFrame()).toContain('cursor:0')

    stdin.write('\x1b') // back to normal
    await delay(50)
    stdin.write('A') // insert at end
    await delay(50)
    expect(lastFrame()).toContain('mode:insert')
    expect(lastFrame()).toContain('cursor:5')
  })

  test('Enter in normal mode returns commit', async () => {
    const { lastFrame, stdin } = render(
      <EditorHarness multiline initialText="hello" />,
    )
    await delay(50)
    stdin.write('\x1b') // to normal mode
    await delay(50)
    stdin.write('\r') // Enter
    await delay(50)
    expect(lastFrame()).toContain('action:commit')
  })

  test('Escape in normal mode returns commit', async () => {
    const { lastFrame, stdin } = render(
      <EditorHarness multiline initialText="hello" />,
    )
    await delay(50)
    stdin.write('\x1b') // to normal mode
    await delay(50)
    stdin.write('\x1b') // Escape again
    await delay(50)
    expect(lastFrame()).toContain('action:commit')
  })
})

describe('useLineEditor — action semantics', () => {
  test('Enter in single-line insert mode returns commit', async () => {
    const { lastFrame, stdin } = render(
      <EditorHarness initialText="hello" />,
    )
    await delay(50)
    stdin.write('\r')
    await delay(50)
    expect(lastFrame()).toContain('action:commit')
  })

  test('Escape in single-line insert mode returns cancel', async () => {
    const { lastFrame, stdin } = render(
      <EditorHarness initialText="hello" />,
    )
    await delay(50)
    stdin.write('\x1b')
    await delay(50)
    expect(lastFrame()).toContain('action:cancel')
  })

  test('Enter in multiline insert mode inserts newline', async () => {
    const { lastFrame, stdin } = render(
      <EditorHarness multiline initialText="line1" />,
    )
    await delay(50)
    stdin.write('\r')
    await delay(50)
    expect(lastFrame()).toContain('action:none')
    expect(lastFrame()).toContain('cursor:6')
  })

  test('Escape in single-line does not enter normal mode', async () => {
    const { lastFrame, stdin } = render(
      <EditorHarness initialText="hello" />,
    )
    await delay(50)
    stdin.write('\x1b')
    await delay(50)
    expect(lastFrame()).toContain('mode:insert')
    expect(lastFrame()).toContain('action:cancel')
  })

  test('w and b word-jump in multiline normal mode', async () => {
    const { lastFrame, stdin } = render(
      <EditorHarness multiline initialText="hello world test" />,
    )
    await delay(50)
    stdin.write('\x1b') // to normal
    await delay(50)
    stdin.write('0') // go to start
    await delay(50)
    expect(lastFrame()).toContain('cursor:0')
    stdin.write('w') // jump to 'world'
    await delay(50)
    expect(lastFrame()).toContain('cursor:6')
    stdin.write('w') // jump to 'test'
    await delay(50)
    expect(lastFrame()).toContain('cursor:12')
  })
})

describe('useLineEditor — paste handling', () => {
  test('rapid character input is captured via ref-backed buffer', async () => {
    const { lastFrame, stdin } = render(<EditorHarness initialText="" />)
    await delay(50)
    const pasteText = 'eyJhbGciOiJIUzI1NiJ9'
    for (const ch of pasteText) {
      stdin.write(ch)
    }
    await delay(100)
    expect(lastFrame()).toContain(`text:${pasteText}`)
    expect(lastFrame()).toContain(`cursor:${pasteText.length}`)
  })

  test('bulk paste as single write is captured', async () => {
    const { lastFrame, stdin } = render(<EditorHarness initialText="" />)
    await delay(50)
    const jwt = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9'
    stdin.write(jwt)
    await delay(100)
    expect(lastFrame()).toContain('text:eyJhbGci')
    expect(lastFrame()).toContain(`cursor:${jwt.length}`)
  })

  test('getText returns current value after flush', async () => {
    const { lastFrame, stdin } = render(<EditorHarness initialText="start" />)
    await delay(50)
    stdin.write('!')
    await delay(50)
    expect(lastFrame()).toContain('text:start!')
  })
})
