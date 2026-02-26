import { useState, useMemo, useEffect } from 'react'
import { Box, Text, useInput } from 'ink'
import type { Endpoint, TagGroup } from '@/types/index.js'
import { METHOD_COLORS } from '@/utils/http-method.js'
import { useViewport } from '@/hooks/useViewport.js'
import { ScrollIndicator } from './ScrollIndicator.js'

type ListRow =
  | { readonly kind: 'tag'; readonly tag: string; readonly count: number }
  | { readonly kind: 'endpoint'; readonly endpoint: Endpoint; readonly tag: string }

interface Props {
  readonly tagGroups: readonly TagGroup[]
  readonly isFocused: boolean
  readonly onSelectEndpoint: (endpoint: Endpoint) => void
  readonly onTextCaptureChange?: (active: boolean) => void
  readonly terminalHeight?: number
}

function buildRows(
  tagGroups: readonly TagGroup[],
  collapsedTags: ReadonlySet<string>,
): readonly ListRow[] {
  const rows: ListRow[] = []
  for (const group of tagGroups) {
    rows.push({ kind: 'tag', tag: group.name, count: group.endpoints.length })
    if (!collapsedTags.has(group.name)) {
      for (const endpoint of group.endpoints) {
        rows.push({ kind: 'endpoint', endpoint, tag: group.name })
      }
    }
  }
  return rows
}

function buildFilteredRows(
  tagGroups: readonly TagGroup[],
  filterText: string,
): readonly ListRow[] {
  const lower = filterText.toLowerCase()
  const rows: ListRow[] = []
  for (const group of tagGroups) {
    for (const endpoint of group.endpoints) {
      const matchesPath = endpoint.path.toLowerCase().includes(lower)
      const matchesSummary = endpoint.summary?.toLowerCase().includes(lower) ?? false
      if (matchesPath || matchesSummary) {
        rows.push({ kind: 'endpoint', endpoint, tag: group.name })
      }
    }
  }
  return rows
}

function getTagAtCursor(
  rows: readonly ListRow[],
  cursorIndex: number,
): string | null {
  const row = rows[cursorIndex]
  return row?.tag ?? null
}

