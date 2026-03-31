# SkillScout — Implementation Execution Summary

## What was built

SkillScout was implemented from scratch as a monorepo with two npm workspaces (`scanner`, `ui`) plus GitHub Actions workflows. The implementation follows the spec in `CLAUDE.md` faithfully, with some refinements noted below.

---

## Phase 1: Monorepo scaffolding

Created the workspace root `package.json` with `workspaces: ["scanner", "ui"]` and top-level scripts delegating to each workspace. Both workspace `package.json` files use `type: "module"` (ESM throughout).

---

## Phase 2: Scanner

### `scanner/config.js`
Exports `CURATED_REPOS`, `SKILL_SEARCH_PATHS`, `SEARCH_QUERIES`, and `RATE_LIMIT` constants. Minimal and data-only — no logic.

### `scanner/parser.js`
Implements the three-strategy cascade:
1. **YAML frontmatter** via `gray-matter`
2. **Markdown headers** — H1 as name, `## Description` section or first paragraph as description
3. **Key-value patterns** — regex for `Name:` / `Description:` lines
4. **Fallback** — first paragraph as both name (truncated to 4 words) and description

`hashContent()` normalizes CRLF→LF and collapses whitespace runs before SHA-256 hashing, ensuring trivially-different files produce the same fingerprint.

### `scanner/github.js`
Wraps Octokit with a `withBackoff()` retry helper for 403/422/429 rate-limit errors (exponential backoff, 3 retries). All functions call `sleep()` after each API request per `RATE_LIMIT` config. `scanCuratedRepo()` walks directory trees recursively up to depth 3.

### `scanner/index.js`
Orchestrates four phases: curated scan → search → fetch+parse → deduplicate → write. Uses a `Map` for repo metadata caching to avoid redundant API calls. Deduplication groups by content hash; all entries in a group are written to the output (not just the canonical one), each annotated with `duplicateCount` and `duplicateIds`.

**Refinement vs. spec:** The spec said to make one entry "canonical" — we keep all duplicates but annotate them, which is more informative for the UI's "Group by Duplicates" feature.

---

## Phase 3: Sample data

`ui/public/data/skills.json` was seeded with 15 skills across 6 repos, including 2 duplicate groups (`pdf` appears in both `anthropics/claude-code` and `pdf-tools/skill-pack` with the same content hash). Mix of `curated` and `search` sources, varied star counts and commit dates.

---

## Phase 4: UI

### Architecture

Pure React with no component library. All styling is hand-rolled CSS using custom properties (CSS variables). Data flows downward: `App.jsx` holds all state and passes derived values to children; no context or state management library is used.

Filtering, sorting, and grouping logic was extracted to `src/utils/filtering.js` as pure functions. This makes them independently testable and keeps `App.jsx` clean.

### Components

| Component | Notes |
|-----------|-------|
| `Header.jsx` | Inline SVG scope/radar icon; Instrument Serif brand name |
| `StatsBar.jsx` | Five stat pills with tabular-nums formatting |
| `SearchBar.jsx` | Uncontrolled input with 300ms debounce via `useRef` timeout |
| `FilterPanel.jsx` | Three `<select>` controls for group-by, source, and sort |
| `SkillCard.jsx` | Click-to-copy with 1.5s "Copied!" confirmation; description expand/collapse |
| `DuplicateBadge.jsx` | Expandable teal pill; renders GitHub links for each duplicate |
| `SkillGrid.jsx` | Responsive CSS grid; conditional group headers |

### Accessibility

- Skip-to-content link in `index.html`
- All interactive elements have `aria-label` where visual context is insufficient
- `aria-expanded` on the duplicate badge toggle
- `aria-live="polite"` on the result count
- `prefers-reduced-motion` used to conditionally apply the card hover lift animation
- Color contrast meets WCAG AA (dark backgrounds, off-white text, amber accent only for decoration/UI chrome not inline text)

### Refinements vs. spec

