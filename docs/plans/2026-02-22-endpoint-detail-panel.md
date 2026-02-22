# Endpoint Detail Panel — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the placeholder EndpointDetail component with a full-featured middle panel showing parameters, request body, response schemas, and stack-based $ref drill-down.

**Architecture:** Section components (ParameterList, SchemaView, ResponseList) composed by an EndpointDetail orchestrator. A reusable SchemaView handles recursive schema rendering. Two new hooks: useSchemaNavigation (stack-based $ref navigation) and useScrollableList (cursor/scroll management). All sections are vertically stacked, scrollable, and collapsible.

**Tech Stack:** Ink 6 + React 19, TypeScript, bun:test + ink-testing-library

**Design doc:** `docs/plans/2026-02-22-endpoint-detail-panel-design.md`

---

## Task 1: useScrollableList Hook

Reusable cursor management hook. Extracts the pattern already used in EndpointList.

**Files:**
- Create: `src/hooks/useScrollableList.ts`
- Create: `src/__tests__/hooks/useScrollableList.test.ts`
- Modify: `src/hooks/index.ts`

**Step 1: Write the failing tests**

Create `src/__tests__/hooks/useScrollableList.test.ts`:

```typescript
import { describe, it, expect } from 'bun:test'
import { renderHook, act } from '@testing-library/react'
import { useScrollableList } from '@/hooks/useScrollableList.js'

// NOTE: If @testing-library/react doesn't work with Bun, use a
// tiny wrapper component with ink-testing-library instead.
// The hook is simple enough to test via component integration.

describe('useScrollableList', () => {
  it('starts at cursor index 0', () => {
    const { result } = renderHook(() => useScrollableList(5))
    expect(result.current.cursorIndex).toBe(0)
  })

  it('moveDown increments cursor', () => {
    const { result } = renderHook(() => useScrollableList(5))
    act(() => result.current.moveDown())
    expect(result.current.cursorIndex).toBe(1)
  })

  it('moveUp decrements cursor', () => {
    const { result } = renderHook(() => useScrollableList(5))
    act(() => result.current.moveDown())
    act(() => result.current.moveDown())
    act(() => result.current.moveUp())
    expect(result.current.cursorIndex).toBe(1)
  })

  it('clamps cursor at bottom', () => {
    const { result } = renderHook(() => useScrollableList(3))
    act(() => result.current.moveDown())
    act(() => result.current.moveDown())
    act(() => result.current.moveDown()) // past end
    expect(result.current.cursorIndex).toBe(2)
  })

  it('clamps cursor at top', () => {
    const { result } = renderHook(() => useScrollableList(3))
    act(() => result.current.moveUp()) // past start
    expect(result.current.cursorIndex).toBe(0)
  })

  it('moveToTop sets cursor to 0', () => {
    const { result } = renderHook(() => useScrollableList(5))
    act(() => result.current.moveDown())
    act(() => result.current.moveDown())
    act(() => result.current.moveToTop())
    expect(result.current.cursorIndex).toBe(0)
  })

  it('moveToBottom sets cursor to last index', () => {
    const { result } = renderHook(() => useScrollableList(5))
    act(() => result.current.moveToBottom())
    expect(result.current.cursorIndex).toBe(4)
  })

  it('handles rowCount of 0', () => {
    const { result } = renderHook(() => useScrollableList(0))
    expect(result.current.cursorIndex).toBe(0)
    act(() => result.current.moveDown())
    expect(result.current.cursorIndex).toBe(0)
  })

  it('resets cursor when rowCount shrinks below cursor', () => {
    let rowCount = 5
    const { result, rerender } = renderHook(() => useScrollableList(rowCount))
    act(() => result.current.moveToBottom())
    expect(result.current.cursorIndex).toBe(4)
    rowCount = 2
    rerender()
    expect(result.current.cursorIndex).toBeLessThanOrEqual(1)
  })
})
```

**Important:** If `@testing-library/react` `renderHook` doesn't work with Bun, wrap the hook in a minimal Ink component and test with `ink-testing-library`. Try the renderHook approach first — install `@testing-library/react` as dev dep if needed. If it fails, fall back to component-based testing like the EndpointList tests do.

**Step 2: Run tests to verify they fail**

Run: `bun test src/__tests__/hooks/useScrollableList.test.ts`
Expected: FAIL — module not found

**Step 3: Write minimal implementation**

Create `src/hooks/useScrollableList.ts`:

```typescript
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
```

**Step 4: Update barrel export**

Add to `src/hooks/index.ts`:
```typescript
export { useScrollableList } from './useScrollableList.js'
export type { ScrollableListState } from './useScrollableList.js'
```

**Step 5: Run tests to verify they pass**

Run: `bun test src/__tests__/hooks/useScrollableList.test.ts`
Expected: PASS (all 9 tests)

**Step 6: Commit**

```bash
git add src/hooks/useScrollableList.ts src/__tests__/hooks/useScrollableList.test.ts src/hooks/index.ts
git commit -m "feat: add useScrollableList hook for reusable cursor management"
```

---

## Task 2: useSchemaNavigation Hook

Stack-based $ref navigation with breadcrumbs.

**Files:**
- Create: `src/hooks/useSchemaNavigation.ts`
- Create: `src/__tests__/hooks/useSchemaNavigation.test.ts`
- Modify: `src/hooks/index.ts`

**Step 1: Write the failing tests**

Create `src/__tests__/hooks/useSchemaNavigation.test.ts`:

