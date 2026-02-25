import { useState, useCallback, useRef, useEffect } from 'react'

export type LineEditorAction = 'handled' | 'commit' | 'cancel'
export type LineEditorMode = 'insert' | 'normal'

export interface LineEditorOptions {
  readonly multiline?: boolean
}

export interface KeyInput {
  readonly return: boolean
  readonly escape: boolean
  readonly backspace: boolean
  readonly delete: boolean
  readonly ctrl: boolean
  readonly meta: boolean
  readonly shift: boolean
  readonly leftArrow: boolean
  readonly rightArrow: boolean
  readonly upArrow: boolean
  readonly downArrow: boolean
}

export interface LineEditorState {
  readonly text: string
  readonly cursorPos: number
  readonly mode: LineEditorMode
  readonly init: (value: string) => void
  readonly getText: () => string
  readonly handleInput: (input: string, key: KeyInput) => LineEditorAction
}

function isWordChar(ch: string): boolean {
  return /[a-zA-Z0-9_]/.test(ch)
}

function nextWordBoundary(text: string, pos: number): number {
  let i = pos
  if (i >= text.length) return text.length
  while (i < text.length && isWordChar(text[i]!)) i++
  while (i < text.length && !isWordChar(text[i]!)) i++
  return i
}

function prevWordBoundary(text: string, pos: number): number {
  let i = pos
  while (i > 0 && !isWordChar(text[i - 1]!)) i--
  while (i > 0 && isWordChar(text[i - 1]!)) i--
  return i
}

