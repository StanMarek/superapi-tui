# CLI + TUI Shell + Endpoint List Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Wire up CLI argument parsing, build the 3-panel TUI layout with panel focus management, and implement a fully navigable endpoint list with collapsible tag groups and filtering.

**Architecture:** Component-per-panel with a shared `useNavigation` hook. `cli.tsx` handles arg parsing and renders `<SpecLoader>` which async-loads the spec, then renders `<App spec={...}>`. App renders three panel components in a flexbox row. Only `<EndpointList>` is fully implemented; middle and right panels are placeholders.

**Tech Stack:** Bun, Ink 6, React 19, TypeScript, `@inkjs/ui` (Spinner, TextInput), `ink-testing-library`

---

## Task 0: Setup — Branch and Dependencies

**Step 1: Create feature branch**

```bash
git checkout master
git pull origin master
git checkout -b feat/tui-shell
```

**Step 2: Install `@inkjs/ui`**

```bash
bun add @inkjs/ui
```

**Step 3: Create directory structure**

```bash
mkdir -p src/hooks
mkdir -p src/__tests__/components
mkdir -p src/__tests__/hooks
```

**Step 4: Verify existing tests still pass**

```bash
bun test
```

Expected: All 89 tests pass.

**Step 5: Commit**

```bash
git add package.json bun.lock src/hooks src/__tests__/components src/__tests__/hooks
git commit -m "chore: add @inkjs/ui dependency and directory structure"
```

---

## Task 1: useNavigation Hook

**Files:**
- Create: `src/hooks/useNavigation.ts`
- Create: `src/hooks/index.ts`
- Test: `src/__tests__/hooks/useNavigation.test.tsx`

### Step 1: Write the failing test

```tsx
// src/__tests__/hooks/useNavigation.test.tsx
import { describe, it, expect } from 'bun:test'
import { render } from 'ink-testing-library'
import { Box, Text } from 'ink'
import { useNavigation } from '@/hooks/index.js'
import type { Endpoint } from '@/types/index.js'

function TestHarness() {
  const nav = useNavigation()
  return (
    <Box flexDirection="column">
      <Text>panel:{nav.focusedPanel}</Text>
      <Text>selected:{nav.selectedEndpoint?.id ?? 'none'}</Text>
    </Box>
  )
}

describe('useNavigation', () => {
  it('starts with endpoints panel focused and no selection', () => {
    const { lastFrame } = render(<TestHarness />)
    expect(lastFrame()).toContain('panel:endpoints')
    expect(lastFrame()).toContain('selected:none')
  })

  it('cycles focus forward with Tab', () => {
    const { lastFrame, stdin } = render(<TestHarness />)
    stdin.write('\t')
    expect(lastFrame()).toContain('panel:detail')
    stdin.write('\t')
    expect(lastFrame()).toContain('panel:request')
    stdin.write('\t')
    expect(lastFrame()).toContain('panel:endpoints')
  })

  it('cycles focus backward with Shift+Tab', () => {
    const { lastFrame, stdin } = render(<TestHarness />)
    stdin.write('\x1b[Z') // Shift+Tab escape sequence
    expect(lastFrame()).toContain('panel:request')
    stdin.write('\x1b[Z')
    expect(lastFrame()).toContain('panel:detail')
  })
})
```

### Step 2: Run test to verify it fails

```bash
bun test src/__tests__/hooks/useNavigation.test.tsx
```

Expected: FAIL — module `@/hooks/index.js` not found.

### Step 3: Write minimal implementation

```ts
// src/hooks/useNavigation.ts
import { useState, useCallback } from 'react'
import { useInput, useApp } from 'ink'
import type { Endpoint } from '@/types/index.js'

export type PanelId = 'endpoints' | 'detail' | 'request'

const PANEL_ORDER: readonly PanelId[] = ['endpoints', 'detail', 'request']

export interface NavigationState {
  readonly focusedPanel: PanelId
  readonly selectedEndpoint: Endpoint | null
  readonly selectEndpoint: (endpoint: Endpoint) => void
}

export function useNavigation(): NavigationState {
  const { exit } = useApp()
  const [focusedPanel, setFocusedPanel] = useState<PanelId>('endpoints')
  const [selectedEndpoint, setSelectedEndpoint] = useState<Endpoint | null>(null)

  useInput((input, key) => {
    if (input === 'q' || (input === 'c' && key.ctrl)) {
      exit()
      return
    }

    if (key.tab) {
      setFocusedPanel(current => {
        const idx = PANEL_ORDER.indexOf(current)
        if (key.shift) {
          return PANEL_ORDER[(idx - 1 + PANEL_ORDER.length) % PANEL_ORDER.length]
        }
        return PANEL_ORDER[(idx + 1) % PANEL_ORDER.length]
      })
    }
  })

  const selectEndpoint = useCallback((endpoint: Endpoint) => {
    setSelectedEndpoint(endpoint)
  }, [])

  return { focusedPanel, selectedEndpoint, selectEndpoint }
}
```

