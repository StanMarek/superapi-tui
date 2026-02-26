import { useState, useEffect } from 'react'
import { Box, Text, useInput } from 'ink'
import type { SchemaInfo, SchemaConstraints } from '@/types/index.js'
import { useViewport } from '@/hooks/useViewport.js'
import { ScrollIndicator } from './ScrollIndicator.js'

export interface SchemaFieldRow {
  readonly name: string
  readonly schema: SchemaInfo
  readonly depth: number
  readonly required: boolean
  readonly isCompositionLabel?: boolean
  readonly compositionType?: 'allOf' | 'oneOf' | 'anyOf'
}

interface Props {
  readonly schema: SchemaInfo
  readonly cursorIndex: number
  readonly onNavigateRef: (schema: SchemaInfo, label: string) => void
  readonly isFocused?: boolean
  readonly maxVisibleRows?: number
}

const MAX_FLATTEN_DEPTH = 20

function flattenSchema(
  schema: SchemaInfo,
  depth: number = 0,
  parentRequired: readonly string[] = [],
): readonly SchemaFieldRow[] {
  if (depth > MAX_FLATTEN_DEPTH) {
    return [{ name: '(truncated)', schema, depth, required: false }]
  }

  const rows: SchemaFieldRow[] = []

  // Composition types
  for (const compositionType of ['allOf', 'oneOf', 'anyOf'] as const) {
    const schemas = schema[compositionType]
    if (schemas && schemas.length > 0) {
      rows.push({
        name: compositionType,
        schema,
        depth,
        required: false,
        isCompositionLabel: true,
        compositionType,
      })
      for (const subSchema of schemas) {
        if (subSchema.refName) {
          rows.push({
            name: subSchema.refName,
            schema: subSchema,
            depth: depth + 1,
            required: false,
          })
        } else {
          rows.push(...flattenSchema(subSchema, depth + 1))
        }
      }
    }
  }

  // Object properties
  if (schema.properties) {
    for (const [name, propSchema] of schema.properties) {
      const isRequired = parentRequired.includes(name) ||
        (schema.required?.includes(name) ?? false)
      rows.push({ name, schema: propSchema, depth, required: isRequired })
    }
  }

  return rows
}

function formatConstraints(constraints: SchemaConstraints): string {
  const parts: string[] = []
  if (constraints.minimum !== undefined) parts.push(`min: ${constraints.minimum}`)
  if (constraints.maximum !== undefined) parts.push(`max: ${constraints.maximum}`)
  if (constraints.minLength !== undefined) parts.push(`minLen: ${constraints.minLength}`)
  if (constraints.maxLength !== undefined) parts.push(`maxLen: ${constraints.maxLength}`)
  if (constraints.pattern) parts.push(`pattern: ${constraints.pattern}`)
  if (constraints.minItems !== undefined) parts.push(`minItems: ${constraints.minItems}`)
  if (constraints.maxItems !== undefined) parts.push(`maxItems: ${constraints.maxItems}`)
  if (constraints.uniqueItems) parts.push('unique')
  return parts.join(', ')
}

function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value)
  } catch {
    return '(unable to display)'
  }
}