export function useLineEditor(options: LineEditorOptions = {}): LineEditorState {
  const multiline = options.multiline ?? false

  const textRef = useRef('')
  const cursorRef = useRef(0)
  const [text, setText] = useState('')
  const [cursorPos, setCursorPos] = useState(0)
  const [mode, setMode] = useState<LineEditorMode>('insert')
  const flushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const scheduleFlush = useCallback(() => {
    if (flushTimerRef.current === null) {
      flushTimerRef.current = setTimeout(() => {
        flushTimerRef.current = null
        setText(textRef.current)
        setCursorPos(cursorRef.current)
      }, 16)
    }
  }, [])

  const flushNow = useCallback(() => {
    if (flushTimerRef.current !== null) {
      clearTimeout(flushTimerRef.current)
      flushTimerRef.current = null
    }
    setText(textRef.current)
    setCursorPos(cursorRef.current)
  }, [])

  useEffect(() => {
    return () => {
      if (flushTimerRef.current !== null) {
        clearTimeout(flushTimerRef.current)
      }
    }
  }, [])

  const init = useCallback((value: string) => {
    textRef.current = value
    cursorRef.current = value.length
    setText(value)
    setCursorPos(value.length)
    setMode('insert')
  }, [])

  const getText = useCallback(() => textRef.current, [])

  const handleInsertMode = useCallback((input: string, key: KeyInput): LineEditorAction => {
    if (key.return) {
      if (multiline) {
        const before = textRef.current.slice(0, cursorRef.current)
        const after = textRef.current.slice(cursorRef.current)
        textRef.current = before + '\n' + after
        cursorRef.current += 1
        scheduleFlush()
        return 'handled'
      }
      flushNow()
      return 'commit'
    }

    if (key.escape) {
      if (multiline) {
        setMode('normal')
        flushNow()
        return 'handled'
      }
      flushNow()
      return 'cancel'
    }

    // Ink 6 maps terminal backspace (\x7f) to key.delete, not key.backspace.
    // Treat both as "delete before cursor" to match real terminal behavior.
    // This aligns with the existing RequestPanel pattern: `key.backspace || key.delete`.
    if (key.backspace || key.delete) {
      if (cursorRef.current > 0) {
        if (key.meta || (key.ctrl && input === 'w')) {
          const boundary = prevWordBoundary(textRef.current, cursorRef.current)
          textRef.current = textRef.current.slice(0, boundary) + textRef.current.slice(cursorRef.current)
          cursorRef.current = boundary
        } else {
          textRef.current = textRef.current.slice(0, cursorRef.current - 1) + textRef.current.slice(cursorRef.current)
          cursorRef.current -= 1
        }
        scheduleFlush()
      }
      return 'handled'
    }

    if (key.leftArrow) {
      if (key.meta || key.ctrl) {
        cursorRef.current = prevWordBoundary(textRef.current, cursorRef.current)
      } else {
        cursorRef.current = Math.max(0, cursorRef.current - 1)
      }
      flushNow()
      return 'handled'
    }

    if (key.rightArrow) {
      if (key.meta || key.ctrl) {
        cursorRef.current = nextWordBoundary(textRef.current, cursorRef.current)
      } else {
        cursorRef.current = Math.min(textRef.current.length, cursorRef.current + 1)
      }
      flushNow()
      return 'handled'
    }

    if (key.ctrl && input === 'a') {
      cursorRef.current = 0
      flushNow()
      return 'handled'
    }

    if (key.ctrl && input === 'e') {
      cursorRef.current = textRef.current.length
      flushNow()
      return 'handled'
    }

    if (key.ctrl && input === 'w' && !key.backspace) {
      if (cursorRef.current > 0) {
        const boundary = prevWordBoundary(textRef.current, cursorRef.current)
        textRef.current = textRef.current.slice(0, boundary) + textRef.current.slice(cursorRef.current)
        cursorRef.current = boundary
        scheduleFlush()
      }
      return 'handled'
    }

    if (input && !key.ctrl && !key.meta) {
      const before = textRef.current.slice(0, cursorRef.current)
      const after = textRef.current.slice(cursorRef.current)
      textRef.current = before + input + after
      cursorRef.current += input.length
      scheduleFlush()
      return 'handled'
    }

    return 'handled'
  }, [multiline, scheduleFlush, flushNow])

  const handleNormalMode = useCallback((input: string, key: KeyInput): LineEditorAction => {
    if (key.return || key.escape) {
      flushNow()
      return 'commit'
    }

    if (input === 'h' || key.leftArrow) {
      cursorRef.current = Math.max(0, cursorRef.current - 1)
      flushNow()
      return 'handled'
    }

    if (input === 'l' || key.rightArrow) {
      const maxPos = Math.max(0, textRef.current.length - 1)
      cursorRef.current = Math.min(maxPos, cursorRef.current + 1)
      flushNow()
      return 'handled'
    }

    if (input === 'w') {
      cursorRef.current = nextWordBoundary(textRef.current, cursorRef.current)
      cursorRef.current = Math.min(cursorRef.current, Math.max(0, textRef.current.length - 1))
      flushNow()
      return 'handled'
    }

    if (input === 'b') {
      cursorRef.current = prevWordBoundary(textRef.current, cursorRef.current)
      flushNow()
      return 'handled'
    }

    if (input === '0') {
      cursorRef.current = 0
      flushNow()
      return 'handled'
    }

    if (input === '$') {
      cursorRef.current = Math.max(0, textRef.current.length - 1)
      flushNow()
      return 'handled'
    }

    if (input === 'x') {
      if (textRef.current.length > 0 && cursorRef.current < textRef.current.length) {
        textRef.current = textRef.current.slice(0, cursorRef.current) + textRef.current.slice(cursorRef.current + 1)
        if (cursorRef.current >= textRef.current.length && textRef.current.length > 0) {
          cursorRef.current = textRef.current.length - 1
        }
        flushNow()
      }
      return 'handled'
    }

    if (input === 'i') {
      setMode('insert')
      return 'handled'
    }

    if (input === 'a') {
      cursorRef.current = Math.min(textRef.current.length, cursorRef.current + 1)
      setMode('insert')
      flushNow()
      return 'handled'
    }

    if (input === 'I') {
      cursorRef.current = 0
      setMode('insert')
      flushNow()
      return 'handled'
    }

    if (input === 'A') {
      cursorRef.current = textRef.current.length
      setMode('insert')
      flushNow()
      return 'handled'
    }

    return 'handled'
  }, [flushNow])

  const handleInput = useCallback((input: string, key: KeyInput): LineEditorAction => {
    if (mode === 'normal') {
      return handleNormalMode(input, key)
    }
    return handleInsertMode(input, key)
  }, [mode, handleNormalMode, handleInsertMode])

  return { text, cursorPos, mode, init, getText, handleInput }
}