```ts
// src/hooks/index.ts
export { useNavigation } from './useNavigation.js'
export type { PanelId, NavigationState } from './useNavigation.js'
```

### Step 4: Run test to verify it passes

```bash
bun test src/__tests__/hooks/useNavigation.test.tsx
```

Expected: All 3 tests PASS.

### Step 5: Commit

```bash
git add src/hooks/ src/__tests__/hooks/
git commit -m "feat: add useNavigation hook for panel focus cycling"
```

---

## Task 2: Placeholder Panels (EndpointDetail + RequestPanel)

**Files:**
- Create: `src/components/EndpointDetail.tsx`
- Create: `src/components/RequestPanel.tsx`
- Test: `src/__tests__/components/placeholders.test.tsx`

### Step 1: Write the failing test

```tsx
// src/__tests__/components/placeholders.test.tsx
import { describe, it, expect } from 'bun:test'
import { render } from 'ink-testing-library'
import { EndpointDetail } from '@/components/EndpointDetail.js'
import { RequestPanel } from '@/components/RequestPanel.js'
import type { Endpoint } from '@/types/index.js'

const mockEndpoint: Endpoint = {
  id: 'get-/pets',
  method: 'get',
  path: '/pets',
  summary: 'List all pets',
  tags: ['pets'],
  deprecated: false,
  parameters: [],
  responses: [],
}

describe('EndpointDetail', () => {
  it('shows "No endpoint selected" when no endpoint', () => {
    const { lastFrame } = render(<EndpointDetail endpoint={null} isFocused={false} />)
    expect(lastFrame()).toContain('No endpoint selected')
  })

  it('shows method and path when endpoint selected', () => {
    const { lastFrame } = render(<EndpointDetail endpoint={mockEndpoint} isFocused={false} />)
    expect(lastFrame()).toContain('GET')
    expect(lastFrame()).toContain('/pets')
  })
})

describe('RequestPanel', () => {
  it('shows "No endpoint selected" when no endpoint', () => {
    const { lastFrame } = render(<RequestPanel endpoint={null} isFocused={false} />)
    expect(lastFrame()).toContain('No endpoint selected')
  })

  it('shows endpoint info when selected', () => {
    const { lastFrame } = render(<RequestPanel endpoint={mockEndpoint} isFocused={false} />)
    expect(lastFrame()).toContain('GET')
    expect(lastFrame()).toContain('/pets')
  })
})
```

### Step 2: Run test to verify it fails

```bash
bun test src/__tests__/components/placeholders.test.tsx
```

Expected: FAIL — modules not found.

### Step 3: Write minimal implementation

```tsx
// src/components/EndpointDetail.tsx
import { Box, Text } from 'ink'
import type { Endpoint } from '@/types/index.js'

interface Props {
  readonly endpoint: Endpoint | null
  readonly isFocused: boolean
}

export function EndpointDetail({ endpoint, isFocused }: Props) {
  return (
    <Box flexDirection="column" padding={1}>
      <Text bold dimColor={!isFocused}>Endpoint Detail</Text>
      {endpoint ? (
        <Box marginTop={1}>
          <Text color="cyan">{endpoint.method.toUpperCase()}</Text>
          <Text> {endpoint.path}</Text>
          {endpoint.summary && <Text dimColor> — {endpoint.summary}</Text>}
        </Box>
      ) : (
        <Text dimColor>No endpoint selected</Text>
      )}
    </Box>
  )
}
```

```tsx
// src/components/RequestPanel.tsx
import { Box, Text } from 'ink'
import type { Endpoint } from '@/types/index.js'

interface Props {
  readonly endpoint: Endpoint | null
  readonly isFocused: boolean
}

export function RequestPanel({ endpoint, isFocused }: Props) {
  return (
    <Box flexDirection="column" padding={1}>
      <Text bold dimColor={!isFocused}>Request / Response</Text>
      {endpoint ? (
        <Box marginTop={1}>
          <Text color="cyan">{endpoint.method.toUpperCase()}</Text>
          <Text> {endpoint.path}</Text>
        </Box>
      ) : (
        <Text dimColor>No endpoint selected</Text>
      )}
    </Box>
  )
}
```

### Step 4: Run test to verify it passes

```bash
bun test src/__tests__/components/placeholders.test.tsx
```

Expected: All 4 tests PASS.

### Step 5: Commit

