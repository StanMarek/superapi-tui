# superapi-tui — Initial Project Plan

## Overview

A Terminal User Interface (TUI) application for browsing and interacting with OpenAPI v3.0/v3.1 specifications, inspired by [openapi-tui](https://github.com/zaghaghi/openapi-tui). Built with **Bun**, **Ink** (React for CLI), and **TypeScript**.

---

## Tech Stack

- **Runtime:** Bun
- **TUI Framework:** Ink (React-based terminal rendering)
- **Language:** TypeScript
- **Distribution:** npm package, runnable via `npx superapi-tui` or `bunx superapi-tui`

---

## Supported Spec Versions

- OpenAPI v3.0
- OpenAPI v3.1

Swagger 2.0 is **not** in scope.

---

## Input Sources

### Local Files
- YAML (`.yaml`, `.yml`)
- JSON (`.json`)

### Remote URLs
- **Direct spec URLs** — pointing to raw OpenAPI JSON/YAML (e.g., `/v3/api-docs/Api`)
- **Swagger UI URLs** — the app auto-detects Swagger UI pages (e.g., `/swagger-ui/index.html`) and extracts the actual spec URL from the page automatically

### CLI Usage

```bash
# Local file
superapi-tui ./openapi.yaml

# Direct spec URL
superapi-tui https://example.com/v3/api-docs

# Swagger UI URL (auto-detected)
superapi-tui https://example.com/swagger-ui/index.html
```

---

## UI Layout — 3-Panel Design

```
┌──────────────────┬──────────────────────┬──────────────────────┐
│                  │                      │                      │
│   ENDPOINT LIST  │   ENDPOINT DETAIL    │   REQUEST/RESPONSE   │
│                  │                      │                      │
│  - Tag groups    │  - Parameters        │  - Request builder   │
│  - Collapsible   │  - Request body      │  - Response viewer   │
│  - Color-coded   │  - Response schemas  │  - Tab switching     │
│  - Filterable    │  - Schema drill-down │                      │
│                  │                      │                      │
└──────────────────┴──────────────────────┴──────────────────────┘
```

### Left Panel — Endpoint List
- Endpoints grouped by **tags** (from the OpenAPI spec)
- **Collapsible groups** — expand/collapse tag sections with Enter or arrow keys
- **Color-coded HTTP method badges:**
  - `GET` — green
  - `POST` — blue
  - `PUT` — orange
  - `DELETE` — red
  - `PATCH` — cyan
- **Filter** endpoints by pressing `/` and typing a search query
- Shows endpoint path and summary text

### Middle Panel — Endpoint Detail
- **Parameters:** path, query, header, and cookie parameters with types and descriptions
- **Request body:** schema visualization with field names, types, required markers
- **Response schemas:** for each status code (200, 400, 404, etc.)
- **Schema drill-down:** press a key to navigate into `$ref` referenced models/components
- Scrollable content for large schemas

### Right Panel — Request / Response
- **Request builder:**
  - Editable parameter values
  - Inline JSON body editor with auto-generated template from schema
  - Field hints shown alongside the editor
  - Server selector (see below)
  - Auth configuration
- **Response viewer** with 3 tabs:
  - **Pretty JSON** — formatted, syntax-highlighted JSON response
  - **Raw** — unformatted raw response body
  - **Headers** — response headers with HTTP status code

---

## Keyboard Navigation

### Global
| Key | Action |
|-----|--------|
| `Tab` / `Shift+Tab` | Switch focus between panels |
| `q` / `Ctrl+C` | Quit the application |
| `/` | Open filter/search in endpoint list |
| `Esc` | Close filter, cancel current action |
| `f` | Toggle fullscreen for the focused panel |
| `?` | Show help / keybinding reference |

### Navigation (works in all panels)
| Key | Action |
|-----|--------|
| `j` / `↓` | Move down |
| `k` / `↑` | Move up |
| `h` / `←` | Collapse group / move to left panel |
| `l` / `→` | Expand group / move to right panel |
| `Enter` | Select / expand / toggle |
| `g` | Go to top |
| `G` | Go to bottom |

### Request Panel
| Key | Action |
|-----|--------|
| `s` | Send the request |
| `1` / `2` / `3` | Switch response tab (Pretty / Raw / Headers) |
| `e` | Edit request body |
| `S` | Switch server |
| `a` | Configure auth |

---

## Authentication

Supported methods (configurable per-session or via config file):

### Bearer Token
```
Authorization: Bearer <token>
```

### API Key
- As header: `X-API-Key: <value>` (configurable header name)
- As query parameter: `?api_key=<value>` (configurable param name)

### Basic Auth
```
Authorization: Basic <base64(username:password)>
```

Auth is set via a keybinding (`a`) which opens an auth configuration dialog within the TUI.

---

## Server Selection

- Reads all `servers` entries from the OpenAPI spec
- Displays server URL and description
- User can switch between servers with `S` keybinding
- Selected server is used as the base URL for all requests
- If spec has only one server, it's used automatically

---

## Schema / Models Viewer

- Accessible from the endpoint detail panel (middle panel)
- When viewing an endpoint's request or response schema, press a key to drill into `$ref` referenced components
- Shows the full model definition: field names, types, required fields, descriptions, enums, nested objects
- Supports navigating back up the reference chain
- Not a separate top-level panel — integrated into the endpoint detail flow

---

## Inline JSON Body Editor

- Auto-generates a JSON template from the request body schema
- Pre-fills with example values when available, otherwise uses sensible defaults by type:
  - `string` → `""`
  - `integer` → `0`
  - `boolean` → `false`
  - `array` → `[]`
  - `object` → `{}`
- Shows field hints (type, required, description) alongside the editor
- Supports editing directly in the TUI (no external editor needed)

---

## Configuration

### File Location
```
~/.superapi-tui.json
```

### Config Structure
```json
{
  "servers": [
    {
      "name": "My API (dev)",
      "url": "https://example.com/swagger-ui/index.html",
      "auth": {
        "type": "bearer",
        "token": "xxx"
      }
    }
  ],
  "preferences": {
    "defaultResponseTab": "pretty",
    "vim_keys": true,
    "theme": "default"
  }
}
```

### What the Config Stores
- **Saved servers** — URL, name, and auth presets for frequently used APIs
- **Auth presets** — reusable auth configurations per server
- **UI preferences** — default response tab, key style, theme

---

## Distribution

- Published to **npm** as `superapi-tui`
- Runnable without installation:
  - `npx superapi-tui <spec-url-or-file>`
  - `bunx superapi-tui <spec-url-or-file>`
- Global install also supported:
  - `npm i -g superapi-tui`
  - `bun add -g superapi-tui`

### package.json bin entry
```json
{
  "name": "superapi-tui",
  "bin": {
    "superapi-tui": "./dist/cli.js"
  }
}
```

---

## Reference: openapi-tui Feature Parity

| Feature | openapi-tui (Rust) | superapi-tui (Bun+Ink) |
|---------|-------------------|----------------------|
| Browse OpenAPI spec | ✅ | ✅ |
| Send HTTP requests | ✅ | ✅ |
| Multi-panel layout | ✅ | ✅ (3-panel) |
| Tag grouping | ✅ | ✅ (collapsible) |
| Endpoint filtering | ✅ | ✅ |
| Schema drill-down | ✅ | ✅ |
| Server selection | ✅ | ✅ |
| Auth support | ✅ (headers) | ✅ (Bearer/API Key/Basic) |
| Request body editing | ✅ | ✅ (inline + schema hints) |
| Response tabs | ✅ | ✅ (Pretty/Raw/Headers) |
| Config file | ❌ | ✅ |
| Swagger UI URL auto-detect | ❌ | ✅ |
| Vim keybindings | ✅ | ✅ |
| Fullscreen toggle | ✅ | ✅ |
| Webhooks view | ✅ | ❌ (future) |
| Request history | ✅ | ❌ (future) |

---

## Future Considerations (Out of Scope for v1)

- Webhooks view
- Request history with persistence
- cURL export for requests
- Environment variables in request templates
- OAuth2 flow support
- Themes / color scheme customization
- Plugin system for custom renderers
