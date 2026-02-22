import { useState } from 'react'
import { Box, Text, useInput } from 'ink'
import type { SchemaInfo, SchemaConstraints } from '@/types/index.js'

export interface SchemaFieldRow {
  readonly name: string
  readonly schema: SchemaInfo
  readonly depth: number
  readonly required: boolean
  readonly isCompositionLabel?: boolean
  readonly compositionType?: string
}

interface Props {
  readonly schema: SchemaInfo
  readonly cursorIndex: number
  readonly onNavigateRef: (schema: SchemaInfo, label: string) => void
  readonly isFocused?: boolean
}

function flattenSchema(
  schema: SchemaInfo,
  depth: number = 0,
  parentRequired: readonly string[] = [],
): readonly SchemaFieldRow[] {
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

export function SchemaView({ schema, cursorIndex, onNavigateRef, isFocused = false }: Props) {
  const [expandedRows, setExpandedRows] = useState<ReadonlySet<number>>(new Set())

  const rows = flattenSchema(schema)

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
      if (!key.return) return
      const row = rows[cursorIndex]
      if (!row) return

      // Navigate into $ref
      if (row.schema.refName && !row.isCompositionLabel) {
        onNavigateRef(row.schema, row.schema.refName)
        return
      }

      // Toggle field detail expansion
      toggleExpand(cursorIndex)
    },
    { isActive: isFocused && cursorIndex >= 0 },
  )

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
      {rows.map((row, index) => {
        const isSelected = index === cursorIndex && isFocused
        const indent = '  '.repeat(row.depth)
        const isExpanded = expandedRows.has(index)
        const fieldSchema = row.schema

        if (row.isCompositionLabel) {
          return (
            <Text key={`comp-${index}`} inverse={isSelected}>
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
          <Box key={`field-${index}`} flexDirection="column">
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
                  <Text dimColor>  example: {JSON.stringify(fieldSchema.example)}</Text>
                )}
                {fieldSchema.defaultValue !== undefined && (
                  <Text dimColor>  default: {JSON.stringify(fieldSchema.defaultValue)}</Text>
                )}
              </Box>
            )}
          </Box>
        )
      })}
    </Box>
  )
}

// Export for testing
export { flattenSchema }
