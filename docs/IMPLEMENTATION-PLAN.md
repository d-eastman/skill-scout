# SkillScout Implementation Plan

## Overview

SkillScout is a static-site tool for discovering and browsing Claude SKILL.md files on GitHub. It consists of a Node.js scanner that writes a JSON index, and a Vite+React SPA that reads that index. A GitHub Actions workflow runs the scanner weekly and deploys the UI to GitHub Pages.

---

## Phase 1: Monorepo Scaffolding

**Goal:** Establish the workspace root and package manifests so `npm install` works end-to-end.

### Steps

1. Create root `package.json` with `workspaces: ["scanner", "ui"]` and top-level scripts (`scan`, `dev`, `build`).
2. Create `scanner/package.json` — `type: "module"`, deps: `octokit`, `gray-matter`.
3. Create `ui/package.json` — Vite + React, `@vitejs/plugin-react`.
4. Create `ui/vite.config.js` with `base: "/skill-scout/"`.
5. Create `ui/index.html`.

---

## Phase 2: Scanner Implementation

**Goal:** Implement the four scanner modules and produce a valid `skills.json`.

### Files

| File | Responsibility |
|------|---------------|
| `scanner/config.js` | Curated repo list, search paths, rate-limit constants |
| `scanner/github.js` | Octokit API client functions |
| `scanner/parser.js` | SKILL.md parser + content hasher |
| `scanner/index.js` | Orchestrator: search → fetch → parse → deduplicate → write |

### Key Decisions

- All GitHub API calls go through `scanner/github.js`; `index.js` does no direct API work.
- `parser.js` uses a three-strategy cascade (YAML frontmatter → Markdown headers → key-value regex). It never throws; it always returns something.
- Deduplication groups entries by `contentHash`. The first entry in each group becomes the canonical record; others reference its `id` in `duplicateIds`.
- Rate limiting is enforced via a `sleep()` helper called after every API request.
- The scanner writes output to `ui/public/data/skills.json`.

### Output Schema

```json
{
  "meta": { "scanDate", "totalSkills", "uniqueSkills", "totalRepos", "duplicateGroups" },
  "skills": [ { "id", "name", "description", "repo", "repoOwner", "repoUrl", "repoStars",
                "skillPath", "installCommand", "contentHash", "lastCommitDate", "scanDate",
                "source", "duplicateCount", "duplicateIds" } ]
}
```

---

## Phase 3: Sample Data

**Goal:** Seed `ui/public/data/skills.json` with 12–15 realistic entries so the UI can be developed and tested without running the scanner.

- Include 5–6 distinct repos with varied star counts.
- Include at least 2 duplicate groups (same `contentHash`, different repos).
- Mix `curated` and `search` sources.
- Use realistic skill names: pdf, docx, xlsx, sql-query, docker-compose, terraform, etc.

---

## Phase 4: UI Implementation

**Goal:** Build the React SPA according to the design spec.

### Order of Implementation

1. `styles.css` — CSS custom properties, resets, typography imports (Google Fonts).
2. `useSkillData.js` — fetch hook.
3. `App.jsx` — state management, filtering, sorting, grouping logic.
4. `Header.jsx` — brand mark.
5. `StatsBar.jsx` — stat pills.
6. `SearchBar.jsx` — debounced search input.
7. `FilterPanel.jsx` — group-by, source, sort controls.
8. `DuplicateBadge.jsx` — expandable duplicate indicator.
9. `SkillCard.jsx` — compact data card with copy-to-clipboard.
10. `SkillGrid.jsx` — responsive grid with group headers and empty state.

### Design Constraints

- No component library; all CSS is hand-rolled.
- Dark theme with charcoal background, amber accent, teal for duplicates.
- WCAG AA contrast ratios throughout.
- `prefers-reduced-motion` respected.
- Keyboard navigation on all interactive elements.

---

## Phase 5: Tests

**Goal:** Achieve meaningful unit coverage on all scanner modules and UI hooks/utilities, plus integration tests for the scanner pipeline.

### Scanner Tests (`scanner/tests/`)

| Test File | What It Tests |
|-----------|--------------|
| `parser.test.js` | `parseSkillMd` with YAML frontmatter, markdown headers, key-value, malformed input; `hashContent` normalization |
| `github.test.js` | API function contracts with mocked Octokit; rate-limit error handling |
| `index.test.js` | End-to-end pipeline with fully mocked GitHub client; verifies deduplication and output schema |

### UI Tests (`ui/src/__tests__/`)

| Test File | What It Tests |
|-----------|--------------|
| `useSkillData.test.js` | Hook returns loading/error/data states |
| `filtering.test.js` | Search, source filter, sort, and group logic (pure functions extracted from App) |
| `SkillCard.test.js` | Render, copy-to-clipboard, expand description, duplicate badge expand |
| `SearchBar.test.js` | Debounce, clear button |

### Tooling

- **Scanner**: [Vitest](https://vitest.dev/) (ESM-native, no transform config needed).
- **UI**: Vitest + `@testing-library/react` + `@testing-library/user-event` + `jsdom`.
- Coverage via `vitest --coverage` with `@vitest/coverage-v8`.

---

## Phase 6: GitHub Actions

**Goal:** Automate weekly scan + GitHub Pages deploy.

### Workflow: `.github/workflows/scan-and-deploy.yml`

- Trigger: weekly cron (Monday 6am UTC) + `workflow_dispatch`.
- **Job 1 (`scan`)**: install scanner deps → run scanner → commit updated `skills.json` → push.
- **Job 2 (`deploy`)**: depends on `scan` → install UI deps → build → upload Pages artifact → deploy.

### Additional Workflow: `.github/workflows/ci.yml`

- Trigger: push + pull_request.
- Steps: install → test scanner → test UI → build UI.
- Generates and uploads coverage report as artifact.

---

## Phase 7: Documentation

### Files

- `docs/IMPLEMENTATION-PLAN.md` — this file.
- `docs/IMPLEMENTATION-EXEC.md` — post-implementation summary (written after code is done).
- `README.md` — user-facing documentation with usage examples, setup instructions, and "Try it now" link.
- `.gitignore` — standard Node/Vite exclusions.

---

## Implementation Order Summary

```
Phase 1  →  Scaffolding (package.json files)
Phase 2  →  Scanner modules
Phase 3  →  Sample data
Phase 4  →  UI components
Phase 5  →  Tests
Phase 6  →  GitHub Actions
Phase 7  →  Documentation
```

Each phase is independently reviewable. The scanner can be developed and tested before the UI exists. The UI can be developed using sample data before the scanner is run.
