# CLAUDE.md — SkillScout

## Project Overview

SkillScout is a tool for discovering, indexing, and browsing Claude SKILL.md files across GitHub. It has three components:

1. **Scanner** — A Node.js script that searches GitHub for SKILL.md files, parses them, and outputs a structured JSON index
2. **UI** — A React SPA that consumes the JSON index and provides search, filter, and grouping over the discovered skills
3. **GitHub Actions** — Workflows to run the scanner on a schedule and deploy the UI to GitHub Pages

All code is JavaScript (ESM). The project is a monorepo with npm workspaces.

---

## Directory Structure

```
skill-scout/
├── package.json              # Workspace root (workspaces: ["scanner", "ui"])
├── CLAUDE.md
├── README.md
├── scanner/
│   ├── package.json          # type: "module", deps: octokit, gray-matter
│   ├── index.js              # Main entry point, orchestrates scan phases
│   ├── config.js             # Curated repos list, rate limits, search queries
│   ├── github.js             # GitHub API client (search, fetch, commit metadata)
│   └── parser.js             # SKILL.md content parser + hasher
├── ui/
│   ├── package.json          # Vite + React
│   ├── vite.config.js
│   ├── index.html
│   ├── public/
│   │   └── data/
│   │       └── skills.json   # Scanner output (seed with sample data for dev)
│   └── src/
│       ├── main.jsx
│       ├── App.jsx
│       ├── styles.css         # Global styles, CSS variables, fonts
│       ├── components/
│       │   ├── Header.jsx
│       │   ├── StatsBar.jsx
│       │   ├── SearchBar.jsx
│       │   ├── FilterPanel.jsx
│       │   ├── SkillGrid.jsx
│       │   ├── SkillCard.jsx
│       │   └── DuplicateBadge.jsx
│       └── hooks/
│           └── useSkillData.js
└── .github/
    └── workflows/
        └── scan-and-deploy.yml
```

---

## Prong 1: Scanner

### Entry Point: `scanner/index.js`

Orchestrates a multi-phase scan:

1. **Curated repos** — Walk known repos from `config.js` looking for SKILL.md files in common paths (`skills/`, `src/skills/`, `.skills/`, root)
2. **GitHub code search** — Use the GitHub Search API (`GET /search/code?q=filename:SKILL.md`) to discover SKILL.md files in any public repo. Paginate through results.
3. **Fetch & parse** — For each discovered SKILL.md, fetch raw content, parse it, compute a content hash, and fetch the last commit date for that file.
4. **Deduplicate** — Group skills by content hash to identify identical SKILL.md files across different repos.
5. **Write output** — Write the final JSON to `ui/public/data/skills.json`.

### Config: `scanner/config.js`

Exports:
- `CURATED_REPOS` — Array of `"owner/repo"` strings. Seed with:
  - `"anthropics/claude-code"`
  - `"anthropics/skills"`
  - `"stedolan/skill-sample"` (placeholder — replace with real repos as discovered)
- `SKILL_SEARCH_PATHS` — Directories to walk inside curated repos: `["skills", "src/skills", ".skills", ""]`
- `SEARCH_QUERIES` — GitHub code search queries: `["filename:SKILL.md", "filename:SKILL.md path:skills"]`
- `RATE_LIMIT` — `{ requestDelayMs: 2000, searchDelayMs: 6000, maxSearchPages: 10, resultsPerPage: 100 }`

### GitHub Client: `scanner/github.js`

Uses `octokit` (authenticated via `process.env.GITHUB_TOKEN`).

Functions:
- `searchForSkillFiles()` — Iterates `SEARCH_QUERIES`, paginates `octokit.rest.search.code`, dedupes by `owner/repo/path`, returns array of `{ owner, repo, path, htmlUrl }`. Handles 403/422 rate limit errors with exponential backoff.
- `scanCuratedRepo(ownerRepo)` — For a given `"owner/repo"`, walks each path in `SKILL_SEARCH_PATHS` using `octokit.rest.repos.getContent`, recursing up to 3 levels deep. Returns array of `{ owner, repo, path, htmlUrl }`.
- `fetchFileContent(owner, repo, path)` — Fetches raw file content via `octokit.rest.repos.getContent` with `mediaType: { format: "raw" }`.
- `getLastCommitDate(owner, repo, path)` — Fetches `octokit.rest.repos.listCommits` with `path` and `per_page: 1`, returns the ISO date string of the most recent commit touching that file, or null.
- `getRepoMeta(owner, repo)` — Fetches repo info, returns `{ defaultBranch, description, stars, url }`.

All functions include `sleep()` calls between API requests per `RATE_LIMIT` config.

### Parser: `scanner/parser.js`

Functions:
- `parseSkillMd(rawContent)` — Extracts `{ name, description }` from a SKILL.md file. Tries three strategies in order:
  1. **YAML frontmatter** — Uses `gray-matter` to parse `---` delimited frontmatter. Looks for `name` and `description` fields.
  2. **Markdown headers** — Treats `# H1` as the skill name. Looks for a `## Description` section or takes the first paragraph after the H1.
  3. **Key-value patterns** — Regex for `Name: ...` and `Description: ...` lines.
  Falls back to extracting the first non-empty, non-header paragraph as description.
