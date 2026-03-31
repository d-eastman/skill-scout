import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Header from '../components/Header.jsx';
import StatsBar from '../components/StatsBar.jsx';
import FilterPanel from '../components/FilterPanel.jsx';
import SkillGrid from '../components/SkillGrid.jsx';

// ── Header ────────────────────────────────────────────────────────────
describe('Header', () => {
  it('renders the brand name', () => {
    render(<Header />);
    expect(screen.getByText('SkillScout')).toBeInTheDocument();
  });

  it('renders the tagline', () => {
    render(<Header />);
    expect(screen.getByText(/discover claude skills/i)).toBeInTheDocument();
  });
});

// ── StatsBar ──────────────────────────────────────────────────────────
describe('StatsBar', () => {
  const meta = {
    scanDate: '2026-03-31T06:00:00.000Z',
    totalSkills: 15,
    uniqueSkills: 13,
    totalRepos: 6,
    duplicateGroups: 2,
  };

  it('renders all stat values', () => {
    render(<StatsBar meta={meta} />);
    expect(screen.getByText('15')).toBeInTheDocument();
    expect(screen.getByText('13')).toBeInTheDocument();
    expect(screen.getByText('6')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('renders the formatted scan date', () => {
    render(<StatsBar meta={meta} />);
    expect(screen.getByText(/Mar 31, 2026/)).toBeInTheDocument();
  });
});

// ── FilterPanel ───────────────────────────────────────────────────────
describe('FilterPanel', () => {
  const defaultProps = {
    groupBy: 'none',
    sourceFilter: 'all',
    sortBy: 'name',
    onGroupBy: () => {},
    onSourceFilter: () => {},
    onSortBy: () => {},
  };

  it('renders all three selects', () => {
    render(<FilterPanel {...defaultProps} />);
    expect(screen.getByRole('combobox', { name: /group by/i })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: /filter by source/i })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: /sort by/i })).toBeInTheDocument();
  });

  it('reflects current groupBy value', () => {
    render(<FilterPanel {...defaultProps} groupBy="owner" />);
    expect(screen.getByRole('combobox', { name: /group by/i })).toHaveValue('owner');
  });

  it('reflects current sourceFilter value', () => {
    render(<FilterPanel {...defaultProps} sourceFilter="curated" />);
    expect(screen.getByRole('combobox', { name: /filter by source/i })).toHaveValue('curated');
  });
});

// ── SkillGrid ─────────────────────────────────────────────────────────
const makeSkill = (overrides = {}) => ({
  id: 'a/b/SKILL.md',
  name: 'test-skill',
  description: 'A test skill',
  repo: 'a/b',
  repoOwner: 'a',
  repoUrl: 'https://github.com/a/b',
  repoStars: 10,
  source: 'curated',
  contentHash: 'abc1234567890abc1234567890abc1234567890abc1234567890abc1234567890',
  lastCommitDate: '2026-01-01T00:00:00Z',
  scanDate: '2026-03-31T00:00:00Z',
  installCommand: 'npx skills add a/b --skill test-skill',
  duplicateCount: 1,
  duplicateIds: [],
  ...overrides,
});

describe('SkillGrid', () => {
  it('shows empty state when no skills', () => {
    render(<SkillGrid groups={[{ groupKey: null, groupLabel: null, skills: [] }]} />);
    expect(screen.getByText(/no skills found/i)).toBeInTheDocument();
  });

  it('renders skill cards', () => {
    const groups = [{ groupKey: null, groupLabel: null, skills: [makeSkill()] }];
    render(<SkillGrid groups={groups} />);
    expect(screen.getByText('test-skill')).toBeInTheDocument();
  });

  it('renders group headers when grouped', () => {
    const groups = [
      { groupKey: 'anthropics', groupLabel: 'anthropics', skills: [makeSkill({ id: '1', name: 'pdf' })] },
      { groupKey: 'devtools', groupLabel: 'devtools', skills: [makeSkill({ id: '2', name: 'terraform' })] },
    ];
    render(<SkillGrid groups={groups} />);
    expect(screen.getByText('anthropics')).toBeInTheDocument();
    expect(screen.getByText('devtools')).toBeInTheDocument();
  });

  it('does not render group headers when ungrouped', () => {
    const groups = [{ groupKey: null, groupLabel: null, skills: [makeSkill()] }];
    render(<SkillGrid groups={groups} />);
    // No heading elements other than what cards might have
    expect(screen.queryByRole('heading', { name: /anthropics/i })).toBeNull();
  });
});
