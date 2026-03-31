# SkillScout

**Discover Claude skills across GitHub.**

SkillScout is a tool that scans GitHub for Claude [SKILL.md](https://docs.anthropic.com/en/docs/claude-code/skills) files, indexes them into a structured JSON feed, and serves them through a fast, searchable, filterable web UI.

> **Try it now:** [https://davideastman.github.io/skill-scout/](https://davideastman.github.io/skill-scout/)

---

## What it does

1. **Scanner** — A Node.js script that searches GitHub for `SKILL.md` files, parses them, deduplicates identical content by SHA-256 hash, and writes a `skills.json` index.
2. **UI** — A Vite + React SPA that loads the JSON index and lets you search, filter, sort, and group skills.
3. **CI/CD** — GitHub Actions runs the scanner weekly and deploys the UI to GitHub Pages.

---

## Project structure

```
skill-scout/
├── scanner/          # Node.js scanner (ESM, octokit, gray-matter)
│   ├── index.js      # Orchestrator: search → fetch → parse → write
│   ├── config.js     # Curated repos, rate limits, search queries
│   ├── github.js     # GitHub API client
│   └── parser.js     # SKILL.md parser + content hasher
├── ui/               # Vite + React SPA
│   ├── public/data/
│   │   └── skills.json   # Scanner output (seeded with sample data)
│   └── src/
│       ├── App.jsx
│       ├── components/   # Header, StatsBar, SearchBar, FilterPanel, SkillGrid, SkillCard, DuplicateBadge
│       ├── hooks/        # useSkillData
│       └── utils/        # filtering, sorting, grouping, relative dates
└── .github/workflows/
    ├── ci.yml            # Test + coverage on push/PR
    └── scan-and-deploy.yml  # Weekly scan + GitHub Pages deploy
```

---

## Getting started

### Prerequisites

- Node.js 20+
- npm 10+
- A GitHub personal access token (for running the scanner)

### Install dependencies

```bash
npm install
```

### Start the UI (development)

The repo includes seed data so you can develop the UI without running the scanner.

```bash
npm run dev
```

Then open [http://localhost:5173/skill-scout/](http://localhost:5173/skill-scout/).

### Run the scanner

The scanner requires a `GITHUB_TOKEN` with `public_repo` read access.

```bash
GITHUB_TOKEN=ghp_your_token_here npm run scan
```

This writes an updated `ui/public/data/skills.json`. Re-run `npm run dev` (or rebuild) to see the new data.

### Build for production

```bash
npm run build
# Output is in ui/dist/
```

---

## Running tests

```bash
# All tests (scanner + UI)
npm test

# With coverage reports
npm run coverage
```

Coverage reports are written to:
- `scanner/coverage/` — scanner modules
- `ui/coverage/` — UI components and utilities

---

## Usage examples

### Find a skill to install

1. Open the UI and type a keyword in the search box (e.g. `pdf`, `docker`, `sql`).
2. Click **Copy** next to any skill's install command.
3. Run the copied command in your terminal:

   ```bash
   npx skills add anthropics/claude-code --skill pdf
   ```

### Filter by source

Use the **Source** dropdown to show only `Curated` skills (hand-picked repos) or `Discovered` skills (found via GitHub code search).

### Find duplicate skills

Use **Group → Duplicates** to group skills that have identical content across different repositories. Click the teal badge (e.g., "2 copies") on any card to see which repos host the same skill.

### Sort by popularity

Use the **Sort** dropdown → **Stars** to surface the most-starred repositories first.

---

## Adding repos to the curated list

Edit `scanner/config.js` and add an entry to `CURATED_REPOS`:

```js
export const CURATED_REPOS = [
  'anthropics/claude-code',
  'anthropics/skills',
  'your-org/your-repo',  // ← add here
];
```

Curated repos are scanned more thoroughly (directory walking up to 3 levels deep) than search results.

---

## GitHub Pages setup

1. Fork or clone this repository.
2. In your repo settings → **Pages**, set the source to **GitHub Actions**.
3. Push to `main` — the `scan-and-deploy` workflow will run automatically on the next Monday at 6am UTC, or you can trigger it manually via **Actions → Scan and Deploy → Run workflow**.
4. Update the "Try it now" link in this README to point to your Pages URL.

No secrets are required for public repo scanning — the default `GITHUB_TOKEN` available in Actions has sufficient access. For higher rate limits, create a fine-grained PAT with `contents: read` + `metadata: read` and save it as a repo secret named `GITHUB_TOKEN`.

---

## Design

- **Dark theme** with charcoal background (`#0d1117`), warm amber accent (`#e3a008`), and teal for duplicate indicators.
- **Typography**: DM Sans (body), JetBrains Mono (code), Instrument Serif (brand mark).
- **Accessible**: WCAG AA contrast, keyboard navigation, `aria-*` labels, skip-to-content link, `prefers-reduced-motion` support.
- **Fully static**: No server-side rendering, no runtime API calls. The JSON is baked in at build time.