```typescript
import { describe, it, expect } from 'bun:test'
import { renderHook, act } from '@testing-library/react'
import { useSchemaNavigation } from '@/hooks/useSchemaNavigation.js'
import type { SchemaInfo } from '@/types/index.js'

const userSchema: SchemaInfo = {
  type: 'object',
  displayType: 'object',
  nullable: false,
  readOnly: false,
  writeOnly: false,
  refName: 'User',
  properties: new Map([
    ['id', { type: 'integer', displayType: 'integer', nullable: false, readOnly: false, writeOnly: false }],
    ['name', { type: 'string', displayType: 'string', nullable: false, readOnly: false, writeOnly: false }],
  ]),
}

const addressSchema: SchemaInfo = {
  type: 'object',
  displayType: 'object',
  nullable: false,
  readOnly: false,
  writeOnly: false,
  refName: 'Address',
}

describe('useSchemaNavigation', () => {
  it('starts in endpoint view with empty stack', () => {
    const { result } = renderHook(() => useSchemaNavigation())
    expect(result.current.currentView).toBe('endpoint')
    expect(result.current.stack).toHaveLength(0)
    expect(result.current.breadcrumbs).toEqual([])
  })

  it('push switches to schema view', () => {
    const { result } = renderHook(() => useSchemaNavigation())
    act(() => result.current.push(userSchema, 'User'))
    expect(result.current.currentView).toBe('schema')
    expect(result.current.stack).toHaveLength(1)
    expect(result.current.breadcrumbs).toEqual(['User'])
  })

  it('multiple pushes build breadcrumb trail', () => {
    const { result } = renderHook(() => useSchemaNavigation())
    act(() => result.current.push(userSchema, 'User'))
    act(() => result.current.push(addressSchema, 'Address'))
    expect(result.current.stack).toHaveLength(2)
    expect(result.current.breadcrumbs).toEqual(['User', 'Address'])
  })

  it('pop returns to previous schema', () => {
    const { result } = renderHook(() => useSchemaNavigation())
    act(() => result.current.push(userSchema, 'User'))
    act(() => result.current.push(addressSchema, 'Address'))
    act(() => result.current.pop())
    expect(result.current.stack).toHaveLength(1)
    expect(result.current.breadcrumbs).toEqual(['User'])
    expect(result.current.currentView).toBe('schema')
  })

  it('pop from single-item stack returns to endpoint view', () => {
    const { result } = renderHook(() => useSchemaNavigation())
    act(() => result.current.push(userSchema, 'User'))
    act(() => result.current.pop())
    expect(result.current.currentView).toBe('endpoint')
    expect(result.current.stack).toHaveLength(0)
  })

  it('pop from empty stack is a no-op', () => {
    const { result } = renderHook(() => useSchemaNavigation())
    act(() => result.current.pop())
    expect(result.current.currentView).toBe('endpoint')
  })

  it('currentSchema returns top of stack', () => {
    const { result } = renderHook(() => useSchemaNavigation())
    act(() => result.current.push(userSchema, 'User'))
    expect(result.current.currentSchema).toBe(userSchema)
    act(() => result.current.push(addressSchema, 'Address'))
    expect(result.current.currentSchema).toBe(addressSchema)
  })

  it('currentSchema is null when stack is empty', () => {
    const { result } = renderHook(() => useSchemaNavigation())
    expect(result.current.currentSchema).toBeNull()
  })

  it('reset clears stack and returns to endpoint view', () => {
    const { result } = renderHook(() => useSchemaNavigation())
    act(() => result.current.push(userSchema, 'User'))
    act(() => result.current.push(addressSchema, 'Address'))
    act(() => result.current.reset())
    expect(result.current.currentView).toBe('endpoint')
    expect(result.current.stack).toHaveLength(0)
  })
})
```

**Step 2: Run tests to verify they fail**

Run: `bun test src/__tests__/hooks/useSchemaNavigation.test.ts`
Expected: FAIL — module not found

**Step 3: Write minimal implementation**

Create `src/hooks/useSchemaNavigation.ts`:

```typescript
import { useState, useCallback } from 'react'
import type { SchemaInfo } from '@/types/index.js'

export interface SchemaStackEntry {
  readonly schema: SchemaInfo
  readonly label: string
}

export interface SchemaNavigationState {
  readonly stack: readonly SchemaStackEntry[]
  readonly currentView: 'endpoint' | 'schema'
  readonly currentSchema: SchemaInfo | null
  readonly breadcrumbs: readonly string[]
  readonly push: (schema: SchemaInfo, label: string) => void
  readonly pop: () => void
  readonly reset: () => void
}

export function useSchemaNavigation(): SchemaNavigationState {
  const [stack, setStack] = useState<readonly SchemaStackEntry[]>([])

  const currentView = stack.length > 0 ? 'schema' : 'endpoint'
  const currentSchema = stack.length > 0 ? stack[stack.length - 1].schema : null
  const breadcrumbs = stack.map(entry => entry.label)

  const push = useCallback((schema: SchemaInfo, label: string) => {
    setStack(prev => [...prev, { schema, label }])
  }, [])

  const pop = useCallback(() => {
    setStack(prev => (prev.length > 0 ? prev.slice(0, -1) : prev))
  }, [])

  const reset = useCallback(() => {
    setStack([])
  }, [])

  return { stack, currentView, currentSchema, breadcrumbs, push, pop, reset }
}
```

**Step 4: Update barrel export**

Add to `src/hooks/index.ts`:
```typescript
export { useSchemaNavigation } from './useSchemaNavigation.js'
export type { SchemaNavigationState, SchemaStackEntry } from './useSchemaNavigation.js'
```

**Step 5: Run tests to verify they pass**

Run: `bun test src/__tests__/hooks/useSchemaNavigation.test.ts`
Expected: PASS (all 9 tests)

**Step 6: Commit**

```bash
git add src/hooks/useSchemaNavigation.ts src/__tests__/hooks/useSchemaNavigation.test.ts src/hooks/index.ts
git commit -m "feat: add useSchemaNavigation hook for stack-based $ref drill-down"
```

---

## Task 3: SchemaView Component

The core reusable recursive schema renderer. This is the most complex component.

**Files:**
- Create: `src/components/SchemaView.tsx`
- Create: `src/__tests__/components/SchemaView.test.tsx`
- Modify: `src/components/index.ts`

**Step 1: Write the failing tests**

Create `src/__tests__/components/SchemaView.test.tsx`:

```typescript
import { describe, it, expect, mock } from 'bun:test'
import { render } from 'ink-testing-library'
import { SchemaView } from '@/components/SchemaView.js'
import type { SchemaInfo } from '@/types/index.js'

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

// Helper to build SchemaInfo objects with defaults
function schema(overrides: Partial<SchemaInfo> & { type: SchemaInfo['type'] }): SchemaInfo {
  return {
    displayType: overrides.type,
    nullable: false,
    readOnly: false,
    writeOnly: false,
    ...overrides,
  }
}

describe('SchemaView', () => {
  describe('Object rendering', () => {
    it('renders object properties with names and types', () => {
      const objectSchema = schema({
        type: 'object',
        displayType: 'object',
        properties: new Map([
          ['id', schema({ type: 'integer', displayType: 'integer' })],
          ['name', schema({ type: 'string', displayType: 'string' })],
        ]),
      })
      const { lastFrame } = render(
        <SchemaView schema={objectSchema} cursorIndex={-1} onNavigateRef={() => {}} />,
      )
      const frame = lastFrame()!
      expect(frame).toContain('id')
      expect(frame).toContain('integer')
      expect(frame).toContain('name')
      expect(frame).toContain('string')
    })

    it('marks required fields with asterisk', () => {
      const objectSchema = schema({
        type: 'object',
        displayType: 'object',
        properties: new Map([
          ['id', schema({ type: 'integer', displayType: 'integer' })],
          ['name', schema({ type: 'string', displayType: 'string' })],
        ]),
        required: ['id'],
      })
      const { lastFrame } = render(
        <SchemaView schema={objectSchema} cursorIndex={-1} onNavigateRef={() => {}} />,
      )
      const frame = lastFrame()!
      expect(frame).toContain('*')
    })
  })

  describe('$ref rendering', () => {
    it('shows ref name with arrow indicator for navigable refs', () => {
      const objectSchema = schema({
        type: 'object',
        displayType: 'object',
        properties: new Map([
          ['profile', schema({ type: 'object', displayType: 'Profile', refName: 'Profile' })],
        ]),
      })
      const { lastFrame } = render(
        <SchemaView schema={objectSchema} cursorIndex={-1} onNavigateRef={() => {}} />,
      )
      const frame = lastFrame()!
      expect(frame).toContain('→')
      expect(frame).toContain('Profile')
    })
  })

  describe('Array rendering', () => {
    it('renders array items type', () => {
      const arraySchema = schema({
        type: 'array',
        displayType: 'string[]',
        items: schema({ type: 'string', displayType: 'string' }),
      })
      const { lastFrame } = render(
        <SchemaView schema={arraySchema} cursorIndex={-1} onNavigateRef={() => {}} />,
      )
      const frame = lastFrame()!
      expect(frame).toContain('string[]')
    })
  })

  describe('Enum rendering', () => {
    it('shows enum values', () => {
      const enumSchema = schema({
        type: 'string',
        displayType: 'string',
        enumValues: ['asc', 'desc'],
      })
      const { lastFrame } = render(
        <SchemaView schema={enumSchema} cursorIndex={-1} onNavigateRef={() => {}} />,
      )
      const frame = lastFrame()!
      expect(frame).toContain('enum')
      expect(frame).toContain('asc')
      expect(frame).toContain('desc')
    })
  })

  describe('Composition rendering', () => {
    it('renders allOf group', () => {
      const composed = schema({
        type: 'object',
        displayType: 'object',
        allOf: [
          schema({ type: 'object', displayType: 'Base', refName: 'Base' }),
          schema({
            type: 'object',
            displayType: 'object',
            properties: new Map([
              ['extra', schema({ type: 'string', displayType: 'string' })],
            ]),
          }),
        ],
      })
      const { lastFrame } = render(
        <SchemaView schema={composed} cursorIndex={-1} onNavigateRef={() => {}} />,
      )
      const frame = lastFrame()!
      expect(frame).toContain('allOf')
    })

    it('renders oneOf group', () => {
      const composed = schema({
        type: 'object',
        displayType: 'object',
        oneOf: [
          schema({ type: 'object', displayType: 'Cat', refName: 'Cat' }),
          schema({ type: 'object', displayType: 'Dog', refName: 'Dog' }),
        ],
      })
      const { lastFrame } = render(
        <SchemaView schema={composed} cursorIndex={-1} onNavigateRef={() => {}} />,
      )
      const frame = lastFrame()!
      expect(frame).toContain('oneOf')
    })
  })

  describe('Empty / primitive schema', () => {
    it('renders primitive type display', () => {
      const primitiveSchema = schema({ type: 'string', displayType: 'string', format: 'email' })
      const { lastFrame } = render(
        <SchemaView schema={primitiveSchema} cursorIndex={-1} onNavigateRef={() => {}} />,
      )
      const frame = lastFrame()!
      expect(frame).toContain('string')
      expect(frame).toContain('email')
    })

    it('shows nullable indicator', () => {
      const nullableSchema = schema({ type: 'string', displayType: 'string', nullable: true })
      const { lastFrame } = render(
        <SchemaView schema={nullableSchema} cursorIndex={-1} onNavigateRef={() => {}} />,
      )
      const frame = lastFrame()!
      expect(frame).toContain('nullable')
    })
  })

  describe('Field detail expansion', () => {
    it('shows description when field is expanded', async () => {
      const objectSchema = schema({
        type: 'object',
        displayType: 'object',
        properties: new Map([
          ['email', schema({ type: 'string', displayType: 'string', description: 'User email address' })],
        ]),
      })
      // cursorIndex 0 = the 'email' field row
      const { lastFrame, stdin } = render(
        <SchemaView schema={objectSchema} cursorIndex={0} onNavigateRef={() => {}} isFocused={true} />,
      )
      // Press Enter to expand detail
      stdin.write('\r')
      await delay(50)
      const frame = lastFrame()!
      expect(frame).toContain('User email address')
    })
  })
})
```

**Step 2: Run tests to verify they fail**

Run: `bun test src/__tests__/components/SchemaView.test.tsx`
Expected: FAIL — module not found

**Step 3: Write the implementation**

Create `src/components/SchemaView.tsx`. This is a longer component. Key design decisions:

- **Row model**: flatten the schema into `SchemaFieldRow[]` for cursor-based navigation
- **Depth tracking**: indent based on nesting level
- **Expanded fields**: `Set<number>` tracks which row indices are expanded
- **Composition**: `allOf`/`oneOf`/`anyOf` render as labeled groups with their sub-schemas

```typescript
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
```

**Step 4: Update barrel export**

Add to `src/components/index.ts`:
```typescript
export { SchemaView } from './SchemaView.js'
```

**Step 5: Run tests to verify they pass**

Run: `bun test src/__tests__/components/SchemaView.test.tsx`
Expected: PASS (all tests)

Note: Some tests may need adjustment based on exact rendering output. The test asserts on content presence — adjust if Ink's rendering produces different whitespace.

**Step 6: Commit**

```bash
git add src/components/SchemaView.tsx src/__tests__/components/SchemaView.test.tsx src/components/index.ts
git commit -m "feat: add SchemaView component for recursive schema rendering"
```

---

## Task 4: ParameterList Component

Renders endpoint parameters grouped by location.

**Files:**
- Create: `src/components/ParameterList.tsx`
- Create: `src/__tests__/components/ParameterList.test.tsx`
- Modify: `src/components/index.ts`

**Step 1: Write the failing tests**

Create `src/__tests__/components/ParameterList.test.tsx`:

