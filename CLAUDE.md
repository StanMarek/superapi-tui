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
- **Config Manager** — Reads/writes `~/.superapi-tui.json` (saved servers, auth presets, UI preferences)

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

Three methods, configurable per-session or via config file:
- **Bearer Token** — `Authorization: Bearer <token>`
- **API Key** — header or query parameter (configurable names)
- **Basic Auth** — `Authorization: Basic <base64>`

### Keyboard Navigation

Vim-style keybindings throughout. Key globals: `Tab`/`Shift+Tab` (panel focus), `q`/`Ctrl+C` (quit), `/` (filter), `?` (help), `f` (fullscreen toggle). Navigation: `hjkl`/arrow keys, `g`/`G` (top/bottom). Request panel: `s` (send), `e` (edit body), `S` (switch server), `a` (auth config), `1`/`2`/`3` (response tabs).

## Design Decisions

- Swagger 2.0 is **not** in scope — only OpenAPI v3.0 and v3.1
- Schema viewer is integrated into the endpoint detail panel, not a separate top-level panel
- JSON body editor is inline (no external editor) with auto-generated templates from schemas
- HTTP method badge colors: GET=green, POST=blue, PUT=orange, DELETE=red, PATCH=cyan

## Reference

Full project specification is in `docs/INITIAL_PLAN.md`.
