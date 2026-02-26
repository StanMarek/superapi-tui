<p align="center">
  <h1 align="center">superapi-tui</h1>
  <p align="center">A terminal UI for browsing and interacting with OpenAPI v3.0/v3.1 specifications.</p>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/superapi-tui"><img src="https://img.shields.io/npm/v/superapi-tui" alt="npm version"></a>
  <a href="https://github.com/StanMarek/superapi-tui/blob/master/LICENSE"><img src="https://img.shields.io/npm/l/superapi-tui" alt="license"></a>
  <a href="https://www.npmjs.com/package/superapi-tui"><img src="https://img.shields.io/node/v/superapi-tui" alt="node version"></a>
</p>

<!-- TODO: Add screenshot/GIF of the app in action -->
<!-- Recommended: Record with `vhs` (https://github.com/charmbracelet/vhs) or `asciinema`, convert to GIF -->
<!-- Place in a top-level `media/` directory and reference here -->
<!-- Example: <p align="center"><img src="media/demo.gif" alt="superapi-tui demo" width="800"></p> -->

## Features

- **3-panel layout** — endpoint list, endpoint detail, and request/response panels
- **Multiple input sources** — local files (YAML/JSON), direct spec URLs, or Swagger UI URLs (auto-detected)
- **Interactive launcher** — run with no arguments for a guided server selection / URL entry
- **Vim-style navigation** — `hjkl`, collapsible tag groups, `/` filter mode, fullscreen toggle
- **Schema drill-down** — recursive `$ref` resolution with interactive navigation
- **Built-in HTTP client** — send requests directly from the TUI with server selection
- **Authentication** — Bearer token, API key (header/query), and Basic Auth with config persistence
- **Config persistence** — save server + auth credentials, auto-restore on next launch
- **OpenAPI v3.0 & v3.1** — validated with `@scalar/openapi-parser`

## Quick Start

```bash
# Try it instantly — no install required
npx superapi-tui https://petstore3.swagger.io/api/v3/openapi.json

# Or with Bun
bunx superapi-tui ./petstore.yaml

# Swagger UI URLs are auto-detected
npx superapi-tui https://petstore.swagger.io/
```

### Global Install

```bash
npm install -g superapi-tui

superapi-tui <file-or-url>
```

## Usage

### Input Sources

| Source | Example |
|--------|---------|
| Local file | `superapi-tui ./openapi.yaml` |
| Direct URL | `superapi-tui https://api.example.com/openapi.json` |
| Swagger UI | `superapi-tui https://petstore.swagger.io/` |

YAML, JSON, and `.yml` files are all supported. Swagger UI pages are auto-detected — the spec URL is extracted automatically.

### Interactive Launcher

Run with no arguments to get an interactive launcher:

```bash
superapi-tui
```

The launcher lets you pick from previously saved servers or enter a new URL manually.

## Keybindings

### Global

| Key | Action |
|-----|--------|
| `Tab` / `Shift+Tab` | Switch panel focus |
| `j` / `k` or `Up` / `Down` | Navigate list items |
| `h` / `l` or `Left` / `Right` | Collapse/expand, navigate schemas |
| `g` / `G` | Jump to top / bottom |
| `Enter` | Select / expand |
| `/` | Filter endpoints |
| `f` | Toggle fullscreen on focused panel |
| `?` | Show help overlay |
| `q` / `Ctrl+C` | Quit |

### Request Panel

| Key | Action |
|-----|--------|
| `s` | Send request |
| `e` | Edit request body |
| `S` | Switch server |
| `a` | Toggle auth configuration |
| `W` | Save server + auth to config |
| `1` / `2` / `3` | Switch response tabs (Pretty / Raw / Headers) |

## Authentication

Three methods, configurable per-session:

- **Bearer Token** — `Authorization: Bearer <token>`
- **API Key** — header or query parameter (configurable name + value)
- **Basic Auth** — `Authorization: Basic <base64>`

Press `a` in the request panel to cycle auth types and enter credentials. Auth is global across all endpoints.

Press `W` to save the current server + auth to your config file. On next launch, credentials auto-restore when the server URL matches.

## Configuration

Config is stored at `~/.superapi-tui.toml` (with JSON fallback at `~/.superapi-tui.json`).

Saved servers and auth credentials are managed automatically via the `W` keybinding. The config file is created with `0600` permissions for credential safety.

## Layout

```
+───────────────+──────────────────+──────────────────+
│ ENDPOINT LIST │ ENDPOINT DETAIL  │ REQUEST/RESPONSE  │
│ Tag groups    │ Params, schemas  │ Builder + viewer  │
│ Collapsible   │ $ref drill-down  │ Pretty/Raw/Headers│
│ Filterable    │ Request body     │ Auth & server sel │
+───────────────+──────────────────+──────────────────+
```

<details>
<summary><strong>Development</strong></summary>

### Prerequisites

- [Bun](https://bun.sh) (v1.0+)

### Commands

| Command | Description |
|---------|-------------|
| `bun install` | Install dependencies |
| `bun run dev` | Run in development mode |
| `bun run build` | Build for distribution |
| `bun test` | Run tests |
| `bun run typecheck` | Type check with `tsc --noEmit` |
| `bun run lint` | Lint source files |
| `bun run lint:fix` | Lint and auto-fix |
| `bun run format` | Format with Prettier |
| `bun run format:check` | Check formatting |

### Tech Stack

- **Runtime:** [Bun](https://bun.sh)
- **TUI Framework:** [Ink 6](https://github.com/vadimdemedes/ink) + React 19
- **Language:** TypeScript
- **Spec Parsing:** [@scalar/openapi-parser](https://github.com/scalar/scalar)

</details>

<details>
<summary><strong>Contributing</strong></summary>

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feat/my-feature`)
3. Make your changes with tests
4. Run `bun test && bun run typecheck && bun run lint` before committing
5. Open a pull request against `master`

</details>

## Acknowledgments

Inspired by [openapi-tui](https://github.com/zaghaghi/openapi-tui) by [@zaghaghi](https://github.com/zaghaghi).

## License

[MIT](LICENSE) &copy; [StanMarek](https://github.com/StanMarek)