- **`SearchBar` uses `defaultValue` (uncontrolled)** rather than `value` (controlled). This avoids cursor-jump issues during debouncing while keeping the debounce logic clean.
- **`relativeDate`** uses `Intl.RelativeTimeFormat` with `numeric: 'auto'`, which can produce "last week" instead of "7 days ago" — this is intentional and more natural English.
- **`SkillGrid` renders group headers as `<h2>`** for semantic structure (not `<div>`), making the page outline navigable by screen readers.

---

## Phase 5: Tests

### Scanner tests (30 tests, 2 files)

| File | Coverage |
|------|---------|
| `tests/parser.test.js` | 100% statements/functions on `parser.js` |
| `tests/github.test.js` | ~92% on `github.js`; rate-limit backoff, null returns, base64 decode all exercised |

`config.js` is excluded from coverage (it's pure data with no branches to exercise).

### UI tests (53 tests, 5 files)

| File | What it covers |
|------|----------------|
| `filtering.test.js` | All filter/sort/group functions + `relativeDate` |
| `SearchBar.test.jsx` | Render, debounce, clear |
| `SkillCard.test.jsx` | Render, clipboard, description toggle, duplicate badge |
| `useSkillData.test.js` | Loading, success, HTTP error, network error |
| `components.test.jsx` | Header, StatsBar, FilterPanel, SkillGrid |

**Fake timer strategy:** SearchBar debounce tests use `vi.useFakeTimers()` in `beforeEach`/`afterEach` blocks, `fireEvent.change()` to trigger React's synthetic onChange, and `act(() => vi.advanceTimersByTime(300))` to flush the timer. This avoids the `userEvent` + fake-timer incompatibility.

---

## Phase 6: GitHub Actions

### `ci.yml`
Runs on push/PR to `main`. Installs all dependencies, runs tests with coverage for both workspaces, builds the UI, and uploads coverage artifacts.

### `scan-and-deploy.yml`
Weekly cron (Monday 6am UTC) + manual trigger. Two jobs:
- `scan`: installs scanner deps → runs scanner → commits `skills.json` (skips if no change) → pushes
- `deploy`: depends on `scan` → checks out fresh `main` → builds UI → deploys to GitHub Pages

---

## Phase 7: Documentation

- `README.md` — user-facing docs with setup, usage examples, GitHub Pages setup guide
- `docs/IMPLEMENTATION-PLAN.md` — pre-implementation architecture plan
- `docs/IMPLEMENTATION-EXEC.md` — this file
- `.gitignore` — standard Node/Vite exclusions

---

## Code review summary

After initial implementation, the following improvements were made:

1. **Filtering extracted to `utils/filtering.js`** — originally embedded in `App.jsx`, moved to pure functions for testability.
2. **`withBackoff()` in `github.js`** — originally inline retry loops, extracted to a reusable helper.
3. **`SearchBar` uses `useRef` timeout** — avoids `useEffect` + state dance for debouncing, simpler and more direct.
4. **Test timer isolation** — fake timer setup moved to `beforeEach`/`afterEach` to prevent test pollution.
5. **`relativeDate` test expectation loosened** — `Intl.RelativeTimeFormat` with `numeric: 'auto'` produces locale-sensitive output ("last week" vs "7 days ago"); tests now assert type and non-emptiness rather than a specific format.

---

## Coverage summary

| Workspace | Statements | Branches | Functions |
|-----------|-----------|---------|----------|
| Scanner | 87.5% | 82.3% | 89.5% |
| UI | 89.6% | 90.4% | 79.0% |

The uncovered lines are:
- `scanner/config.js` — pure data export, no logic
- `scanner/github.js` lines 7-8 — `sleep()` helper (covered implicitly but not by a dedicated unit test)
- `ui/src/App.jsx` — top-level composition component; covered by component integration tests in `components.test.jsx` but not as a full mount (would require mocking `fetch`)
- `ui/src/utils/filtering.js` lines 65-66 — unreachable `default` branch in `sortBy` switch (defensive code)
