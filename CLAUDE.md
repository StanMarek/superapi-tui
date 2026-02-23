# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**superapi-tui** is a TUI application for browsing and interacting with OpenAPI v3.0/v3.1 specifications. Inspired by the Rust-based [openapi-tui](https://github.com/zaghaghi/openapi-tui). Built with Bun, Ink (React for CLI), and TypeScript.

## Tech Stack

- **Runtime:** Bun
- **TUI Framework:** Ink 6 + React 19 (React-based terminal rendering)
- **Language:** TypeScript
- **Distribution:** npm package (`superapi-tui`), runnable via `npx`/`bunx`

## Build & Development Commands

```bash
# Install dependencies
bun install

# Run in development
bun run dev

# Build for distribution
bun run build

# Run tests
bun test

# Run a single test file
bun test <path-to-test-file>

# Type checking
bun run typecheck

# Linting
bun run lint
```

CLI entry point compiles to `./dist/cli.js`. The `bin` field in package.json maps `superapi-tui` to this path.

## Build Gotchas

- Build uses `build.ts` (Bun build API), not a raw CLI command — needed to stub `react-devtools-core` which Ink 6 imports statically and breaks node runtime
- Lockfile is `bun.lock` (not `bun.lockb`) as of Bun 1.3+
- `.worktrees/` directory is gitignored — used for isolated feature development

## Repository

- **GitHub:** `StanMarek/superapi-tui`
- **Default branch:** `master`

## Architecture

### 3-Panel TUI Layout

```
┌──────────────┬──────────────────┬──────────────────┐
│ ENDPOINT LIST│ ENDPOINT DETAIL  │ REQUEST/RESPONSE  │
│ Tag groups   │ Params, schemas  │ Builder + viewer  │
│ Collapsible  │ $ref drill-down  │ Pretty/Raw/Headers│
│ Filterable   │ Request body     │ Auth & server sel │
└──────────────┴──────────────────┴──────────────────┘
```

### Key Modules

- **CLI Handler** — Parses arguments (file path or URL)
- **Spec Loader** — Loads OpenAPI specs from local files (YAML/JSON), direct URLs, or Swagger UI URLs (auto-detects and extracts spec URL)
- **Spec Parser** — Validates and structures OpenAPI v3.0/v3.1 data
- **TUI Components** — Ink/React components for each panel
- **HTTP Client** — Sends requests to endpoints using selected server + auth
- **HTTP Module** — `src/http/` — `client.ts` (resolveServerUrl, buildRequestUrl, validateSsrf, sendRequest) + `template.ts` (generateBodyTemplate from schemas) + `auth.ts` (deriveAuthOptions, applyAuth). Barrel export from `index.ts`
- **Config Manager** — Reads/writes `~/.superapi-tui.json` (saved servers, auth presets, UI preferences)

### Data Layer

- **Types:** `src/types/` — All domain types (SchemaInfo, Endpoint, ParsedSpec, etc.) with barrel export from `index.ts`
- **Utils:** `src/utils/` — url, http-method, yaml helpers with barrel export
- **Loader:** `src/loader/` — `loadSpec(input)` handles files, URLs, Swagger UI auto-detection. Returns `LoadResult`
- **Parser:** `src/parser/` — `parseSpec(content)` validates with @scalar/openapi-parser, resolves $refs, transforms to `ParsedSpec`
- Pipeline: `loadSpec(input) → parseSpec(result.content) → ParsedSpec`

### TUI Components