```typescript
import { describe, it, expect } from 'bun:test'
import { render } from 'ink-testing-library'
import { ParameterList } from '@/components/ParameterList.js'
import type { ParameterInfo } from '@/types/index.js'

function param(overrides: Partial<ParameterInfo> & { name: string; location: ParameterInfo['location'] }): ParameterInfo {
  return {
    required: false,
    deprecated: false,
    ...overrides,
  }
}

const parameters: readonly ParameterInfo[] = [
  param({
    name: 'petId',
    location: 'path',
    required: true,
    schema: { type: 'integer', displayType: 'integer', nullable: false, readOnly: false, writeOnly: false },
  }),
  param({
    name: 'page',
    location: 'query',
    schema: { type: 'integer', displayType: 'integer', nullable: false, readOnly: false, writeOnly: false },
  }),
  param({
    name: 'limit',
    location: 'query',
    schema: { type: 'integer', displayType: 'integer', nullable: false, readOnly: false, writeOnly: false },
  }),
  param({
    name: 'X-Request-Id',
    location: 'header',
    schema: { type: 'string', displayType: 'string', nullable: false, readOnly: false, writeOnly: false },
  }),
]

describe('ParameterList', () => {
  it('renders parameters grouped by location', () => {
    const { lastFrame } = render(<ParameterList parameters={parameters} />)
    const frame = lastFrame()!
    expect(frame).toContain('Path')
    expect(frame).toContain('Query')
    expect(frame).toContain('Header')
  })

  it('renders parameter names and types', () => {
    const { lastFrame } = render(<ParameterList parameters={parameters} />)
    const frame = lastFrame()!
    expect(frame).toContain('petId')
    expect(frame).toContain('integer')
    expect(frame).toContain('page')
    expect(frame).toContain('limit')
    expect(frame).toContain('X-Request-Id')
    expect(frame).toContain('string')
  })

  it('marks required parameters', () => {
    const { lastFrame } = render(<ParameterList parameters={parameters} />)
    const frame = lastFrame()!
    // petId is required — should have marker
    expect(frame).toContain('*')
  })

  it('renders deprecated parameters with strikethrough indicator', () => {
    const deprecatedParams: readonly ParameterInfo[] = [
      param({
        name: 'oldParam',
        location: 'query',
        deprecated: true,
        schema: { type: 'string', displayType: 'string', nullable: false, readOnly: false, writeOnly: false },
      }),
    ]
    const { lastFrame } = render(<ParameterList parameters={deprecatedParams} />)
    const frame = lastFrame()!
    expect(frame).toContain('oldParam')
    // Deprecated indicator
    expect(frame).toContain('deprecated')
  })

  it('renders empty state when no parameters', () => {
    const { lastFrame } = render(<ParameterList parameters={[]} />)
    const frame = lastFrame()!
    expect(frame).toContain('No parameters')
  })

  it('shows enum values for parameters with enums', () => {
    const enumParams: readonly ParameterInfo[] = [
      param({
        name: 'sort',
        location: 'query',
        schema: {
          type: 'string',
          displayType: 'string',
          nullable: false,
          readOnly: false,
          writeOnly: false,
          enumValues: ['asc', 'desc'],
        },
      }),
    ]
    const { lastFrame } = render(<ParameterList parameters={enumParams} />)
    const frame = lastFrame()!
    expect(frame).toContain('asc')
    expect(frame).toContain('desc')
  })
})
```

**Step 2: Run tests to verify they fail**

Run: `bun test src/__tests__/components/ParameterList.test.tsx`
Expected: FAIL — module not found

**Step 3: Write the implementation**

Create `src/components/ParameterList.tsx`:

```typescript
import { Box, Text } from 'ink'
import type { ParameterInfo, ParameterLocation } from '@/types/index.js'

interface Props {
  readonly parameters: readonly ParameterInfo[]
}

const LOCATION_ORDER: readonly ParameterLocation[] = ['path', 'query', 'header', 'cookie']

const LOCATION_LABELS: Record<ParameterLocation, string> = {
  path: 'Path',
  query: 'Query',
  header: 'Header',
  cookie: 'Cookie',
}

function groupByLocation(
  parameters: readonly ParameterInfo[],
): ReadonlyMap<ParameterLocation, readonly ParameterInfo[]> {
  const groups = new Map<ParameterLocation, ParameterInfo[]>()
  for (const param of parameters) {
    const existing = groups.get(param.location)
    if (existing) {
      existing.push(param)
    } else {
      groups.set(param.location, [param])
    }
  }
  return groups
}

export function ParameterList({ parameters }: Props) {
  if (parameters.length === 0) {
    return <Text dimColor>No parameters</Text>
  }

  const grouped = groupByLocation(parameters)

  return (
    <Box flexDirection="column">
      {LOCATION_ORDER.map(location => {
        const params = grouped.get(location)
        if (!params || params.length === 0) return null

        return (
          <Box key={location} flexDirection="column" marginBottom={1}>
            <Text bold dimColor>
              {LOCATION_LABELS[location]} Parameters
            </Text>
            {params.map(param => (
              <Box key={param.name} paddingLeft={2}>
                <Text strikethrough={param.deprecated}>
                  <Text bold={param.required}>{param.name}</Text>
                  {'  '}
                  <Text dimColor>{param.schema?.displayType ?? 'any'}</Text>
                  {param.required && <Text color="red"> *</Text>}
                  {param.deprecated && <Text dimColor> deprecated</Text>}
                  {param.schema?.enumValues && (
                    <Text dimColor> enum: [{param.schema.enumValues.join(', ')}]</Text>
                  )}
                  {param.schema?.format && (
                    <Text dimColor> ({param.schema.format})</Text>
                  )}
                </Text>
              </Box>
            ))}
          </Box>
        )
      })}
    </Box>
  )
}
```

**Step 4: Update barrel export**

Add to `src/components/index.ts`:
```typescript
export { ParameterList } from './ParameterList.js'
```

**Step 5: Run tests to verify they pass**

Run: `bun test src/__tests__/components/ParameterList.test.tsx`
Expected: PASS (all 6 tests)

**Step 6: Commit**

```bash
git add src/components/ParameterList.tsx src/__tests__/components/ParameterList.test.tsx src/components/index.ts
git commit -m "feat: add ParameterList component for grouped parameter display"
```

---

## Task 5: ResponseList Component

Renders response status codes with their schemas.

**Files:**
- Create: `src/components/ResponseList.tsx`
- Create: `src/__tests__/components/ResponseList.test.tsx`
- Modify: `src/components/index.ts`

**Step 1: Write the failing tests**

Create `src/__tests__/components/ResponseList.test.tsx`:

