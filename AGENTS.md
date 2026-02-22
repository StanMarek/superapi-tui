# Repository Guidelines

## Project Structure & Module Organization
Core code lives in `src/`:
- `src/cli.tsx` is the CLI entrypoint, and `src/App.tsx` composes the TUI.
- `src/components/` contains Ink UI panels (for example `EndpointList.tsx`, `EndpointDetail.tsx`).
- `src/loader/` handles spec loading (file, URL, Swagger UI).
- `src/parser/` validates, transforms, and dereferences OpenAPI data.
- `src/hooks/`, `src/utils/`, and `src/types/` hold shared logic and contracts.

Tests are in `src/__tests__/` and organized by domain (`components/`, `loader/`, `parser/`, `utils/`) with fixtures in `src/__tests__/fixtures/`. Build output goes to `dist/` (generated).

## Build, Test, and Development Commands
- `bun install`: install dependencies.
- `bun run dev`: run the TUI directly from `src/cli.tsx`.
- `bun run build`: bundle to `dist/cli.js` via `build.ts`.
- `node dist/cli.js`: run compiled output.
- `bun test`: run all tests.
- `bun run typecheck`: run strict TypeScript checks (`tsc --noEmit`).
- `bun run lint` / `bun run lint:fix`: lint or auto-fix `src/`.
- `bun run format` / `bun run format:check`: apply/check Prettier formatting.

## Coding Style & Naming Conventions
Use TypeScript with strict typing and functional React/Ink components.
- Formatting: 2-space indent, single quotes, no semicolons, trailing commas, max width 100.
- Imports: use alias paths like `@/types/index.js` (configured in `tsconfig.json`).
- Naming: components use `PascalCase` files, hooks use `useX` (for example `useNavigation.ts`), non-component modules use descriptive lowercase or kebab-case (for example `transform-endpoint.ts`).

## Testing Guidelines
Use Bun’s test runner with `ink-testing-library`.
- Name tests `*.test.ts` or `*.test.tsx`.
- Mirror source areas in `src/__tests__/`.
- Add/update fixtures when parsing or loader behavior changes.
- For targeted runs, pass a path: `bun test src/__tests__/parser/dereference.test.ts`.

## Commit & Pull Request Guidelines
Follow conventional-style prefixes seen in history: `feat:`, `fix:`, `docs:`, `test:`, `chore:`.
- Keep commits focused and imperative (example: `feat: add endpoint request body rendering`).
- PRs should include: concise summary, rationale, test evidence (`bun test`, `bun run typecheck`, `bun run lint`), and screenshots/GIFs for TUI behavior changes.
- Link related issue/plan docs when applicable (`docs/plans/...`).