export function EndpointList({ tagGroups, isFocused, onSelectEndpoint, onTextCaptureChange, terminalHeight }: Props) {
  const [cursorIndex, setCursorIndex] = useState(0)
  const [collapsedTags, setCollapsedTags] = useState<ReadonlySet<string>>(
    () => new Set(tagGroups.map(g => g.name)),
  )
  const [filterText, setFilterText] = useState('')
  const [isFiltering, setIsFiltering] = useState(false)

  // Re-collapse all tags when tagGroups change (e.g., new spec loaded)
  useEffect(() => {
    setCollapsedTags(new Set(tagGroups.map(g => g.name)))
    setCursorIndex(0)
  }, [tagGroups])

  const rows = useMemo(() => {
    if (isFiltering) {
      return buildFilteredRows(tagGroups, filterText)
    }
    return buildRows(tagGroups, collapsedTags)
  }, [tagGroups, collapsedTags, isFiltering, filterText])

  const clampCursor = (index: number) => Math.max(0, Math.min(index, rows.length - 1))

  const reservedLines = 6 + (isFiltering ? 1 : 0)
  const viewport = useViewport({
    rowCount: rows.length,
    cursorIndex,
    reservedLines,
    terminalHeight,
  })

  const toggleCollapse = (tag: string) => {
    setCollapsedTags(prev => {
      const next = new Set(prev)
      if (next.has(tag)) {
        next.delete(tag)
      } else {
        next.add(tag)
      }
      return next
    })
  }

  const collapseTag = (tag: string) => {
    setCollapsedTags(prev => {
      if (prev.has(tag)) return prev
      const next = new Set(prev)
      next.add(tag)
      return next
    })
  }

  const expandTag = (tag: string) => {
    setCollapsedTags(prev => {
      if (!prev.has(tag)) return prev
      const next = new Set(prev)
      next.delete(tag)
      return next
    })
  }

  useInput(
    (input, key) => {
      if (isFiltering) {
        // Filter mode input handling
        if (key.escape) {
          setIsFiltering(false)
          setFilterText('')
          setCursorIndex(0)
          onTextCaptureChange?.(false)
          return
        }
        if (key.return) {
          setIsFiltering(false)
          onTextCaptureChange?.(false)
          return
        }
        if (key.backspace || key.delete) {
          setFilterText(prev => prev.slice(0, -1))
          setCursorIndex(0)
          return
        }
        // Accumulate typed characters (ignore control keys)
        if (input && !key.ctrl && !key.meta) {
          setFilterText(prev => prev + input)
          setCursorIndex(0)
        }
        return
      }

      // Normal mode
      if (input === '/') {
        setIsFiltering(true)
        setFilterText('')
        setCursorIndex(0)
        onTextCaptureChange?.(true)
        return
      }

      if (input === 'j' || key.downArrow) {
        setCursorIndex(prev => clampCursor(prev + 1))
        return
      }

      if (input === 'k' || key.upArrow) {
        setCursorIndex(prev => clampCursor(prev - 1))
        return
      }

      if (input === 'g') {
        setCursorIndex(0)
        return
      }

      if (input === 'G') {
        setCursorIndex(clampCursor(rows.length - 1))
        return
      }

      if (key.return) {
        const currentRow = rows[cursorIndex]
        if (!currentRow) return
        if (currentRow.kind === 'tag') {
          toggleCollapse(currentRow.tag)
        } else {
          onSelectEndpoint(currentRow.endpoint)
        }
        return
      }

      if (input === 'h') {
        const tag = getTagAtCursor(rows, cursorIndex)
        if (tag) {
          collapseTag(tag)
          // Move cursor to the tag header row when collapsing
          const tagRowIndex = rows.findIndex(r => r.kind === 'tag' && r.tag === tag)
          if (tagRowIndex >= 0) {
            setCursorIndex(tagRowIndex)
          }
        }
        return
      }

      if (input === 'l') {
        const tag = getTagAtCursor(rows, cursorIndex)
        if (tag) {
          expandTag(tag)
        }
        return
      }
    },
    { isActive: isFocused },
  )

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold dimColor={!isFocused}>
        Endpoints
      </Text>
      {isFiltering && (
        <Box marginTop={1}>
          <Text>
            / {filterText}
            <Text inverse> </Text>
          </Text>
        </Box>
      )}
      <Box flexDirection="column" marginTop={isFiltering ? 0 : 1}>
        <ScrollIndicator direction="up" visible={viewport.hasOverflowAbove} />
        {rows.slice(viewport.scrollOffset, viewport.scrollOffset + viewport.visibleCount).map((row, localIndex) => {
          const globalIndex = viewport.scrollOffset + localIndex
          const isSelected = globalIndex === cursorIndex && isFocused
          if (row.kind === 'tag') {
            const indicator = collapsedTags.has(row.tag) ? '\u25B6' : '\u25BC'
            return (
              <Text key={`tag-${row.tag}`} inverse={isSelected}>
                {indicator} {row.tag} ({row.count})
              </Text>
            )
          }
          const { endpoint } = row
          const methodColor = METHOD_COLORS[endpoint.method]
          return (
            <Box key={`${row.tag}-${endpoint.id}`} paddingLeft={2}>
              <Text
                inverse={isSelected}
                strikethrough={endpoint.deprecated}
              >
                <Text color={methodColor}>{endpoint.method.toUpperCase()}</Text>
                {'  '}
                {endpoint.path}
              </Text>
            </Box>
          )
        })}
        <ScrollIndicator direction="down" visible={viewport.hasOverflowBelow} />
      </Box>
    </Box>
  )
}
