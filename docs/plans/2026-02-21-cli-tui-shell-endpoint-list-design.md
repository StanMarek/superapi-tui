# CLI + TUI Shell + Endpoint List — Design

## Scope

Wire up CLI argument parsing, build the 3-panel TUI layout with focus management, and implement the left panel (endpoint list with tag groups and filtering).

## Approach

Component-per-panel architecture with a shared navigation hook. Each panel is its own component file, independently testable. Placeholder panels for middle/right.

---

## 1. CLI Integration

### `src/cli.tsx`

- Reads `process.argv[2]` as spec input (file path or URL)
- No argument: prints usage message and exits
- Delegates async loading to a `<SpecLoader>` wrapper component

### `src/components/SpecLoader.tsx`

- Shows a loading spinner (`@inkjs/ui` `<Spinner>`) while calling `loadSpec()` then `parseSpec()`
- On success: renders `<App spec={parsedSpec} />`
- On error: renders error message in red and exits with code 1
- Uses `useEffect` + `useState` for async flow

---

## 2. TUI Shell (3-Panel Layout)

### `src/App.tsx`

Receives `ParsedSpec` as prop. Renders:

```
+-------------+------------------+------------------+
| Left (25%)  | Middle (37.5%)   | Right (37.5%)    |
| EndpointList| EndpointDetail   | RequestPanel     |
|             | (placeholder)    | (placeholder)    |
+-------------+------------------+------------------+
```

- Three `<Box>` columns, `flexDirection="row"`, percentage widths
- Focused panel: `borderColor="cyan"`, unfocused: `"gray"`
- Panel header shows panel name in bold

### `src/hooks/useNavigation.ts`

Manages global navigation state:

- `focusedPanel`: `'endpoints' | 'detail' | 'request'`
- `Tab` / `Shift+Tab`: cycle focus between panels
- `q` / `Ctrl+C`: exit app
- `selectedEndpoint`: currently selected `Endpoint` (passed to middle/right)
- Only focused panel receives keyboard input (panels check `isFocused` prop)

### Placeholder Panels

- `<EndpointDetail>`: displays selected endpoint method + path, or "No endpoint selected"
- `<RequestPanel>`: same placeholder behavior

---

## 3. Left Panel — Endpoint List

### `src/components/EndpointList.tsx`

#### Tag Groups (collapsible)

- Renders each `TagGroup` from `ParsedSpec.tagGroups`
- Tag header: bold name, dimmed endpoint count, collapse indicator (`▼`/`▶`)
- `Enter` on tag header toggles collapse/expand
- All groups start expanded

#### Endpoint Items

- Format: `[METHOD] /path` with optional summary
- HTTP method badge colors: GET=green, POST=blue, PUT=orange, DELETE=red, PATCH=cyan
- Selected item: highlighted with inverse colors
- Deprecated: strikethrough

#### Navigation (when focused)

| Key | Action |
|-----|--------|
| `j` / `Down` | Move cursor down |
| `k` / `Up` | Move cursor up |
| `g` | Jump to top |
| `G` | Jump to bottom |
| `Enter` on tag | Toggle collapse |
| `Enter` on endpoint | Select endpoint |
| `h` | Collapse current tag group |
| `l` | Expand current tag group |

#### Filter Mode

- `/` activates filter: shows `<TextInput>` at top of panel
- Filters by path and summary (case-insensitive)
- `Esc` clears and exits filter mode
- Filtered results flatten across tag groups

#### State

Internal: `cursorIndex`, `collapsedTags: Set<string>`, `filterText`, `isFiltering`
Lifted: `onSelectEndpoint(endpoint)` callback

---

## File Structure

```
src/
  cli.tsx                      # Updated: arg parsing + SpecLoader
  App.tsx                      # Updated: 3-panel layout
  hooks/
    useNavigation.ts           # New: focus + selection state
  components/
    SpecLoader.tsx             # New: async loading wrapper
    EndpointList.tsx           # New: left panel
    EndpointDetail.tsx         # New: placeholder middle panel
    RequestPanel.tsx           # New: placeholder right panel
    index.ts                   # Updated: barrel exports
```

## Dependencies

- `@inkjs/ui` — `Spinner`, `TextInput` components (new dependency)
