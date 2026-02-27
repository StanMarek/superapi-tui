# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-02-27

### Added

- **3-panel TUI layout** — endpoint list, endpoint detail, and request/response panels
- **OpenAPI v3.0/v3.1 support** — spec loading from local files (YAML/JSON), direct URLs, and Swagger UI URLs
- **Swagger UI auto-detection** — extracts spec URL from Swagger UI pages via inline config, configUrl, and external script fallback chain
- **Endpoint list** — collapsible tag groups, `/` filter mode, vim-style navigation
- **Endpoint detail** — parameters, request body, responses with recursive schema viewer and `$ref` drill-down
- **Request builder** — server selection, inline parameter/body editing, auto-generated body templates from schemas
- **HTTP client** — sends requests with SSRF protection; pretty/raw/headers response tabs
- **Authentication** — bearer token, API key (header/query), and basic auth; spec-aware auth options derived from `securitySchemes`
- **Config persistence** — save server + auth to `~/.superapi-tui.toml`; TOML primary with JSON fallback; auto-restore on launch
- **Launcher** — interactive server picker with saved servers or manual URL/file entry
- **Fullscreen toggle** — `f` key to maximize any panel; `?` for help overlay with keybinding reference
- **Vim-like line editor** — cursor-aware text editing for inline input fields
- **Virtualized viewport scrolling** — smooth scrolling for large endpoint lists and detail sections
- **CLI flags** — `--help` / `-h` and `--version` / `-v`
- **Node.js compatibility** — runs under Node.js 18+ via `npx superapi-tui`

[0.1.0]: https://github.com/StanMarek/superapi-tui/releases/tag/v0.1.0
