import { describe, it, expect } from 'vitest';
import { filterSkills, sortSkills, groupSkills, relativeDate } from '../utils/filtering.js';

const makeSkill = (overrides = {}) => ({
  id: 'a/b/SKILL.md',
  name: 'test-skill',
  description: 'A test skill',
  repo: 'a/b',
  repoOwner: 'a',
  repoUrl: 'https://github.com/a/b',
  repoStars: 100,
  source: 'curated',
  contentHash: 'abc123',
  lastCommitDate: '2026-01-01T00:00:00Z',
  scanDate: '2026-03-31T00:00:00Z',
  duplicateCount: 1,
  duplicateIds: [],
  ...overrides,
});

describe('filterSkills', () => {
  const skills = [
    makeSkill({ id: '1', name: 'pdf', description: 'PDF generator', repo: 'anthropics/claude-code', repoOwner: 'anthropics', source: 'curated' }),
    makeSkill({ id: '2', name: 'docx', description: 'Word documents', repo: 'devtools/hub', repoOwner: 'devtools', source: 'search' }),
    makeSkill({ id: '3', name: 'sql-query', description: 'SQL helper', repo: 'datacraft/skills', repoOwner: 'datacraft', source: 'search' }),
  ];

  it('returns all skills with empty query and "all" source filter', () => {
    expect(filterSkills(skills, { searchQuery: '', sourceFilter: 'all' })).toHaveLength(3);
  });

  it('filters by name (case-insensitive)', () => {
    const result = filterSkills(skills, { searchQuery: 'PDF', sourceFilter: 'all' });
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('pdf');
  });

  it('filters by description', () => {
    const result = filterSkills(skills, { searchQuery: 'Word', sourceFilter: 'all' });
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('docx');
  });

  it('filters by repo', () => {
    const result = filterSkills(skills, { searchQuery: 'datacraft', sourceFilter: 'all' });
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('sql-query');
  });

  it('filters by source', () => {
    const result = filterSkills(skills, { searchQuery: '', sourceFilter: 'curated' });
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('pdf');
  });

  it('applies search and source filter together', () => {
    const result = filterSkills(skills, { searchQuery: 'doc', sourceFilter: 'search' });
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('docx');
  });

  it('returns empty array when nothing matches', () => {
    expect(filterSkills(skills, { searchQuery: 'zzz', sourceFilter: 'all' })).toHaveLength(0);
  });
});

describe('sortSkills', () => {
  const skills = [
    makeSkill({ id: '1', name: 'z-skill', repoStars: 10, lastCommitDate: '2026-01-01T00:00:00Z', scanDate: '2026-03-01T00:00:00Z' }),
    makeSkill({ id: '2', name: 'a-skill', repoStars: 500, lastCommitDate: '2026-03-01T00:00:00Z', scanDate: '2026-03-31T00:00:00Z' }),
    makeSkill({ id: '3', name: 'm-skill', repoStars: 100, lastCommitDate: '2026-02-01T00:00:00Z', scanDate: '2026-02-01T00:00:00Z' }),
  ];

  it('sorts by name ascending', () => {
    const sorted = sortSkills(skills, 'name');
    expect(sorted.map((s) => s.name)).toEqual(['a-skill', 'm-skill', 'z-skill']);
  });

  it('sorts by stars descending', () => {
    const sorted = sortSkills(skills, 'stars');
    expect(sorted.map((s) => s.repoStars)).toEqual([500, 100, 10]);
  });

  it('sorts by lastCommit descending', () => {
    const sorted = sortSkills(skills, 'lastCommit');
    expect(sorted[0].name).toBe('a-skill');
  });

  it('sorts by scanDate descending', () => {
    const sorted = sortSkills(skills, 'scanDate');
    expect(sorted[0].name).toBe('a-skill');
  });

  it('does not mutate the original array', () => {
    const original = [...skills];
    sortSkills(skills, 'stars');
    expect(skills.map((s) => s.id)).toEqual(original.map((s) => s.id));
  });
});

describe('groupSkills', () => {
  const skills = [
    makeSkill({ id: '1', name: 'pdf', repoOwner: 'anthropics', contentHash: 'hash-a' }),
    makeSkill({ id: '2', name: 'docx', repoOwner: 'anthropics', contentHash: 'hash-b' }),
    makeSkill({ id: '3', name: 'terraform', repoOwner: 'devtools', contentHash: 'hash-c' }),
  ];

  it('returns single group with null key when groupBy is "none"', () => {
    const groups = groupSkills(skills, 'none');
    expect(groups).toHaveLength(1);
    expect(groups[0].groupKey).toBeNull();
    expect(groups[0].skills).toHaveLength(3);
  });

  it('groups by owner', () => {
    const groups = groupSkills(skills, 'owner');
    expect(groups).toHaveLength(2);
    const anthropicsGroup = groups.find((g) => g.groupKey === 'anthropics');
    expect(anthropicsGroup.skills).toHaveLength(2);
  });

  it('groups by hash', () => {
    const groups = groupSkills(skills, 'hash');
    // Each skill has a unique hash, so 3 groups
    expect(groups).toHaveLength(3);
  });

  it('group labels include owner name for owner grouping', () => {
    const groups = groupSkills(skills, 'owner');
    expect(groups.every((g) => g.groupLabel.length > 0)).toBe(true);
  });
});

describe('relativeDate', () => {
  it('returns "unknown" for null', () => {
    expect(relativeDate(null)).toBe('unknown');
  });

  it('returns "today" for a very recent date', () => {
    const now = new Date().toISOString();
    expect(relativeDate(now)).toBe('today');
  });

  it('returns a relative string for a past date', () => {
    const oldDate = new Date(Date.now() - 10 * 86_400_000).toISOString();
    const result = relativeDate(oldDate);
    // Intl.RelativeTimeFormat with numeric:'auto' may produce "last week" or "10 days ago"
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
    expect(result).not.toBe('unknown');
    expect(result).not.toBe('today');
  });
});
