# superapi-tui

Terminal UI for browsing and interacting with OpenAPI v3.0/v3.1 specifications. Inspired by [openapi-tui](https://github.com/zaghaghi/openapi-tui). Built with Bun, Ink (React for CLI), and TypeScript.

## Features

- **3-panel layout** — endpoint list, endpoint detail, and request/response panels
- **Multiple input sources** — local files (YAML/JSON), direct spec URLs, or Swagger UI URLs (auto-detected)
- **Vim-style navigation** — `hjkl`, collapsible tag groups, `/` filter mode
- **Schema drill-down** — recursive `$ref` resolution with interactive navigation
- **Authentication** — Bearer token, API key (header/query), and Basic Auth
- **OpenAPI v3.0 & v3.1** — validated with `@scalar/openapi-parser`

## Quick Start

```bash
# Run directly with npx
npx superapi-tui ./petstore.yaml

# Or with bunx
bunx superapi-tui https://petstore3.swagger.io/api/v3/openapi.json

# Swagger UI URLs are auto-detected
npx superapi-tui https://petstore.swagger.io/
```

## Install

```bash
# Global install
npm install -g superapi-tui

# Then run
superapi-tui <file-or-url>
```

## Layout

```
+--------------+------------------+------------------+
| ENDPOINT LIST| ENDPOINT DETAIL  | REQUEST/RESPONSE  |
| Tag groups   | Params, schemas  | Builder + viewer  |
| Collapsible  | $ref drill-down  | Pretty/Raw/Headers|
| Filterable   | Request body     | Auth & server sel |
+--------------+------------------+------------------+
```

## Keybindings

| Key | Action |
|-----|--------|
| `Tab` / `Shift+Tab` | Switch panel focus |
| `j` / `k` or `Up` / `Down` | Navigate list items |
| `h` / `l` or `Left` / `Right` | Collapse/expand, navigate schemas |
| `g` / `G` | Jump to top / bottom |
| `Enter` | Select / expand |
| `/` | Filter endpoints |
| `f` | Toggle fullscreen on focused panel |
| `?` | Show help |
| `q` / `Ctrl+C` | Quit |

**Request panel:**

| Key | Action |
|-----|--------|
| `s` | Send request |
| `e` | Edit request body |
| `S` | Switch server |
| `a` | Configure auth |
| `1` / `2` / `3` | Switch response tabs |

## Development

```bash
# Install dependencies
bun install

# Run in development
bun run dev

# Build for distribution
bun run build

# Run compiled output
node dist/cli.js
```

| Command | Description |
|---------|-------------|
| `bun run dev` | Run in development mode |
| `bun run build` | Build for distribution |
| `bun test` | Run tests |
| `bun run typecheck` | Type check |
| `bun run lint` | Lint source files |
| `bun run lint:fix` | Lint and auto-fix |
| `bun run format` | Format source files |
| `bun run format:check` | Check formatting |

## Tech Stack

- **Runtime:** [Bun](https://bun.sh)
- **TUI Framework:** [Ink 6](https://github.com/vadimdemedes/ink) + React 19
- **Language:** TypeScript
- **Spec Parsing:** [@scalar/openapi-parser](https://github.com/scalar/scalar)

## License

MIT