- `hashContent(rawContent)` — Normalizes whitespace (`\r\n` → `\n`, collapse runs of whitespace), then returns a SHA-256 hex digest. This is the fingerprint for deduplication.
- `deriveInstallCommand(owner, repo, skillName)` — Returns `npx skills add <owner>/<repo> --skill <skillName>`.

### Output Schema: `skills.json`

```json
{
  "meta": {
    "scanDate": "ISO string",
    "totalSkills": 14,
    "uniqueSkills": 12,
    "totalRepos": 6,
    "duplicateGroups": 2
  },
  "skills": [
    {
      "id": "owner/repo/path/to/SKILL.md",
      "name": "skill-name",
      "description": "Skill description text",
      "repo": "owner/repo",
      "repoOwner": "owner",
      "repoUrl": "https://github.com/owner/repo",
      "repoStars": 342,
      "skillPath": "skills/skill-name/SKILL.md",
      "installCommand": "npx skills add owner/repo --skill skill-name",
      "contentHash": "sha256 hex string",
      "lastCommitDate": "ISO string or null",
      "scanDate": "ISO string",
      "source": "curated | search",
      "duplicateCount": 1,
      "duplicateIds": []
    }
  ]
}
```

The `skills` array is sorted alphabetically by name.

### Sample Data

For UI development, generate a realistic `ui/public/data/skills.json` seed file with 12-15 skills across 5-6 repos, including at least 2 duplicate groups (same `contentHash`, different repos). Include a mix of sources ("curated" and "search") and varied star counts, commit dates, and description lengths. Use plausible skill names like: docx, pdf, xlsx, pptx, frontend-design, file-reading, sql-query, docker-compose, terraform, k8s-manifests, api-testing, svg-generation, data-viz, git-hooks.

---

## Prong 2: UI

### Stack

- Vite + React (plain JSX, no TypeScript)
- No component library — hand-rolled components with CSS
- Data loaded from `public/data/skills.json` via fetch at startup

### Design Direction

Dark mode, clean but compact, modern, accessible (WCAG AA), and visually polished. NOT generic AI slop.

**Color palette:**
- Background: deep charcoal/near-black (`#0d1117` or similar — GitHub dark tone)
- Surface: slightly lighter (`#161b22`)
- Card surface: `#1c2128`
- Border: subtle (`#30363d`)
- Primary accent: a warm amber/gold (`#e3a008` or similar) — used sparingly for highlights, active states, and the SkillScout brand mark
- Text: off-white (`#e6edf3`) for primary, muted (`#8b949e`) for secondary
- Success/duplicate indicators: teal (`#2dd4bf`)
- Source badges: blue for curated (`#58a6ff`), gray for discovered

**Typography:**
- Load from Google Fonts: "JetBrains Mono" for code/install commands, "DM Sans" for body text, "Instrument Serif" for the logo/header brand mark
- Font sizes: compact, body at 14px, generous line height

**Layout:**
- Full-width, max-width ~1400px centered
- Header with logo, last scan date, and stats bar
- Below header: search bar (full width) with filter controls on the same row
- Below that: skill cards in a responsive CSS grid (auto-fill, min 320px)
- Cards should be compact — not tall hero cards, more like dense data cards

**Accessibility:**
- All interactive elements keyboard-navigable
- Focus-visible outlines using the accent color
- Sufficient color contrast ratios (4.5:1 minimum for text)
- `aria-label` on icon-only buttons
- Skip-to-content link
- Screen-reader-only text where visual context is unclear
- Reduced motion: respect `prefers-reduced-motion`

### Components

#### `Header.jsx`
- Brand mark: "SkillScout" in Instrument Serif with a small radar/scope icon (SVG inline or emoji)
- Subtext: "Discover Claude skills across GitHub"

#### `StatsBar.jsx`
- Horizontal row of stat pills: total skills, unique (by hash), repos scanned, duplicate groups, last scan date
- Compact, muted styling, use tabular-nums for numbers

#### `SearchBar.jsx`
- Full-width text input with search icon
- Searches across: name, description, repo, repoOwner
- Debounced (300ms) — updates a search state in App
- Clear button when non-empty
- Placeholder: "Search skills by name, description, repo..."

#### `FilterPanel.jsx`
- Inline with the search bar row, right-aligned
- Dropdown or toggle group for **Group By**: None / Owner / Content Hash (Duplicates)
- Dropdown for **Source**: All / Curated / Discovered
- Optional: sort control (Name / Stars / Last Commit / Recently Scanned)

#### `SkillGrid.jsx`
- Receives filtered + grouped skill list
- When grouped, renders group headers (e.g., owner name, or "Duplicate Group: <short hash>") followed by cards
- Responsive CSS Grid: `grid-template-columns: repeat(auto-fill, minmax(320px, 1fr))`
- Shows a "No results" state with helpful message when filters return empty
- Shows total result count