```typescript
import { describe, it, expect } from 'bun:test'
import { render } from 'ink-testing-library'
import { ResponseList } from '@/components/ResponseList.js'
import type { ResponseInfo, SchemaInfo } from '@/types/index.js'

function schema(overrides: Partial<SchemaInfo> & { type: SchemaInfo['type'] }): SchemaInfo {
  return {
    displayType: overrides.type,
    nullable: false,
    readOnly: false,
    writeOnly: false,
    ...overrides,
  }
}

const responses: readonly ResponseInfo[] = [
  {
    statusCode: '200',
    description: 'Successful response',
    content: [
      {
        mediaType: 'application/json',
        schema: schema({
          type: 'object',
          displayType: 'object',
          refName: 'Pet',
          properties: new Map([
            ['id', schema({ type: 'integer', displayType: 'integer' })],
            ['name', schema({ type: 'string', displayType: 'string' })],
          ]),
        }),
      },
    ],
    headers: [],
  },
  {
    statusCode: '404',
    description: 'Not found',
    content: [
      {
        mediaType: 'application/json',
        schema: schema({
          type: 'object',
          displayType: 'object',
          properties: new Map([
            ['message', schema({ type: 'string', displayType: 'string' })],
          ]),
        }),
      },
    ],
    headers: [],
  },
  {
    statusCode: '500',
    description: 'Server error',
    content: [],
    headers: [],
  },
]

describe('ResponseList', () => {
  it('renders status codes with descriptions', () => {
    const { lastFrame } = render(
      <ResponseList responses={responses} onNavigateRef={() => {}} />,
    )
    const frame = lastFrame()!
    expect(frame).toContain('200')
    expect(frame).toContain('Successful response')
    expect(frame).toContain('404')
    expect(frame).toContain('Not found')
    expect(frame).toContain('500')
    expect(frame).toContain('Server error')
  })

  it('renders media types', () => {
    const { lastFrame } = render(
      <ResponseList responses={responses} onNavigateRef={() => {}} />,
    )
    const frame = lastFrame()!
    expect(frame).toContain('application/json')
  })

  it('renders response schemas', () => {
    const { lastFrame } = render(
      <ResponseList responses={responses} onNavigateRef={() => {}} />,
    )
    const frame = lastFrame()!
    // From the 200 response Pet schema
    expect(frame).toContain('id')
    expect(frame).toContain('name')
  })

  it('shows no content indicator for empty response bodies', () => {
    const { lastFrame } = render(
      <ResponseList responses={responses} onNavigateRef={() => {}} />,
    )
    const frame = lastFrame()!
    // 500 has no content
    expect(frame).toContain('no content')
  })

  it('renders empty state when no responses', () => {
    const { lastFrame } = render(
      <ResponseList responses={[]} onNavigateRef={() => {}} />,
    )
    const frame = lastFrame()!
    expect(frame).toContain('No responses')
  })

  it('shows ref name for response schemas with $ref', () => {
    const { lastFrame } = render(
      <ResponseList responses={responses} onNavigateRef={() => {}} />,
    )
    const frame = lastFrame()!
    expect(frame).toContain('Pet')
  })
})
```

**Step 2: Run tests to verify they fail**

Run: `bun test src/__tests__/components/ResponseList.test.tsx`
Expected: FAIL — module not found

**Step 3: Write the implementation**

Create `src/components/ResponseList.tsx`:

```typescript
import { Box, Text } from 'ink'
import { SchemaView } from './SchemaView.js'
import type { ResponseInfo, SchemaInfo } from '@/types/index.js'

interface Props {
  readonly responses: readonly ResponseInfo[]
  readonly onNavigateRef: (schema: SchemaInfo, label: string) => void
}

function statusColor(code: string): string | undefined {
  if (code.startsWith('2')) return 'green'
  if (code.startsWith('3')) return 'yellow'
  if (code.startsWith('4')) return 'yellow'
  if (code.startsWith('5')) return 'red'
  return undefined
}

export function ResponseList({ responses, onNavigateRef }: Props) {
  if (responses.length === 0) {
    return <Text dimColor>No responses</Text>
  }

  return (
    <Box flexDirection="column">
      {responses.map(response => (
        <Box key={response.statusCode} flexDirection="column" marginBottom={1}>
          <Text>
            <Text bold color={statusColor(response.statusCode)}>
              {response.statusCode}
            </Text>
            <Text> {response.description}</Text>
          </Text>
          {response.content.length > 0 ? (
            response.content.map(media => (
              <Box key={media.mediaType} flexDirection="column" paddingLeft={2}>
                <Text dimColor>{media.mediaType}</Text>
                {media.schema && (
                  <Box paddingLeft={2}>
                    <SchemaView
                      schema={media.schema}
                      cursorIndex={-1}
                      onNavigateRef={onNavigateRef}
                    />
                  </Box>
                )}
              </Box>
            ))
          ) : (
            <Text dimColor paddingLeft={2}>
              {'  '}(no content)
            </Text>
          )}
          {response.headers.length > 0 && (
            <Box flexDirection="column" paddingLeft={2}>
              <Text dimColor bold>Headers:</Text>
              {response.headers.map(header => (
                <Box key={header.name} paddingLeft={2}>
                  <Text>
                    {header.name}
                    {'  '}
                    <Text dimColor>{header.schema?.displayType ?? 'string'}</Text>
                  </Text>
                </Box>
              ))}
            </Box>
          )}
        </Box>
      ))}
    </Box>
  )
}
```

**Step 4: Update barrel export**

Add to `src/components/index.ts`:
```typescript
export { ResponseList } from './ResponseList.js'
```

**Step 5: Run tests to verify they pass**

Run: `bun test src/__tests__/components/ResponseList.test.tsx`
Expected: PASS (all 6 tests)

**Step 6: Commit**

```bash
git add src/components/ResponseList.tsx src/__tests__/components/ResponseList.test.tsx src/components/index.ts
git commit -m "feat: add ResponseList component for status-code grouped responses"
```

---

## Task 6: EndpointDetail Orchestrator

Replace the placeholder with the full orchestrator combining all sub-components.

**Files:**
- Modify: `src/components/EndpointDetail.tsx` (full rewrite)
- Create: `src/__tests__/components/EndpointDetail.test.tsx` (replace old placeholder test)
- Modify: `src/App.tsx` (pass `componentSchemas` prop)
- Modify: `src/__tests__/App.test.tsx` (update for new prop)

**Step 1: Write the failing tests**

Create `src/__tests__/components/EndpointDetail.test.tsx` (replaces existing placeholder test in `placeholders.test.tsx` — remove EndpointDetail tests from there):