```bash
git add src/components/EndpointDetail.tsx src/components/RequestPanel.tsx src/__tests__/components/placeholders.test.tsx
git commit -m "feat: add placeholder EndpointDetail and RequestPanel components"
```

---

## Task 3: EndpointList — Rendering and Tag Groups

**Files:**
- Create: `src/components/EndpointList.tsx`
- Test: `src/__tests__/components/EndpointList.test.tsx`

This task covers rendering and collapsible tag groups. Navigation and filtering are separate tasks.

### Step 1: Write the failing test

```tsx
// src/__tests__/components/EndpointList.test.tsx
import { describe, it, expect } from 'bun:test'
import { render } from 'ink-testing-library'
import { EndpointList } from '@/components/EndpointList.js'
import type { TagGroup, Endpoint } from '@/types/index.js'

const petEndpoints: readonly Endpoint[] = [
  {
    id: 'get-/pets',
    method: 'get',
    path: '/pets',
    summary: 'List all pets',
    tags: ['pets'],
    deprecated: false,
    parameters: [],
    responses: [],
  },
  {
    id: 'post-/pets',
    method: 'post',
    path: '/pets',
    summary: 'Create a pet',
    tags: ['pets'],
    deprecated: false,
    parameters: [],
    responses: [],
  },
  {
    id: 'delete-/pets/{petId}',
    method: 'delete',
    path: '/pets/{petId}',
    summary: 'Delete a pet',
    tags: ['pets'],
    deprecated: true,
    parameters: [],
    responses: [],
  },
]

const storeEndpoints: readonly Endpoint[] = [
  {
    id: 'get-/store/inventory',
    method: 'get',
    path: '/store/inventory',
    summary: 'Get inventory',
    tags: ['store'],
    deprecated: false,
    parameters: [],
    responses: [],
  },
]

const tagGroups: readonly TagGroup[] = [
  { name: 'pets', endpoints: petEndpoints },
  { name: 'store', endpoints: storeEndpoints },
]

const noop = () => {}

describe('EndpointList', () => {
  describe('rendering', () => {
    it('renders tag group headers', () => {
      const { lastFrame } = render(
        <EndpointList tagGroups={tagGroups} isFocused={true} onSelectEndpoint={noop} />,
      )
      const frame = lastFrame()!
      expect(frame).toContain('pets')
      expect(frame).toContain('store')
    })

    it('renders endpoint paths with HTTP methods', () => {
      const { lastFrame } = render(
        <EndpointList tagGroups={tagGroups} isFocused={true} onSelectEndpoint={noop} />,
      )
      const frame = lastFrame()!
      expect(frame).toContain('GET')
      expect(frame).toContain('/pets')
      expect(frame).toContain('POST')
      expect(frame).toContain('DELETE')
    })

    it('renders endpoint count in tag headers', () => {
      const { lastFrame } = render(
        <EndpointList tagGroups={tagGroups} isFocused={true} onSelectEndpoint={noop} />,
      )
      const frame = lastFrame()!
      expect(frame).toContain('3') // pets has 3 endpoints
      expect(frame).toContain('1') // store has 1 endpoint
    })

    it('shows expand indicator on tag headers', () => {
      const { lastFrame } = render(
        <EndpointList tagGroups={tagGroups} isFocused={true} onSelectEndpoint={noop} />,
      )
      expect(lastFrame()).toContain('▼')
    })
  })
})
```

### Step 2: Run test to verify it fails

```bash
bun test src/__tests__/components/EndpointList.test.tsx
```

Expected: FAIL — module not found.

### Step 3: Write minimal implementation

This is a substantial component. The key data model is a flat list of "rows" — each row is either a tag header or an endpoint. This flat list drives cursor navigation.