#### `SkillCard.jsx`
- Compact card showing:
  - **Skill name** — prominent, in a monospace/code font
  - **Description** — 2-3 lines, truncated with `...`, expandable on click
  - **Repo** — link to GitHub, with star count badge
  - **Install command** — monospace, with a click-to-copy button. Show `npx skills add <repo> --skill <name>`
  - **Metadata row**: last commit date (relative, e.g., "15 days ago"), source badge (curated vs discovered)
  - **Duplicate badge** — if `duplicateCount > 1`, show a teal badge like "2 copies" that is clickable/expandable to show the duplicate repo list
- Card has subtle border, hover state with slight lift/glow using the accent color
- Content hash displayed as a short fingerprint (first 8 chars) in muted monospace, with a tooltip showing the full hash

#### `DuplicateBadge.jsx`
- Small pill/badge component
- Shows count of duplicates
- On click, expands to show list of duplicate repo paths
- Teal accent color

### Hooks

#### `useSkillData.js`
- Fetches `/data/skills.json` on mount
- Returns `{ skills, meta, loading, error }`
- Stores raw data; filtering/searching happens in App.jsx or a derived memo

### App.jsx State & Logic

- State: `searchQuery`, `groupBy` (none/owner/hash), `sourceFilter` (all/curated/search), `sortBy` (name/stars/lastCommit)
- Derived/memoized:
  1. Filter by search query (case-insensitive match across name, description, repo, repoOwner)
  2. Filter by source
  3. Sort
  4. Group if groupBy is set — produce `{ groupKey, groupLabel, skills }` arrays
- Pass filtered results to SkillGrid

### Vite Config

- `base: "/skill-scout/"` (for GitHub Pages deployment under a repo subpath)
- No special plugins needed beyond `@vitejs/plugin-react`

---

## Prong 3: GitHub Actions

### Workflow: `.github/workflows/scan-and-deploy.yml`

Single workflow with two jobs.

```yaml
name: Scan and Deploy

on:
  schedule:
    - cron: '0 6 * * 1'  # Weekly, Mondays at 6am UTC
  workflow_dispatch: {}   # Manual trigger

permissions:
  contents: write
  pages: write
  id-token: write

jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci --workspace=scanner
      - run: node scanner/index.js
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
      - name: Commit updated skills.json
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          git add ui/public/data/skills.json
          git diff --cached --quiet || git commit -m "chore: update skills.json [skip ci]"
          git push

  deploy:
    needs: scan
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - uses: actions/checkout@v4
        with:
          ref: main  # Get the commit from the scan job
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci --workspace=ui
      - run: npm run build --workspace=ui
      - uses: actions/configure-pages@v4
      - uses: actions/upload-pages-artifact@v3
        with:
          path: ui/dist
      - id: deployment
        uses: actions/deploy-pages@v4
```

### Repository Setup Notes (for README)

1. Enable GitHub Pages in repo settings → set source to "GitHub Actions"
2. The `GITHUB_TOKEN` secret is automatically available in Actions — no extra config needed for public repo scanning
3. For higher rate limits or access to private repos, create a fine-grained PAT with `contents: read` and `metadata: read` scopes, save it as a repo secret named `GITHUB_TOKEN`, and reference it in the workflow
4. To trigger a manual scan, go to Actions → "Scan and Deploy" → "Run workflow"

---

## Development Workflow

```bash
# Install all workspace dependencies
npm install

# Seed the sample data (already present in ui/public/data/skills.json)
# Start the UI dev server
npm run dev

# Run the scanner locally (requires GITHUB_TOKEN env var)
GITHUB_TOKEN=ghp_xxx npm run scan

# Build the UI for production
npm run build
```

---

## Key Implementation Notes

- **Rate limiting is critical.** GitHub code search API allows 10 requests/minute even with auth. The scanner must sleep between requests and handle 403/422 gracefully with backoff. Log progress to stdout so the Actions run is observable.
- **The parser must be defensive.** SKILL.md files in the wild will have varied formats. The three-strategy cascade (YAML frontmatter → markdown headers → key-value patterns) should cover most cases. If nothing parses, fall back to first paragraph as description and parent directory name as skill name. Never crash on a malformed file.
- **Content hash normalization.** Before hashing, normalize `\r\n` to `\n` and collapse whitespace runs. This ensures that trivial formatting differences (trailing spaces, Windows line endings) don't produce different hashes for otherwise identical content.
- **The UI is fully static.** No runtime API calls from the browser. The JSON is baked in at build time via the `public/data/` path. Vite serves it as a static asset.
- **GitHub Pages base path.** Vite's `base` config must be set to `"/skill-scout/"` (or whatever the repo name is) so asset paths resolve correctly on Pages. This also affects the fetch URL for skills.json — use a relative path (`./data/skills.json` or `${import.meta.env.BASE_URL}data/skills.json`).
- **Click-to-copy** for install commands should use `navigator.clipboard.writeText()` with a brief "Copied!" confirmation state.
- **Relative dates** (e.g., "15 days ago") can be computed with `Intl.RelativeTimeFormat` or a simple helper — no need for a library like date-fns.