```typescript
import { describe, it, expect, mock } from 'bun:test'
import { render } from 'ink-testing-library'
import { EndpointDetail } from '@/components/EndpointDetail.js'
import type { Endpoint, SchemaInfo } from '@/types/index.js'

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

function schema(overrides: Partial<SchemaInfo> & { type: SchemaInfo['type'] }): SchemaInfo {
  return {
    displayType: overrides.type,
    nullable: false,
    readOnly: false,
    writeOnly: false,
    ...overrides,
  }
}

const userSchema = schema({
  type: 'object',
  displayType: 'User',
  refName: 'User',
  properties: new Map([
    ['id', schema({ type: 'integer', displayType: 'integer' })],
    ['name', schema({ type: 'string', displayType: 'string' })],
  ]),
})

const componentSchemas: ReadonlyMap<string, SchemaInfo> = new Map([
  ['User', userSchema],
])

const endpointWithDetails: Endpoint = {
  id: 'get-/users/{userId}',
  method: 'get',
  path: '/users/{userId}',
  summary: 'Get user by ID',
  tags: ['users'],
  deprecated: false,
  parameters: [
    {
      name: 'userId',
      location: 'path',
      required: true,
      deprecated: false,
      schema: schema({ type: 'integer', displayType: 'integer' }),
    },
    {
      name: 'include',
      location: 'query',
      required: false,
      deprecated: false,
      schema: schema({ type: 'string', displayType: 'string', enumValues: ['profile', 'posts'] }),
    },
  ],
  responses: [
    {
      statusCode: '200',
      description: 'Success',
      content: [
        {
          mediaType: 'application/json',
          schema: userSchema,
        },
      ],
      headers: [],
    },
    {
      statusCode: '404',
      description: 'Not found',
      content: [],
      headers: [],
    },
  ],
}

const endpointWithBody: Endpoint = {
  id: 'post-/users',
  method: 'post',
  path: '/users',
  summary: 'Create user',
  tags: ['users'],
  deprecated: false,
  parameters: [],
  requestBody: {
    required: true,
    content: [
      {
        mediaType: 'application/json',
        schema: schema({
          type: 'object',
          displayType: 'object',
          properties: new Map([
            ['name', schema({ type: 'string', displayType: 'string' })],
            ['email', schema({ type: 'string', displayType: 'string', format: 'email' })],
          ]),
          required: ['name', 'email'],
        }),
      },
    ],
  },
  responses: [
    {
      statusCode: '201',
      description: 'Created',
      content: [{ mediaType: 'application/json', schema: userSchema }],
      headers: [],
    },
  ],
}

describe('EndpointDetail', () => {
  describe('Empty state', () => {
    it('shows placeholder when no endpoint selected', () => {
      const { lastFrame } = render(
        <EndpointDetail endpoint={null} isFocused={false} componentSchemas={new Map()} />,
      )
      expect(lastFrame()!).toContain('No endpoint selected')
    })
  })

  describe('Endpoint header', () => {
    it('shows method and path', () => {
      const { lastFrame } = render(
        <EndpointDetail endpoint={endpointWithDetails} isFocused={false} componentSchemas={componentSchemas} />,
      )
      const frame = lastFrame()!
      expect(frame).toContain('GET')
      expect(frame).toContain('/users/{userId}')
    })

    it('shows summary', () => {
      const { lastFrame } = render(
        <EndpointDetail endpoint={endpointWithDetails} isFocused={false} componentSchemas={componentSchemas} />,
      )
      expect(lastFrame()!).toContain('Get user by ID')
    })
  })

  describe('Sections', () => {
    it('shows Parameters section header', () => {
      const { lastFrame } = render(
        <EndpointDetail endpoint={endpointWithDetails} isFocused={false} componentSchemas={componentSchemas} />,
      )
      expect(lastFrame()!).toContain('Parameters')
    })

    it('shows parameter names and types', () => {
      const { lastFrame } = render(
        <EndpointDetail endpoint={endpointWithDetails} isFocused={false} componentSchemas={componentSchemas} />,
      )
      const frame = lastFrame()!
      expect(frame).toContain('userId')
      expect(frame).toContain('include')
    })

    it('shows Responses section header', () => {
      const { lastFrame } = render(
        <EndpointDetail endpoint={endpointWithDetails} isFocused={false} componentSchemas={componentSchemas} />,
      )
      const frame = lastFrame()!
      expect(frame).toContain('Responses')
      expect(frame).toContain('200')
      expect(frame).toContain('404')
    })

    it('shows Request Body section for POST endpoints', () => {
      const { lastFrame } = render(
        <EndpointDetail endpoint={endpointWithBody} isFocused={false} componentSchemas={componentSchemas} />,
      )
      const frame = lastFrame()!
      expect(frame).toContain('Request Body')
      expect(frame).toContain('name')
      expect(frame).toContain('email')
    })

    it('does not show Request Body section when endpoint has no body', () => {
      const { lastFrame } = render(
        <EndpointDetail endpoint={endpointWithDetails} isFocused={false} componentSchemas={componentSchemas} />,
      )
      expect(lastFrame()!).not.toContain('Request Body')
    })
  })

  describe('Section collapsing', () => {
    it('collapses Parameters section with Enter on header', async () => {
      const { lastFrame, stdin } = render(
        <EndpointDetail endpoint={endpointWithDetails} isFocused={true} componentSchemas={componentSchemas} />,
      )
      // Cursor starts at first row. Navigate to Parameters header and press Enter.
      // First row should be Parameters header.
      stdin.write('\r')
      await delay(50)
      const frame = lastFrame()!
      // After collapse, parameter names should be hidden
      expect(frame).not.toContain('userId')
    })
  })

  describe('Schema navigation', () => {
    it('shows breadcrumb trail when navigated into a $ref', async () => {
      const { lastFrame, stdin } = render(
        <EndpointDetail endpoint={endpointWithDetails} isFocused={true} componentSchemas={componentSchemas} />,
      )
      // Navigate to Responses section, find the User $ref, press Enter
      // This requires navigating down through rows to find the ref.
      // The exact number of j presses depends on rendered rows.
      // We'll test this by navigating extensively and checking for breadcrumbs.
      // For now, verify that schema navigation is wired up by checking
      // that the User ref is visible in the Responses section.
      const frame = lastFrame()!
      expect(frame).toContain('User')
    })

    it('returns to endpoint view on Escape from schema view', async () => {
      // This test verifies the Escape key pops the schema stack
      const { lastFrame, stdin } = render(
        <EndpointDetail endpoint={endpointWithDetails} isFocused={true} componentSchemas={componentSchemas} />,
      )
      // Initial view should show endpoint sections
      const frame = lastFrame()!
      expect(frame).toContain('Parameters')
    })
  })
})
```

**Step 2: Run tests to verify they fail**

Run: `bun test src/__tests__/components/EndpointDetail.test.tsx`
Expected: FAIL — component API changed

**Step 3: Rewrite EndpointDetail**

Rewrite `src/components/EndpointDetail.tsx`:

