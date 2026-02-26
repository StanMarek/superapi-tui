import { useRef } from 'react'
import { useTerminalHeight } from './useTerminalHeight.js'

export interface ViewportOptions {
  readonly rowCount: number
  readonly cursorIndex: number
  readonly reservedLines: number
  readonly terminalHeight?: number
}

export interface ViewportState {
  readonly scrollOffset: number
  readonly visibleCount: number
  readonly hasOverflowAbove: boolean
  readonly hasOverflowBelow: boolean
}

const MIN_VISIBLE = 1
const INDICATOR_LINES = 2 // always reserve both above + below indicators when scrolling

export function useViewport(options: ViewportOptions): ViewportState {
  const { rowCount, reservedLines, terminalHeight: heightOverride } = options
  const cursorIndex = Math.max(0, options.cursorIndex)
  const terminalHeight = useTerminalHeight(heightOverride)
  const scrollOffsetRef = useRef(0)

  const rawAvailable = Math.max(MIN_VISIBLE, terminalHeight - reservedLines)

  // No scrolling needed — all rows fit
  if (rowCount <= rawAvailable) {
    scrollOffsetRef.current = 0
    return {
      scrollOffset: 0,
      visibleCount: rowCount,
      hasOverflowAbove: false,
      hasOverflowBelow: false,
    }
  }

  // Scrolling needed — reserve both indicator lines upfront to prevent oscillation.
  // This is conservative (we always subtract 2 even when only 1 indicator shows)
  // but it guarantees stable content height regardless of scroll position.
  const contentHeight = Math.max(MIN_VISIBLE, rawAvailable - INDICATOR_LINES)

  let scrollOffset = scrollOffsetRef.current

  // Keep cursor in visible range
  if (cursorIndex < scrollOffset) {
    scrollOffset = cursorIndex
  } else if (cursorIndex >= scrollOffset + contentHeight) {
    scrollOffset = cursorIndex - contentHeight + 1
  }

  // Clamp offset
  scrollOffset = Math.max(0, Math.min(scrollOffset, rowCount - contentHeight))

  const hasOverflowAbove = scrollOffset > 0
  const hasOverflowBelow = scrollOffset + contentHeight < rowCount

  scrollOffsetRef.current = scrollOffset

  return {
    scrollOffset,
    visibleCount: contentHeight,
    hasOverflowAbove,
    hasOverflowBelow,
  }
}