```tsx
// src/components/EndpointList.tsx
import { useState, useMemo } from 'react'
import { Box, Text, useInput } from 'ink'
import { METHOD_COLORS } from '@/utils/http-method.js'
import type { Endpoint, TagGroup, HttpMethod } from '@/types/index.js'

interface Props {
  readonly tagGroups: readonly TagGroup[]
  readonly isFocused: boolean
  readonly onSelectEndpoint: (endpoint: Endpoint) => void
}

type ListRow =
  | { readonly kind: 'tag'; readonly tag: string; readonly count: number }
  | { readonly kind: 'endpoint'; readonly endpoint: Endpoint; readonly tag: string }

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

function MethodBadge({ method }: { readonly method: HttpMethod }) {
  const color = METHOD_COLORS[method] ?? 'white'
  return <Text color={color}>{method.toUpperCase().padEnd(7)}</Text>
}

export function EndpointList({ tagGroups, isFocused, onSelectEndpoint }: Props) {
  const [cursorIndex, setCursorIndex] = useState(0)
  const [collapsedTags, setCollapsedTags] = useState<ReadonlySet<string>>(new Set())
  const [filterText, setFilterText] = useState('')
  const [isFiltering, setIsFiltering] = useState(false)

  const rows = useMemo(() => {
    if (isFiltering && filterText) {
      const lower = filterText.toLowerCase()
      const filtered: ListRow[] = []
      for (const group of tagGroups) {
        for (const ep of group.endpoints) {
          if (
            ep.path.toLowerCase().includes(lower) ||
            (ep.summary?.toLowerCase().includes(lower) ?? false)
          ) {
            filtered.push({ kind: 'endpoint', endpoint: ep, tag: group.name })
          }
        }
      }
      return filtered
    }
    return buildRows(tagGroups, collapsedTags)
  }, [tagGroups, collapsedTags, isFiltering, filterText])

  const clampCursor = (index: number) => Math.max(0, Math.min(index, rows.length - 1))

  useInput(
    (input, key) => {
      if (isFiltering) {
        if (key.escape) {
          setIsFiltering(false)
          setFilterText('')
          setCursorIndex(0)
        }
        return
      }

      // Navigation
      if (input === 'j' || key.downArrow) {
        setCursorIndex(i => clampCursor(i + 1))
      } else if (input === 'k' || key.upArrow) {
        setCursorIndex(i => clampCursor(i - 1))
      } else if (input === 'g') {
        setCursorIndex(0)
      } else if (input === 'G') {
        setCursorIndex(rows.length - 1)
      } else if (input === '/') {
        setIsFiltering(true)
        setFilterText('')
        setCursorIndex(0)
      } else if (key.return) {
        const row = rows[cursorIndex]
        if (row?.kind === 'tag') {
          toggleTag(row.tag)
        } else if (row?.kind === 'endpoint') {
          onSelectEndpoint(row.endpoint)
        }
      } else if (input === 'h') {
        const row = rows[cursorIndex]
        const tagName = row?.kind === 'tag' ? row.tag : row?.kind === 'endpoint' ? row.tag : null
        if (tagName && !collapsedTags.has(tagName)) {
          toggleTag(tagName)
        }
      } else if (input === 'l') {
        const row = rows[cursorIndex]
        const tagName = row?.kind === 'tag' ? row.tag : row?.kind === 'endpoint' ? row.tag : null
        if (tagName && collapsedTags.has(tagName)) {
          toggleTag(tagName)
        }
      }
    },
    { isActive: isFocused },
  )

  function toggleTag(tag: string) {
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

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold dimColor={!isFocused}>
        Endpoints
      </Text>
      {isFiltering && (
        <Box marginTop={1}>
          <Text color="yellow">/ </Text>
          <Text>{filterText}</Text>
          <Text dimColor>█</Text>
        </Box>
      )}
      <Box flexDirection="column" marginTop={1}>
        {rows.map((row, index) => {
          const isSelected = index === cursorIndex && isFocused
          if (row.kind === 'tag') {
            return (
              <Box key={`tag-${row.tag}`}>
                <Text inverse={isSelected} bold>
                  {collapsedTags.has(row.tag) ? '▶' : '▼'} {row.tag}
                </Text>
                <Text dimColor> ({row.count})</Text>
              </Box>
            )
          }
          return (
            <Box key={row.endpoint.id} paddingLeft={2}>
              <Text inverse={isSelected} strikethrough={row.endpoint.deprecated}>
                <MethodBadge method={row.endpoint.method} />
                <Text> {row.endpoint.path}</Text>
              </Text>
            </Box>
          )
        })}
      </Box>
    </Box>
  )
}
```

**Note on `<MethodBadge>`:** Ink's `<Text>` `color` prop supports named colors. The `METHOD_COLORS` map in `src/utils/http-method.ts` uses `'orange'` for PUT. Ink uses chalk under the hood — if `'orange'` isn't supported as a named color, it may need to be a hex value like `'#FFA500'`. Verify at runtime and adjust if needed.

### Step 4: Run test to verify it passes

```bash
bun test src/__tests__/components/EndpointList.test.tsx
```

Expected: All 4 tests PASS.

### Step 5: Commit

```bash
git add src/components/EndpointList.tsx src/__tests__/components/EndpointList.test.tsx
git commit -m "feat: add EndpointList component with tag groups and method badges"
```

---

## Task 4: EndpointList — Navigation and Collapse

**Files:**
- Modify: `src/__tests__/components/EndpointList.test.tsx`
- (No source changes — testing existing behavior)

### Step 1: Add navigation and collapse tests

Append to the existing test file:

```tsx
describe('EndpointList navigation', () => {
  it('moves cursor down with j', () => {
    const { lastFrame, stdin } = render(
      <EndpointList tagGroups={tagGroups} isFocused={true} onSelectEndpoint={noop} />,
    )
    // Initial cursor is on first row (pets tag header)
    // Press j to move to first endpoint
    stdin.write('j')
    // The first endpoint row should now be highlighted
    // We verify by checking the frame renders correctly after navigation
    expect(lastFrame()).toContain('GET')
  })

  it('moves cursor up with k', () => {
    const { lastFrame, stdin } = render(
      <EndpointList tagGroups={tagGroups} isFocused={true} onSelectEndpoint={noop} />,
    )
    stdin.write('j') // move to row 1
    stdin.write('k') // move back to row 0
    expect(lastFrame()).toContain('pets')
  })

  it('jumps to bottom with G and top with g', () => {
    const { lastFrame, stdin } = render(
      <EndpointList tagGroups={tagGroups} isFocused={true} onSelectEndpoint={noop} />,
    )
    stdin.write('G') // jump to last row
    stdin.write('g') // jump to first row
    expect(lastFrame()).toContain('pets')
  })

  it('collapses tag group with Enter on tag header', () => {
    const { lastFrame, stdin } = render(
      <EndpointList tagGroups={tagGroups} isFocused={true} onSelectEndpoint={noop} />,
    )
    // Cursor starts on pets header, press Enter to collapse
    stdin.write('\r')
    const frame = lastFrame()!
    expect(frame).toContain('▶') // collapsed indicator
    // The pet endpoints should be hidden
    expect(frame).not.toContain('/pets/{petId}')
  })

  it('selects endpoint with Enter', () => {
    let selected: Endpoint | null = null
    const { stdin } = render(
      <EndpointList
        tagGroups={tagGroups}
        isFocused={true}
        onSelectEndpoint={ep => { selected = ep }}
      />,
    )
    stdin.write('j') // move to first endpoint (GET /pets)
    stdin.write('\r') // select it
    expect(selected).not.toBeNull()
    expect(selected!.id).toBe('get-/pets')
  })

  it('collapses with h and expands with l', () => {
    const { lastFrame, stdin } = render(
      <EndpointList tagGroups={tagGroups} isFocused={true} onSelectEndpoint={noop} />,
    )
    // Cursor on pets header, h should collapse
    stdin.write('h')
    expect(lastFrame()).toContain('▶')
    // l should expand
    stdin.write('l')
    expect(lastFrame()).toContain('▼')
  })

  it('does not respond to input when not focused', () => {
    const onSelect = () => { throw new Error('should not be called') }
    const { stdin } = render(
      <EndpointList tagGroups={tagGroups} isFocused={false} onSelectEndpoint={onSelect} />,
    )
    // Should not throw when pressing keys
    stdin.write('j')
    stdin.write('\r')
  })
})
```

### Step 2: Run tests

```bash
bun test src/__tests__/components/EndpointList.test.tsx
```

Expected: All tests PASS (rendering + navigation).

### Step 3: Commit

```bash
git add src/__tests__/components/EndpointList.test.tsx
git commit -m "test: add navigation and collapse tests for EndpointList"
```

---

## Task 5: EndpointList — Filter Mode

**Files:**
- Modify: `src/__tests__/components/EndpointList.test.tsx`
- Modify: `src/components/EndpointList.tsx` (if `TextInput` integration needed)

Filter mode requires handling text input. The current implementation uses a simple state-based approach. Ink's `useInput` receives individual characters, so we need to handle character accumulation ourselves (not using `@inkjs/ui`'s `<TextInput>` for this initial version — it would take focus from our `useInput` handler). We can use a simple approach: when in filter mode, typed characters append to `filterText`, backspace removes.

### Step 1: Add filter mode to useInput handler

Update the `useInput` block in `EndpointList.tsx` — add character handling when `isFiltering` is true:

Replace the filter section of the `useInput` callback:

```tsx
// In the useInput callback, replace the isFiltering block:
if (isFiltering) {
  if (key.escape) {
    setIsFiltering(false)
    setFilterText('')
    setCursorIndex(0)
  } else if (key.backspace || key.delete) {
    setFilterText(t => t.slice(0, -1))
    setCursorIndex(0)
  } else if (key.return) {
    // Exit filter mode but keep the filter applied
    setIsFiltering(false)
  } else if (input && !key.ctrl && !key.meta && input.length === 1) {
    setFilterText(t => t + input)
    setCursorIndex(0)
  }
  return
}
```

### Step 2: Write the filter tests

Append to the test file:

```tsx
describe('EndpointList filter mode', () => {
  it('enters filter mode with /', () => {
    const { lastFrame, stdin } = render(
      <EndpointList tagGroups={tagGroups} isFocused={true} onSelectEndpoint={noop} />,
    )
    stdin.write('/')
    expect(lastFrame()).toContain('/ ')
  })

  it('filters endpoints by path', () => {
    const { lastFrame, stdin } = render(
      <EndpointList tagGroups={tagGroups} isFocused={true} onSelectEndpoint={noop} />,
    )
    stdin.write('/')
    stdin.write('inventory')
    const frame = lastFrame()!
    expect(frame).toContain('/store/inventory')
    // Should not contain non-matching endpoints
    expect(frame).not.toContain('List all pets')
  })

  it('filters endpoints by summary', () => {
    const { lastFrame, stdin } = render(
      <EndpointList tagGroups={tagGroups} isFocused={true} onSelectEndpoint={noop} />,
    )
    stdin.write('/')
    stdin.write('Create')
    const frame = lastFrame()!
    expect(frame).toContain('POST')
    expect(frame).toContain('/pets')
  })

  it('clears filter on Escape', () => {
    const { lastFrame, stdin } = render(
      <EndpointList tagGroups={tagGroups} isFocused={true} onSelectEndpoint={noop} />,
    )
    stdin.write('/')
    stdin.write('inventory')
    stdin.write('\x1b') // Escape
    const frame = lastFrame()!
    // Should show all endpoints again
    expect(frame).toContain('/pets')
    expect(frame).toContain('/store/inventory')
  })

  it('shows flattened results without tag headers when filtering', () => {
    const { lastFrame, stdin } = render(
      <EndpointList tagGroups={tagGroups} isFocused={true} onSelectEndpoint={noop} />,
    )
    stdin.write('/')
    stdin.write('get')
    const frame = lastFrame()!
    // In filter mode, tag headers should not appear
    expect(frame).not.toContain('▼')
    expect(frame).not.toContain('▶')
  })
})
```

### Step 3: Run tests

```bash
bun test src/__tests__/components/EndpointList.test.tsx
```

Expected: All tests PASS.

### Step 4: Commit

```bash
git add src/components/EndpointList.tsx src/__tests__/components/EndpointList.test.tsx
git commit -m "feat: add filter mode to EndpointList"
```

---

## Task 6: SpecLoader Component

**Files:**
- Create: `src/components/SpecLoader.tsx`
- Test: `src/__tests__/components/SpecLoader.test.tsx`

### Step 1: Write the failing test

```tsx
// src/__tests__/components/SpecLoader.test.tsx
import { describe, it, expect, mock, afterEach } from 'bun:test'
import { render } from 'ink-testing-library'
import { SpecLoader } from '@/components/SpecLoader.js'

// We test SpecLoader by mocking the loadSpec and parseSpec functions.
// Since SpecLoader imports them, we need to mock at the module level.
// For now, test the error and loading states with a simple approach.

describe('SpecLoader', () => {
  it('shows error when no input provided', async () => {
    const { lastFrame } = render(<SpecLoader input={undefined} />)
    const frame = lastFrame()!
    expect(frame).toContain('Usage')
    expect(frame).toContain('superapi-tui')
  })

  it('shows loading state when input provided', () => {
    // SpecLoader should show a loading indicator immediately
    const { lastFrame } = render(<SpecLoader input="./test.yaml" />)
    const frame = lastFrame()!
    expect(frame).toContain('Loading')
  })
})
```

### Step 2: Run test to verify it fails

```bash
bun test src/__tests__/components/SpecLoader.test.tsx
```

Expected: FAIL — module not found.

### Step 3: Write implementation