export function SchemaView({ schema, cursorIndex, onNavigateRef, isFocused = false, maxVisibleRows }: Props) {
  const [expandedRows, setExpandedRows] = useState<ReadonlySet<number>>(new Set())
  const [internalCursor, setInternalCursor] = useState(0)

  const rows = flattenSchema(schema)

  // Self-managed mode: SchemaView handles its own cursor when focused but no external cursor
  const selfManaged = isFocused && cursorIndex < 0
  const activeCursor = selfManaged ? internalCursor : cursorIndex
  const shouldScroll = selfManaged && maxVisibleRows !== undefined

  // useViewport must be called unconditionally (hooks rule)
  // When not scrolling, pass rowCount=0 so the hook returns a no-op state
  const viewport = useViewport({
    rowCount: shouldScroll ? rows.length : 0,
    cursorIndex: shouldScroll ? Math.max(0, activeCursor) : 0,
    reservedLines: 0,
    terminalHeight: shouldScroll ? maxVisibleRows : undefined,
  })

  const isViewportActive = shouldScroll && viewport.visibleCount < rows.length

  // Reset state when schema changes
  useEffect(() => {
    setExpandedRows(new Set())
    setInternalCursor(0)
  }, [schema])

  const toggleExpand = (index: number) => {
    setExpandedRows(prev => {
      const next = new Set(prev)
      if (next.has(index)) {
        next.delete(index)
      } else {
        next.add(index)
      }
      return next
    })
  }

  useInput(
    (input, key) => {
      // Self-managed cursor navigation
      if (selfManaged) {
        if (input === 'j' || key.downArrow) {
          setInternalCursor(prev => Math.min(prev + 1, rows.length - 1))
          return
        }
        if (input === 'k' || key.upArrow) {
          setInternalCursor(prev => Math.max(prev - 1, 0))
          return
        }
        if (input === 'g') {
          setInternalCursor(0)
          return
        }
        if (input === 'G') {
          setInternalCursor(Math.max(rows.length - 1, 0))
          return
        }
      }

      if (!key.return) return
      const row = rows[activeCursor]
      if (!row) return

      // Navigate into $ref
      if (row.schema.refName && !row.isCompositionLabel) {
        onNavigateRef(row.schema, row.schema.refName)
        return
      }

      // Toggle field detail expansion
      toggleExpand(activeCursor)
    },
    { isActive: isFocused && (selfManaged || activeCursor >= 0) },
  )

  // Compute visible rows
  const visibleRows = isViewportActive
    ? rows.slice(viewport.scrollOffset, viewport.scrollOffset + viewport.visibleCount)
    : rows

  // Primitive / non-object top-level
  if (!schema.properties && !schema.allOf && !schema.oneOf && !schema.anyOf) {
    return (
      <Box flexDirection="column">
        <Text>
          <Text dimColor>{schema.displayType}</Text>
          {schema.format && <Text dimColor> ({schema.format})</Text>}
          {schema.nullable && <Text dimColor> nullable</Text>}
          {schema.enumValues && (
            <Text dimColor> enum: [{schema.enumValues.join(', ')}]</Text>
          )}
        </Text>
      </Box>
    )
  }

  return (
    <Box flexDirection="column">
      <ScrollIndicator direction="up" visible={isViewportActive && viewport.hasOverflowAbove} />
      {visibleRows.map((row, localIndex) => {
        const globalIndex = isViewportActive ? viewport.scrollOffset + localIndex : localIndex
        const isSelected = globalIndex === activeCursor && isFocused
        const indent = '  '.repeat(row.depth)
        const isExpanded = expandedRows.has(globalIndex)
        const fieldSchema = row.schema

        if (row.isCompositionLabel) {
          return (
            <Text key={`comp-${globalIndex}`} inverse={isSelected}>
              {indent}
              <Text dimColor>{row.compositionType}</Text>
            </Text>
          )
        }

        const hasRef = !!fieldSchema.refName
        const typeDisplay = hasRef
          ? `→ ${fieldSchema.refName}`
          : fieldSchema.displayType

        return (
          <Box key={`field-${globalIndex}`} flexDirection="column">
            <Text inverse={isSelected}>
              {indent}
              <Text bold={row.required}>{row.name}</Text>
              {'  '}
              <Text color={hasRef ? 'cyan' : undefined} dimColor={!hasRef}>
                {typeDisplay}
              </Text>
              {row.required && <Text color="red"> *</Text>}
              {fieldSchema.format && !hasRef && (
                <Text dimColor> ({fieldSchema.format})</Text>
              )}
              {fieldSchema.enumValues && (
                <Text dimColor> enum: [{fieldSchema.enumValues.join(', ')}]</Text>
              )}
              {fieldSchema.nullable && <Text dimColor> nullable</Text>}
              {fieldSchema.readOnly && <Text dimColor> readOnly</Text>}
              {fieldSchema.writeOnly && <Text dimColor> writeOnly</Text>}
            </Text>
            {isExpanded && (
              <Box flexDirection="column" paddingLeft={row.depth * 2 + 2}>
                {fieldSchema.description && (
                  <Text dimColor>  {fieldSchema.description}</Text>
                )}
                {fieldSchema.constraints && (
                  <Text dimColor>  {formatConstraints(fieldSchema.constraints)}</Text>
                )}
                {fieldSchema.example !== undefined && (
                  <Text dimColor>  example: {safeStringify(fieldSchema.example)}</Text>
                )}
                {fieldSchema.defaultValue !== undefined && (
                  <Text dimColor>  default: {safeStringify(fieldSchema.defaultValue)}</Text>
                )}
              </Box>
            )}
          </Box>
        )
      })}
      <ScrollIndicator direction="down" visible={isViewportActive && viewport.hasOverflowBelow} />
    </Box>
  )
}

// Export for testing
export { flattenSchema }