- **Navigation:** `src/hooks/useNavigation.ts` — shared hook for panel focus (Tab/Shift+Tab), endpoint selection, text capture guard
- **Navigation state:** `useNavigation` manages `fullscreenPanel` (PanelId | null) and `showHelp` (boolean). Input priority chain: textCapture → help overlay → `?` → quit → Esc-fullscreen → `f` → Tab
- **HelpOverlay:** `src/components/HelpOverlay.tsx` — stateless overlay with keybinding sections, dismissed via `?` or `Esc`
- **Panel types:** `PanelId = 'endpoints' | 'detail' | 'request'` — panels get `isFocused` prop, borders cyan when focused
- **EndpointList:** Flat `ListRow` discriminated union model for cursor navigation, collapsible tag groups, `/` filter mode
- **EndpointDetail:** Collapsible sections (Parameters, Request Body, Responses) with `sectionHeader`/`content` row model. Sub-components: `ParameterList`, `SchemaView` (recursive, self-managed cursor), `ResponseList`. Schema drill-down via `useSchemaNavigation` hook.
- **RequestPanel:** Row model (`server` → `auth-toggle` → [`auth-type` → `auth-field`...] → `param` → `body-editor` → `send` → `response-tabs` → `response-content`). Discriminated union `Row` type. State managed by `useRequestState` hook. Inline param/body/auth-field editing with text capture guard. Response viewer with Pretty/Raw/Headers tabs. Auth section is collapsible (`a` key), with type cycling and credential fields (bearer token, apiKey key, basic username/password).
- **SpecLoader:** Async wrapper component handling loading/error/loaded states with Spinner from `@inkjs/ui`
- **Components:** `src/components/` with barrel export from `index.ts`
- **Hooks:** `src/hooks/` with barrel export from `index.ts`

### Data Flow

```
CLI Args → Spec Loader → Parser → TUI Renderer → State Manager → Input/Output Handlers
```

### Input Sources

The app accepts a single argument that can be:
1. Local file path (`.yaml`, `.yml`, `.json`)
2. Direct spec URL (raw OpenAPI JSON/YAML)
3. Swagger UI URL (auto-detected, spec URL extracted from page)

### Authentication

Three methods, configurable per-session (session-only, no config persistence). Auth is global — one setting for all endpoints, persists across endpoint changes. Spec-aware: auth options derived from `securitySchemes`; falls back to all 3 types if spec has none (or only unsupported schemes like oauth2/openIdConnect/cookie-apiKey).

- **Bearer Token** — `Authorization: Bearer <token>`
- **API Key** — header or query parameter (configurable names)
- **Basic Auth** — `Authorization: Basic <base64>`

**Auth types:** `src/types/auth.ts` — `AuthMethod`, `AuthFieldKey` (literal union), `AuthOption` (discriminated union by method), `AuthCredentials` (discriminated union), `AuthState`
**Auth utilities:** `src/http/auth.ts` — `deriveAuthOptions(schemes)` → `DeriveAuthResult { options, unsupportedSchemes }`, `applyAuth(credentials)` → headers + queryParams maps (skips empty values)
**Hook integration:** `useRequestState(endpoint, securitySchemes)` manages auth state, injects auth into `send()`

### Keyboard Navigation

Vim-style keybindings throughout. Key globals: `Tab`/`Shift+Tab` (panel focus), `q`/`Ctrl+C` (quit), `/` (filter), `?` (help), `f` (fullscreen toggle). Navigation: `hjkl`/arrow keys, `g`/`G` (top/bottom). Request panel: `s` (send), `e` (edit body), `S` (switch server), `a` (auth config), `1`/`2`/`3` (response tabs).

## Testing