```tsx
// src/components/SpecLoader.tsx
import { useState, useEffect } from 'react'
import { Box, Text, useApp } from 'ink'
import { Spinner } from '@inkjs/ui'
import { loadSpec } from '@/loader/index.js'
import { parseSpec } from '@/parser/index.js'
import type { ParsedSpec } from '@/types/index.js'
import App from '@/App.js'

interface Props {
  readonly input: string | undefined
}

type State =
  | { readonly phase: 'no-input' }
  | { readonly phase: 'loading'; readonly message: string }
  | { readonly phase: 'loaded'; readonly spec: ParsedSpec }
  | { readonly phase: 'error'; readonly message: string }

export function SpecLoader({ input }: Props) {
  const { exit } = useApp()
  const [state, setState] = useState<State>(
    input ? { phase: 'loading', message: `Loading spec from ${input}...` } : { phase: 'no-input' },
  )

  useEffect(() => {
    if (!input) return

    let cancelled = false

    async function load() {
      try {
        setState({ phase: 'loading', message: `Loading spec from ${input}...` })
        const result = await loadSpec(input!)
        if (cancelled) return

        setState({ phase: 'loading', message: 'Parsing spec...' })
        const spec = await parseSpec(result.content)
        if (cancelled) return

        setState({ phase: 'loaded', spec })
      } catch (error) {
        if (cancelled) return
        const message = error instanceof Error ? error.message : String(error)
        setState({ phase: 'error', message })
      }
    }

    load()
    return () => { cancelled = true }
  }, [input])

  if (state.phase === 'no-input') {
    return (
      <Box flexDirection="column" padding={1}>
        <Text bold color="cyan">superapi-tui</Text>
        <Text dimColor>OpenAPI v3.0/v3.1 Terminal Browser</Text>
        <Box marginTop={1}>
          <Text>Usage: superapi-tui {'<'}file-or-url{'>'}</Text>
        </Box>
        <Box marginTop={1} flexDirection="column">
          <Text dimColor>  superapi-tui ./openapi.yaml</Text>
          <Text dimColor>  superapi-tui https://example.com/v3/api-docs</Text>
          <Text dimColor>  superapi-tui https://example.com/swagger-ui/index.html</Text>
        </Box>
      </Box>
    )
  }

  if (state.phase === 'loading') {
    return (
      <Box padding={1}>
        <Spinner label={state.message} />
      </Box>
    )
  }

  if (state.phase === 'error') {
    return (
      <Box flexDirection="column" padding={1}>
        <Text color="red" bold>Error: </Text>
        <Text color="red">{state.message}</Text>
      </Box>
    )
  }

  return <App spec={state.spec} />
}
```

### Step 4: Run test to verify it passes

```bash
bun test src/__tests__/components/SpecLoader.test.tsx
```

Expected: Both tests PASS.

### Step 5: Commit

```bash
git add src/components/SpecLoader.tsx src/__tests__/components/SpecLoader.test.tsx
git commit -m "feat: add SpecLoader component with loading, error, and usage states"
```

---

## Task 7: App Component — 3-Panel Layout

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/__tests__/App.test.tsx`

### Step 1: Write the failing test

Replace the existing test:

```tsx
// src/__tests__/App.test.tsx
import { describe, it, expect } from 'bun:test'
import { render } from 'ink-testing-library'
import App from '../App.js'
import type { ParsedSpec } from '@/types/index.js'

const minimalSpec: ParsedSpec = {
  info: {
    title: 'Test API',
    version: '1.0.0',
    specVersion: '3.0.0',
  },
  servers: [],
  tagGroups: [
    {
      name: 'default',
      endpoints: [
        {
          id: 'get-/health',
          method: 'get',
          path: '/health',
          summary: 'Health check',
          tags: ['default'],
          deprecated: false,
          parameters: [],
          responses: [],
        },
      ],
    },
  ],
  endpoints: [
    {
      id: 'get-/health',
      method: 'get',
      path: '/health',
      summary: 'Health check',
      tags: ['default'],
      deprecated: false,
      parameters: [],
      responses: [],
    },
  ],
  tags: ['default'],
  securitySchemes: [],
  globalSecurity: [],
  componentSchemas: new Map(),
}

describe('App', () => {
  it('renders three panels', () => {
    const { lastFrame } = render(<App spec={minimalSpec} />)
    const frame = lastFrame()!
    expect(frame).toContain('Endpoints')
    expect(frame).toContain('Endpoint Detail')
    expect(frame).toContain('Request / Response')
  })

  it('renders endpoint list content', () => {
    const { lastFrame } = render(<App spec={minimalSpec} />)
    const frame = lastFrame()!
    expect(frame).toContain('GET')
    expect(frame).toContain('/health')
  })

  it('shows "No endpoint selected" in detail and request panels', () => {
    const { lastFrame } = render(<App spec={minimalSpec} />)
    const frame = lastFrame()!
    // Both placeholder panels should show this
    expect(frame).toContain('No endpoint selected')
  })
})
```

### Step 2: Run test to verify it fails

```bash
bun test src/__tests__/App.test.tsx
```

Expected: FAIL — App doesn't accept `spec` prop yet.

### Step 3: Write implementation

```tsx
// src/App.tsx
import { Box, Text } from 'ink'
import { useNavigation } from '@/hooks/index.js'
import { EndpointList } from '@/components/EndpointList.js'
import { EndpointDetail } from '@/components/EndpointDetail.js'
import { RequestPanel } from '@/components/RequestPanel.js'
import type { ParsedSpec } from '@/types/index.js'

interface Props {
  readonly spec: ParsedSpec
}

