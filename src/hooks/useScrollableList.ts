import { useState, useCallback, useEffect } from 'react'

export interface ScrollableListState {
  readonly cursorIndex: number
  readonly setCursorIndex: (index: number) => void
  readonly moveUp: () => void
  readonly moveDown: () => void
  readonly moveToTop: () => void
  readonly moveToBottom: () => void
}

export function useScrollableList(rowCount: number): ScrollableListState {
  const [cursorIndex, setCursorIndexRaw] = useState(0)

  const clamp = useCallback(
    (index: number) => Math.max(0, Math.min(index, Math.max(0, rowCount - 1))),
    [rowCount],
  )

  // Reset cursor if rowCount shrinks below it
  useEffect(() => {
    setCursorIndexRaw(prev => clamp(prev))
  }, [rowCount, clamp])

  const setCursorIndex = useCallback(
    (index: number) => setCursorIndexRaw(clamp(index)),
    [clamp],
  )

  const moveUp = useCallback(() => {
    setCursorIndexRaw(prev => clamp(prev - 1))
  }, [clamp])

  const moveDown = useCallback(() => {
    setCursorIndexRaw(prev => clamp(prev + 1))
  }, [clamp])

  const moveToTop = useCallback(() => {
    setCursorIndexRaw(0)
  }, [])

  const moveToBottom = useCallback(() => {
    setCursorIndexRaw(clamp(rowCount - 1))
  }, [clamp, rowCount])

  return { cursorIndex, setCursorIndex, moveUp, moveDown, moveToTop, moveToBottom }
}