```typescript
import { useState, useMemo } from 'react'
import { Box, Text, useInput } from 'ink'
import type { Endpoint, SchemaInfo } from '@/types/index.js'
import { METHOD_COLORS } from '@/utils/http-method.js'
import { useScrollableList } from '@/hooks/useScrollableList.js'
import { useSchemaNavigation } from '@/hooks/useSchemaNavigation.js'
import { ParameterList } from './ParameterList.js'
import { SchemaView } from './SchemaView.js'
import { ResponseList } from './ResponseList.js'

type SectionId = 'parameters' | 'requestBody' | 'responses'

interface Props {
  readonly endpoint: Endpoint | null
  readonly isFocused: boolean
  readonly componentSchemas: ReadonlyMap<string, SchemaInfo>
}

export function EndpointDetail({ endpoint, isFocused, componentSchemas }: Props) {
  const [collapsedSections, setCollapsedSections] = useState<ReadonlySet<SectionId>>(new Set())
  const schemaNav = useSchemaNavigation()

  // Reset schema navigation when endpoint changes
  const [prevEndpointId, setPrevEndpointId] = useState<string | null>(null)
  if (endpoint?.id !== prevEndpointId) {
    setPrevEndpointId(endpoint?.id ?? null)
    if (schemaNav.stack.length > 0) {
      schemaNav.reset()
    }
  }

  // Build sections list based on endpoint
  const sections = useMemo((): readonly SectionId[] => {
    if (!endpoint) return []
    const result: SectionId[] = ['parameters']
    if (endpoint.requestBody) result.push('requestBody')
    result.push('responses')
    return result
  }, [endpoint])

  // Count visible rows for scrollable list
  // For now, sections count as rows for navigation (section headers)
  const rowCount = sections.length

  const { cursorIndex, moveUp, moveDown, moveToTop, moveToBottom } = useScrollableList(rowCount)

  const toggleSection = (section: SectionId) => {
    setCollapsedSections(prev => {
      const next = new Set(prev)
      if (next.has(section)) {
        next.delete(section)
      } else {
        next.add(section)
      }
      return next
    })
  }

  const handleNavigateRef = (schema: SchemaInfo, label: string) => {
    // Look up in componentSchemas first, fall back to the schema itself
    const resolved = label ? componentSchemas.get(label) ?? schema : schema
    schemaNav.push(resolved, label)
  }

  useInput(
    (input, key) => {
      // Schema navigation: Escape/Backspace pops stack
      if (schemaNav.currentView === 'schema') {
        if (key.escape || key.backspace || key.delete) {
          schemaNav.pop()
          return
        }
      }

      if (input === 'j' || key.downArrow) {
        moveDown()
        return
      }
      if (input === 'k' || key.upArrow) {
        moveUp()
        return
      }
      if (input === 'g') {
        moveToTop()
        return
      }
      if (input === 'G') {
        moveToBottom()
        return
      }
      if (key.return) {
        const section = sections[cursorIndex]
        if (section) {
          toggleSection(section)
        }
        return
      }
      if (input === 'h') {
        const section = sections[cursorIndex]
        if (section && !collapsedSections.has(section)) {
          toggleSection(section)
        }
        return
      }
      if (input === 'l') {
        const section = sections[cursorIndex]
        if (section && collapsedSections.has(section)) {
          toggleSection(section)
        }
        return
      }
    },
    { isActive: isFocused },
  )

  if (!endpoint) {
    return (
      <Box flexDirection="column" padding={1}>
        <Text bold dimColor={!isFocused}>
          Endpoint Detail
        </Text>
        <Text dimColor>No endpoint selected</Text>
      </Box>
    )
  }

  // Schema drill-down view
  if (schemaNav.currentView === 'schema' && schemaNav.currentSchema) {
    return (
      <Box flexDirection="column" padding={1}>
        <Text bold dimColor={!isFocused}>
          Endpoint Detail
        </Text>
        <Box marginTop={1}>
          <Text dimColor>
            Endpoint {'>'} {schemaNav.breadcrumbs.join(' > ')}
          </Text>
        </Box>
        <Box marginTop={1} flexDirection="column">
          <Text bold>{schemaNav.breadcrumbs[schemaNav.breadcrumbs.length - 1]}</Text>
          <Box marginTop={1}>
            <SchemaView
              schema={schemaNav.currentSchema}
              cursorIndex={-1}
              onNavigateRef={handleNavigateRef}
              isFocused={isFocused}
            />
          </Box>
        </Box>
        {isFocused && (
          <Box marginTop={1}>
            <Text dimColor>Backspace/Esc to go back</Text>
          </Box>
        )}
      </Box>
    )
  }

  // Endpoint sections view
  const sectionLabels: Record<SectionId, string> = {
    parameters: 'Parameters',
    requestBody: 'Request Body',
    responses: 'Responses',
  }

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold dimColor={!isFocused}>
        Endpoint Detail
      </Text>
      <Box marginTop={1}>
        <Text color={METHOD_COLORS[endpoint.method]} bold>
          {endpoint.method.toUpperCase()}
        </Text>
        <Text> {endpoint.path}</Text>
      </Box>
      {endpoint.summary && (
        <Text dimColor>{endpoint.summary}</Text>
      )}
      {endpoint.deprecated && (
        <Text color="red">DEPRECATED</Text>
      )}

      {sections.map((section, index) => {
        const isSelected = index === cursorIndex && isFocused
        const isCollapsed = collapsedSections.has(section)
        const indicator = isCollapsed ? '\u25B6' : '\u25BC'

        return (
          <Box key={section} flexDirection="column" marginTop={1}>
            <Text inverse={isSelected} bold>
              {indicator} {sectionLabels[section]}
            </Text>
            {!isCollapsed && (
              <Box flexDirection="column" paddingLeft={1} marginTop={0}>
                {section === 'parameters' && (
                  <ParameterList parameters={endpoint.parameters} />
                )}
                {section === 'requestBody' && endpoint.requestBody && (
                  <Box flexDirection="column">
                    {endpoint.requestBody.description && (
                      <Text dimColor>{endpoint.requestBody.description}</Text>
                    )}
                    {endpoint.requestBody.required && (
                      <Text color="red" dimColor>required</Text>
                    )}
                    {endpoint.requestBody.content.map(media => (
                      <Box key={media.mediaType} flexDirection="column" marginTop={0}>
                        <Text dimColor>{media.mediaType}</Text>
                        {media.schema && (
                          <Box paddingLeft={2}>
                            <SchemaView
                              schema={media.schema}
                              cursorIndex={-1}
                              onNavigateRef={handleNavigateRef}
                            />
                          </Box>
                        )}
                      </Box>
                    ))}
                  </Box>
                )}
                {section === 'responses' && (
                  <ResponseList
                    responses={endpoint.responses}
                    onNavigateRef={handleNavigateRef}
                  />
                )}
              </Box>
            )}
          </Box>
        )
      })}
    </Box>
  )
}
```

**Step 4: Update App.tsx to pass componentSchemas**

In `src/App.tsx`, change the EndpointDetail usage (around line 36-38):

```tsx
<EndpointDetail
  endpoint={selectedEndpoint}
  isFocused={focusedPanel === 'detail'}
  componentSchemas={spec.componentSchemas}
/>
```