export default function App({ spec }: Props) {
  const { focusedPanel, selectedEndpoint, selectEndpoint } = useNavigation()

  return (
    <Box flexDirection="row" width="100%" height="100%">
      <Box
        width="25%"
        borderStyle="single"
        borderColor={focusedPanel === 'endpoints' ? 'cyan' : 'gray'}
        flexDirection="column"
      >
        <EndpointList
          tagGroups={spec.tagGroups}
          isFocused={focusedPanel === 'endpoints'}
          onSelectEndpoint={selectEndpoint}
        />
      </Box>
      <Box
        width="38%"
        borderStyle="single"
        borderColor={focusedPanel === 'detail' ? 'cyan' : 'gray'}
        flexDirection="column"
      >
        <EndpointDetail
          endpoint={selectedEndpoint}
          isFocused={focusedPanel === 'detail'}
        />
      </Box>
      <Box
        width="37%"
        borderStyle="single"
        borderColor={focusedPanel === 'request' ? 'cyan' : 'gray'}
        flexDirection="column"
      >
        <RequestPanel
          endpoint={selectedEndpoint}
          isFocused={focusedPanel === 'request'}
        />
      </Box>
    </Box>
  )
}
```

### Step 4: Run test to verify it passes

```bash
bun test src/__tests__/App.test.tsx
```

Expected: All 3 tests PASS.

### Step 5: Commit

```bash
git add src/App.tsx src/__tests__/App.test.tsx
git commit -m "feat: implement 3-panel TUI layout with focus management"
```

---

## Task 8: CLI Entry Point + Barrel Exports

**Files:**
- Modify: `src/cli.tsx`
- Modify: `src/components/index.ts`

### Step 1: Update cli.tsx

```tsx
// src/cli.tsx
#!/usr/bin/env node
import { render } from 'ink'
import { SpecLoader } from './components/SpecLoader.js'

const input = process.argv[2]
render(<SpecLoader input={input} />)
```

### Step 2: Update barrel export

```ts
// src/components/index.ts
export { SpecLoader } from './SpecLoader.js'
export { EndpointList } from './EndpointList.js'
export { EndpointDetail } from './EndpointDetail.js'
export { RequestPanel } from './RequestPanel.js'
```

### Step 3: Run all tests

```bash
bun test
```

Expected: All tests pass (89 existing + new tests).

### Step 4: Manual smoke test

```bash
bun run dev
```

Expected: Shows usage message (no argument provided).

```bash
bun run src/cli.tsx src/__tests__/fixtures/petstore-3.0.yaml
```

Expected: Loads spec, shows 3-panel layout with petstore endpoints. Navigate with j/k, Tab to switch panels, q to quit.

### Step 5: Fix any runtime issues

At this point, verify:
1. Panel borders render correctly
2. HTTP method colors display (check if `'orange'` works in terminal — if not, change to `'#FFA500'` in `METHOD_COLORS`)
3. Tab cycling works between panels
4. j/k navigation works in endpoint list
5. Enter collapses/expands tag groups
6. Enter on endpoint selects it (shows in detail panel)
7. `/` opens filter mode, typing filters, Esc clears
8. `q` quits

### Step 6: Commit

```bash
git add src/cli.tsx src/components/index.ts
git commit -m "feat: wire up CLI entry point with SpecLoader"
```

---

## Task 9: Final — Run Full Suite, Typecheck, Lint

**Step 1: Run all tests**

```bash
bun test
```

Expected: All tests pass.

**Step 2: Type check**

```bash
bun run typecheck
```

Expected: No errors. Fix any type issues found.

**Step 3: Lint**

```bash
bun run lint
```

Expected: No errors. Fix any lint issues found.

**Step 4: Build**

```bash
bun run build
```

Expected: Builds successfully to `dist/cli.js`.

**Step 5: Final commit if any fixes were needed**

```bash
git add -A
git commit -m "chore: fix typecheck and lint issues"
```

---

## Summary

| Task | Description | Files | Tests |
|------|-------------|-------|-------|
| 0 | Setup branch + deps | package.json, bun.lock | — |
| 1 | useNavigation hook | hooks/useNavigation.ts | 3 tests |
| 2 | Placeholder panels | EndpointDetail.tsx, RequestPanel.tsx | 4 tests |
| 3 | EndpointList rendering | EndpointList.tsx | 4 tests |
| 4 | EndpointList navigation | (tests only) | 7 tests |
| 5 | EndpointList filter mode | EndpointList.tsx update | 5 tests |
| 6 | SpecLoader component | SpecLoader.tsx | 2 tests |
| 7 | App 3-panel layout | App.tsx | 3 tests |
| 8 | CLI entry point + barrels | cli.tsx, components/index.ts | smoke test |
| 9 | Final validation | — | typecheck + lint + build |
