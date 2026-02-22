# Endpoint Detail Panel — Design

## Scope

Replace the placeholder EndpointDetail component with a full-featured middle panel that displays endpoint parameters, request body schema, response schemas, and supports stack-based $ref schema drill-down.

## Approach

Section components + shared schema renderer (Approach B). Each section is its own component, independently testable. A reusable `SchemaView` component handles recursive schema rendering across all sections and will be reused later by the request panel.

---

## 1. Component Architecture

### File Structure

```
src/components/
  EndpointDetail.tsx          # Orchestrator: section layout + scroll + schema nav stack
  ParameterList.tsx           # Renders endpoint parameters grouped by location
  SchemaView.tsx              # Recursive schema property renderer (reusable)
  ResponseList.tsx            # Renders response status codes with their schemas
  index.ts                    # Updated barrel exports

src/hooks/
  useSchemaNavigation.ts      # Stack-based $ref navigation
  useScrollableList.ts        # Reusable cursor/scroll management for vertical lists
  index.ts                    # Updated barrel
```

### Data Flow

```
App
  └── EndpointDetail (endpoint, componentSchemas, isFocused)
        ├── Breadcrumb trail (when schema stack non-empty)
        ├── [endpoint view]
        │     ├── ParameterList (parameters)
        │     ├── SchemaView (requestBody schema)
        │     └── ResponseList (responses)
        └── [schema view] — when navigated into a $ref
              └── SchemaView (pushed schema)
```

---

## 2. EndpointDetail (Orchestrator)

Receives `endpoint: Endpoint | null`, `isFocused: boolean`, `componentSchemas: ReadonlyMap<string, SchemaInfo>`.

When no endpoint is selected, shows placeholder text.

When an endpoint is selected, renders vertically-stacked collapsible sections:
1. **Parameters** — via `<ParameterList>`
2. **Request Body** — via `<SchemaView>` (if endpoint has request body)
3. **Responses** — via `<ResponseList>`

Uses `useScrollableList` for cursor management across all visible rows. Uses `useSchemaNavigation` for $ref drill-down stack.

Sections have collapsible headers toggled with Enter (when cursor is on header row). All sections start expanded.

### Row Model

Follows the same discriminated union pattern as EndpointList's `ListRow`:

```typescript
type DetailRow =
  | { kind: 'section-header'; section: SectionId; label: string }
  | { kind: 'parameter'; parameter: ParameterInfo; location: ParameterLocation }
  | { kind: 'schema-field'; field: SchemaFieldRow; depth: number }
  | { kind: 'response-header'; response: ResponseInfo }
  | { kind: 'media-type'; mediaType: string }
  | { kind: 'empty'; label: string }
```

Rows are built from the endpoint data, respecting collapsed sections.

---

## 3. ParameterList Component

Renders parameters grouped by location (`path`, `query`, `header`, `cookie`):

```
Path Parameters
  name         string   required

Query Parameters
  page         integer
  limit        integer
  sort         string   enum: [asc, desc]
```

Each parameter row shows:
- Name (bold if required)
- Type display (from `schema.displayType`)
- `required` marker in red
- `deprecated` in strikethrough

Pressing Enter on a parameter row expands inline detail: description, constraints, example, default value. Press Enter again to collapse.

---

## 4. SchemaView Component

Core reusable component. Renders a `SchemaInfo` as a property list:

```
{object}
  id           integer   required
  username     string    required
  email        string    format: email
  profile      → Profile              ← $ref, pressable
  tags         string[]
  metadata     object
    key        string
```

### Rendering Rules

- **Object**: list properties with indent per nesting level
- **Array**: show items type inline (e.g., `string[]`)
- **Primitives**: type + format + constraints inline
- **$ref fields**: show `→ RefName`, highlighted as navigable (cyan when cursor is on it)
- **Required fields**: name in bold + red `*` marker
- **Enum values**: show `enum: [val1, val2, ...]` dimmed
- **Composition** (`allOf`/`oneOf`/`anyOf`): render as labeled groups

### Expandable Field Detail

Enter on a field toggles inline detail expansion:
- Description
- Constraints (min/max, pattern, minLength, etc.)
- Example value
- Default value

### $ref Navigation

When cursor is on a `$ref` field and Enter is pressed, calls `onNavigateRef(schemaInfo)` callback which pushes the referenced schema onto the navigation stack.

---

## 5. ResponseList Component

Groups responses by status code:

```
200 OK
  application/json
    {object} → OrderResponse

404 Not Found
  application/json
    {object}
      message    string   required
      code       integer

422 Validation Error
  (no content)
```

Each response shows:
- Status code (color-coded: 2xx=green, 4xx=yellow, 5xx=red) + description
- Content types listed with their schemas (rendered via `<SchemaView>`)
- Response headers if present

---

## 6. useSchemaNavigation Hook

```typescript
interface SchemaStackEntry {
  readonly schema: SchemaInfo
  readonly label: string
}

interface SchemaNavigationState {
  readonly stack: readonly SchemaStackEntry[]
  readonly currentView: 'endpoint' | 'schema'
  readonly push: (schema: SchemaInfo, label: string) => void
  readonly pop: () => void
  readonly breadcrumbs: readonly string[]
}
```

- `push(schema, label)`: pushes a schema onto the stack, switches view to show that schema
- `pop()`: returns to previous view; if stack is empty, returns to endpoint view
- `breadcrumbs`: array of labels for the breadcrumb trail display
- Stack tracks both `SchemaInfo` and label for each entry
- Stack resets when `endpoint` changes

---

## 7. useScrollableList Hook

Extracts cursor/scroll logic reusable across EndpointList, EndpointDetail, and future panels:

```typescript
interface ScrollableListState {
  readonly cursorIndex: number
  readonly setCursorIndex: (index: number) => void
  readonly moveUp: () => void
  readonly moveDown: () => void
  readonly moveToTop: () => void
  readonly moveToBottom: () => void
}
```

Takes `rowCount: number` as input. Handles clamping. Does NOT handle keyboard input directly — caller wires keybindings.

---

## 8. Keyboard Navigation

When the detail panel is focused:

| Key | Action |
|-----|--------|
| `j` / `Down` | Move cursor down through rows |
| `k` / `Up` | Move cursor up through rows |
| `g` | Jump to top |
| `G` | Jump to bottom |
| `Enter` | Toggle section collapse, expand field detail, or navigate into $ref |
| `Backspace` / `Escape` | Pop schema stack (go back) |
| `h` | Collapse current section |
| `l` | Expand current section |

---

## 9. Props Wiring Changes

`App.tsx` needs to pass `componentSchemas` from `ParsedSpec` down to `EndpointDetail`:

```tsx
<EndpointDetail
  endpoint={selectedEndpoint}
  isFocused={focusedPanel === 'detail'}
  componentSchemas={spec.componentSchemas}
/>
```

---

## Dependencies

No new dependencies required. Uses existing Ink (`Box`, `Text`, `useInput`) and existing types from `src/types/`.