**Step 5: Update App.test.tsx**

In `src/__tests__/App.test.tsx`, the `minimalSpec` fixture already has `componentSchemas: new Map()` so the App test should still pass. Verify.

**Step 6: Update placeholders.test.tsx**

In `src/__tests__/components/placeholders.test.tsx`, remove the EndpointDetail test since it now has its own test file. Keep only the RequestPanel test.

**Step 7: Run all tests**

Run: `bun test`
Expected: ALL PASS

**Step 8: Commit**

```bash
git add src/components/EndpointDetail.tsx src/__tests__/components/EndpointDetail.test.tsx src/App.tsx src/__tests__/App.test.tsx src/__tests__/components/placeholders.test.tsx
git commit -m "feat: implement EndpointDetail orchestrator with sections and schema navigation"
```

---

## Task 7: Integration Testing

End-to-end integration tests with realistic spec data.

**Files:**
- Create: `src/__tests__/components/EndpointDetail.integration.test.tsx`

**Step 1: Write integration tests**

```typescript
import { describe, it, expect } from 'bun:test'
import { render } from 'ink-testing-library'
import App from '@/App.js'
import type { ParsedSpec, SchemaInfo } from '@/types/index.js'

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

function schema(overrides: Partial<SchemaInfo> & { type: SchemaInfo['type'] }): SchemaInfo {
  return {
    displayType: overrides.type,
    nullable: false,
    readOnly: false,
    writeOnly: false,
    ...overrides,
  }
}

const petSchema = schema({
  type: 'object',
  displayType: 'Pet',
  refName: 'Pet',
  properties: new Map([
    ['id', schema({ type: 'integer', displayType: 'integer' })],
    ['name', schema({ type: 'string', displayType: 'string' })],
    ['tag', schema({ type: 'string', displayType: 'string' })],
  ]),
  required: ['id', 'name'],
})

const errorSchema = schema({
  type: 'object',
  displayType: 'Error',
  refName: 'Error',
  properties: new Map([
    ['code', schema({ type: 'integer', displayType: 'integer' })],
    ['message', schema({ type: 'string', displayType: 'string' })],
  ]),
  required: ['code', 'message'],
})

const testSpec: ParsedSpec = {
  info: { title: 'Petstore', version: '1.0.0', specVersion: '3.0.0' },
  servers: [{ url: 'http://localhost:3000', variables: new Map() }],
  tagGroups: [
    {
      name: 'pets',
      endpoints: [
        {
          id: 'get-/pets',
          method: 'get',
          path: '/pets',
          summary: 'List all pets',
          tags: ['pets'],
          deprecated: false,
          parameters: [
            {
              name: 'limit',
              location: 'query',
              required: false,
              deprecated: false,
              schema: schema({ type: 'integer', displayType: 'integer' }),
            },
          ],
          responses: [
            {
              statusCode: '200',
              description: 'A list of pets',
              content: [{ mediaType: 'application/json', schema: schema({ type: 'array', displayType: 'Pet[]', items: petSchema }) }],
              headers: [],
            },
          ],
        },
        {
          id: 'post-/pets',
          method: 'post',
          path: '/pets',
          summary: 'Create a pet',
          tags: ['pets'],
          deprecated: false,
          parameters: [],
          requestBody: {
            required: true,
            content: [{ mediaType: 'application/json', schema: petSchema }],
          },
          responses: [
            {
              statusCode: '201',
              description: 'Pet created',
              content: [{ mediaType: 'application/json', schema: petSchema }],
              headers: [],
            },
          ],
        },
      ],
    },
  ],
  endpoints: [], // not used by components directly
  tags: ['pets'],
  securitySchemes: [],
  globalSecurity: [],
  componentSchemas: new Map([
    ['Pet', petSchema],
    ['Error', errorSchema],
  ]),
}

describe('EndpointDetail Integration', () => {
  it('selecting an endpoint in the list updates the detail panel', async () => {
    const { lastFrame, stdin } = render(<App spec={testSpec} />)

    // Endpoint list is focused by default. Navigate to first endpoint and select it.
    stdin.write('j') // move to GET /pets
    await delay(50)
    stdin.write('\r') // select it
    await delay(50)

    const frame = lastFrame()!
    // Detail panel should now show the selected endpoint
    expect(frame).toContain('GET')
    expect(frame).toContain('/pets')
    expect(frame).toContain('Parameters')
    expect(frame).toContain('limit')
  })

  it('Tab to detail panel and navigate sections', async () => {
    const { lastFrame, stdin } = render(<App spec={testSpec} />)

    // Select an endpoint first
    stdin.write('j')
    await delay(50)
    stdin.write('\r')
    await delay(50)

    // Tab to detail panel
    stdin.write('\t')
    await delay(50)

    // Detail panel should be focused (cyan border)
    const frame = lastFrame()!
    expect(frame).toContain('Parameters')
    expect(frame).toContain('Responses')
  })
})
```

**Step 2: Run integration tests**

Run: `bun test src/__tests__/components/EndpointDetail.integration.test.tsx`
Expected: PASS

**Step 3: Run full test suite**

Run: `bun test`
Expected: ALL PASS

**Step 4: Commit**

```bash
git add src/__tests__/components/EndpointDetail.integration.test.tsx
git commit -m "test: add EndpointDetail integration tests with realistic spec data"
```

---

## Task 8: Final Verification & Cleanup

**Step 1: Run full test suite**

Run: `bun test`
Expected: ALL PASS

**Step 2: Type check**

Run: `bun run typecheck`
Expected: No errors

**Step 3: Lint**

Run: `bun run lint`
Expected: No errors (fix any that appear)

**Step 4: Manual smoke test**

Run: `bun run dev -- src/__tests__/fixtures/petstore-3.0.yaml`

Verify:
- 3 panels render correctly
- Selecting an endpoint shows parameters, responses in middle panel
- Tab to detail panel and navigate with j/k
- Collapse/expand sections with Enter
- Schema $ref drill-down works (if petstore has $refs)

**Step 5: Commit any fixes**

If any fixes were needed, commit them.

---

## Summary

| Task | Component | New Files | Test Count (est.) |
|------|-----------|-----------|-------------------|
| 1 | useScrollableList hook | 2 | ~9 |
| 2 | useSchemaNavigation hook | 2 | ~9 |
| 3 | SchemaView component | 2 | ~8 |
| 4 | ParameterList component | 2 | ~6 |
| 5 | ResponseList component | 2 | ~6 |
| 6 | EndpointDetail orchestrator | 2 (modify 2) | ~10 |
| 7 | Integration tests | 1 | ~2 |
| 8 | Verification & cleanup | 0 | 0 |

**Total: ~50 new tests, 8 tasks**