- Tests use `bun:test` — `describe`, `test`, `expect`, `mock`
- Mock `fetch` with: `globalThis.fetch = mock(() => ...) as unknown as typeof fetch` (cast through `unknown` — Bun's fetch type has extra properties)
- `mock.restore()` in `afterEach` to clean up mocks
- Test fixtures live in `src/__tests__/fixtures/`
- Path alias `@/*` → `src/*` works in tests via tsconfig

### Ink Component Testing

- Use `ink-testing-library` — `render()` returns `{ lastFrame, stdin }`
- Ink renders are async in Bun — use `await delay(50)` after `stdin.write()` before asserting
- `lastFrame()` returns current terminal output as string for snapshot assertions
- `useInput` tests: write raw chars (`stdin.write('j')`) or escape sequences (`stdin.write('\t')`)
- Bun `mock().mock.lastCall` is typed `[] | undefined` — use `as unknown as [T1, T2]` to access args
- Integration tests importing `App.tsx` may show "File not found" in parallel runs — run individually with `bun test <file>`
- Escape sequences: Escape=`\x1b`, Shift+Tab=`\x1b[Z`, Tab=`\t`

### Hook Testing

- Test hooks via harness components: render a component that calls the hook and displays state as text, then assert on `lastFrame()`
- Trigger hook actions via `useEffect` + `setTimeout`, never as side effects during render
- For multi-phase tests (set state then validate): use a phase state machine (`'set' | 'validate' | 'done'`) with separate `useEffect` per phase
- Hook harness test data (endpoints, servers) must be created OUTSIDE the component — objects created inside render are new each time, triggering change-detection effects infinitely

## Dependencies — Gotchas

- `@scalar/openapi-parser` requires `ajv` as peer dep — install both
- `@scalar/openapi-parser`'s `dereference()` is synchronous despite returning `{ schema }` — no `await` needed
- `yaml` package: import as `import YAML from 'yaml'`

## Code Conventions

- Error chaining: use ES2022 `super(message, { cause })` — never shadow `cause` as a class field
- Prefer `readonly` on all interface fields and `ReadonlyMap`/`readonly T[]` for collections
- Literal union types over plain `string` when possible (e.g., `'apiKey' | 'http' | 'oauth2' | 'openIdConnect'`)
- No silent fallbacks in parsers — fail explicitly with descriptive errors
- SSRF protection: validate protocol (http/https only) before `fetch()`
- Circular reference detection: use path-scoped ancestor tracking (`WeakSet` with add/delete), not global visitation
- React hooks in Ink: all `useEffect`/`useInput` calls must precede conditional returns — Ink components often have multi-phase render patterns
- `react-hooks/exhaustive-deps` ESLint rule is NOT configured — don't add eslint-disable comments for it; don't add hook return objects to `useEffect` deps (they're new objects each render and cause infinite loops)
- Text capture guard: components with text input modes (filter, editor) must notify parent via callback to suppress global keybindings (`q` quit, etc.)
- Composite React keys for multi-tagged items: `${tag}-${endpoint.id}` to prevent duplicates
- OpenAPI path/server variable regex: use `\{([^}]+)\}` not `\{(\w+)\}` — param names can contain hyphens and dots
- Callbacks consuming React state: accept optional arg for the current value to avoid stale closures (e.g., `validateBody(text?: string)` uses `text ?? bodyText`)
- Stale async response protection: use a `useRef` counter incremented on endpoint change; ignore responses where counter has moved on
- Exhaustive switch defaults: use `never` type check in discriminated union switches to catch missing cases at compile time
- Ink paste handling: use ref-backed edit buffer with debounced state sync (16ms) to prevent render storms — terminals may send paste char-by-char, causing one setState + re-render per character
- Auth injection safety: `applyAuth` must skip setting headers/params when credential values are empty — sending `Authorization: Bearer ` (empty token) causes 401s
- Overlay input isolation: when showing overlays (help, etc.), gate `isFocused` with `&& !showOverlay` — Ink `display="none"` hides rendering but `useInput({ isActive: isFocused })` still fires if `isFocused` is true

## Design Decisions

- Swagger 2.0 is **not** in scope — only OpenAPI v3.0 and v3.1
- Schema viewer is integrated into the endpoint detail panel, not a separate top-level panel
- JSON body editor is inline (no external editor) with auto-generated templates from schemas
- HTTP method badge colors: GET=green, POST=blue, PUT=orange, DELETE=red, PATCH=cyan

## Reference

Full project specification is in `docs/INITIAL_PLAN.md`.
