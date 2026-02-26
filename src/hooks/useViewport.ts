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

export function useViewport(options: ViewportOptions): ViewportState {
  const { rowCount, cursorIndex, reservedLines, terminalHeight: heightOverride } = options
  const terminalHeight = useTerminalHeight(heightOverride)
  const scrollOffsetRef = useRef(0)

  const rawAvailable = Math.max(MIN_VISIBLE, terminalHeight - reservedLines)

  // No scrolling needed
  if (rowCount <= rawAvailable) {
    scrollOffsetRef.current = 0
    return {
      scrollOffset: 0,
      visibleCount: rowCount,
      hasOverflowAbove: false,
      hasOverflowBelow: false,
    }
  }

  // Need scrolling — compute with scroll indicator overhead
  let scrollOffset = scrollOffsetRef.current

  // Keep cursor in visible range (first pass with raw available)
  if (cursorIndex < scrollOffset) {
    scrollOffset = cursorIndex
  } else if (cursorIndex >= scrollOffset + rawAvailable) {
    scrollOffset = cursorIndex - rawAvailable + 1
  }

  // Clamp offset
  scrollOffset = Math.max(0, Math.min(scrollOffset, rowCount - rawAvailable))

  // Compute overflow indicators
  const hasAbove = scrollOffset > 0
  const hasBelow = scrollOffset + rawAvailable < rowCount

  // Subtract indicator lines from content
  const indicatorLines = (hasAbove ? 1 : 0) + (hasBelow ? 1 : 0)
  const contentHeight = Math.max(MIN_VISIBLE, rawAvailable - indicatorLines)

  // Re-adjust cursor visibility with reduced content height
  if (cursorIndex < scrollOffset) {
    scrollOffset = cursorIndex
  } else if (cursorIndex >= scrollOffset + contentHeight) {
    scrollOffset = cursorIndex - contentHeight + 1
  }
  scrollOffset = Math.max(0, Math.min(scrollOffset, rowCount - contentHeight))

  // Recompute overflow with final values
  const finalAbove = scrollOffset > 0
  const finalBelow = scrollOffset + contentHeight < rowCount

  scrollOffsetRef.current = scrollOffset

  return {
    scrollOffset,
    visibleCount: contentHeight,
    hasOverflowAbove: finalAbove,
    hasOverflowBelow: finalBelow,
  }
}
