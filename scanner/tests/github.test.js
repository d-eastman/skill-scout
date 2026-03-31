import { describe, it, expect, vi, beforeEach } from 'vitest';
import { searchForSkillFiles, scanCuratedRepo, fetchFileContent, getLastCommitDate, getRepoMeta } from '../github.js';

// Minimal Octokit mock factory
function makeOctokit(overrides = {}) {
  return {
    rest: {
      search: {
        code: vi.fn().mockResolvedValue({ data: { items: [] } }),
        ...overrides.search,
      },
      repos: {
        getContent: vi.fn().mockResolvedValue({ data: [] }),
        listCommits: vi.fn().mockResolvedValue({ data: [] }),
        get: vi.fn().mockResolvedValue({
          data: { default_branch: 'main', description: 'desc', stargazers_count: 42, html_url: 'https://github.com/a/b' },
        }),
        ...overrides.repos,
      },
    },
  };
}

vi.mock('../config.js', () => ({
  CURATED_REPOS: ['a/b'],
  SKILL_SEARCH_PATHS: ['skills', ''],
  SEARCH_QUERIES: ['filename:SKILL.md'],
  RATE_LIMIT: { requestDelayMs: 0, searchDelayMs: 0, maxSearchPages: 2, resultsPerPage: 2 },
}));

describe('searchForSkillFiles', () => {
  it('returns empty array when search yields no results', async () => {
    const octokit = makeOctokit();
    const results = await searchForSkillFiles(octokit);
    expect(results).toEqual([]);
  });

  it('deduplicates results with the same owner/repo/path', async () => {
    const item = {
      repository: { full_name: 'owner/repo' },
      path: 'skills/SKILL.md',
      html_url: 'https://github.com/owner/repo/blob/main/skills/SKILL.md',
    };
    const octokit = makeOctokit({
      search: {
        code: vi.fn().mockResolvedValue({ data: { items: [item, item] } }),
      },
    });
    const results = await searchForSkillFiles(octokit);
    expect(results).toHaveLength(1);
  });

  it('stops paginating when fewer items than resultsPerPage are returned', async () => {
    const item = {
      repository: { full_name: 'owner/repo' },
      path: 'skills/SKILL.md',
      html_url: 'https://github.com/owner/repo/blob/main/skills/SKILL.md',
    };
    const searchCode = vi.fn().mockResolvedValue({ data: { items: [item] } }); // 1 < resultsPerPage=2
    const octokit = makeOctokit({ search: { code: searchCode } });
    await searchForSkillFiles(octokit);
    expect(searchCode).toHaveBeenCalledTimes(1);
  });

  it('handles 403 rate-limit errors gracefully', async () => {
    const err = new Error('rate limit');
    err.status = 403;
    const octokit = makeOctokit({
      search: { code: vi.fn().mockRejectedValue(err) },
    });
    await expect(searchForSkillFiles(octokit)).resolves.toEqual([]);
  });
});

describe('scanCuratedRepo', () => {
  it('returns an empty array when getContent returns non-array data', async () => {
    const octokit = makeOctokit({
      repos: {
        getContent: vi.fn().mockResolvedValue({ data: { type: 'file', name: 'README.md' } }),
      },
    });
    const results = await scanCuratedRepo(octokit, 'a/b');
    expect(results).toEqual([]);
  });

  it('discovers SKILL.md at the top level', async () => {
    const octokit = makeOctokit({
      repos: {
        getContent: vi.fn().mockResolvedValue({
          data: [{ type: 'file', name: 'SKILL.md', path: 'SKILL.md', html_url: 'https://github.com/a/b/blob/main/SKILL.md' }],
        }),
      },
    });
    const results = await scanCuratedRepo(octokit, 'a/b');
    expect(results.some((r) => r.path === 'SKILL.md')).toBe(true);
  });

  it('recurses into subdirectories to find nested SKILL.md', async () => {
    // First call returns a directory listing with a 'skills/' dir
    // Second call (recursing into 'skills/') returns a SKILL.md file
    const getContent = vi.fn()
      .mockResolvedValueOnce({
        data: [{ type: 'dir', name: 'skills', path: 'skills', html_url: '' }],
      })
      .mockResolvedValue({
        data: [{ type: 'file', name: 'SKILL.md', path: 'skills/SKILL.md', html_url: 'https://github.com/a/b/blob/main/skills/SKILL.md' }],
      });
    const octokit = makeOctokit({ repos: { getContent } });
    const results = await scanCuratedRepo(octokit, 'a/b');
    expect(results.some((r) => r.path === 'skills/SKILL.md')).toBe(true);
  });

  it('discovers SKILL.md when getContent returns a single file object', async () => {
    const octokit = makeOctokit({
      repos: {
        getContent: vi.fn().mockResolvedValue({
          data: { type: 'file', name: 'SKILL.md', path: 'SKILL.md', html_url: 'https://github.com/a/b/blob/main/SKILL.md' },
        }),
      },
    });
    const results = await scanCuratedRepo(octokit, 'a/b');
    expect(results.some((r) => r.path === 'SKILL.md')).toBe(true);
  });

  it('silently skips paths that return API errors during walk', async () => {
    const err = new Error('not found');
    err.status = 404;
    const octokit = makeOctokit({
      repos: { getContent: vi.fn().mockRejectedValue(err) },
    });
    const results = await scanCuratedRepo(octokit, 'a/b');
    expect(results).toEqual([]);
  });
});

describe('fetchFileContent', () => {
  it('returns raw string content', async () => {
    const octokit = makeOctokit({
      repos: {
        getContent: vi.fn().mockResolvedValue({ data: '# Skill\n\nContent here.' }),
      },
    });
    const content = await fetchFileContent(octokit, 'a', 'b', 'SKILL.md');
    expect(content).toBe('# Skill\n\nContent here.');
  });

  it('decodes base64-encoded content', async () => {
    const encoded = Buffer.from('hello').toString('base64');
    const octokit = makeOctokit({
      repos: {
        getContent: vi.fn().mockResolvedValue({ data: { content: encoded } }),
      },
    });
    const content = await fetchFileContent(octokit, 'a', 'b', 'SKILL.md');
    expect(content).toBe('hello');
  });
});

describe('getLastCommitDate', () => {
  it('returns null when no commits found', async () => {
    const octokit = makeOctokit();
    const date = await getLastCommitDate(octokit, 'a', 'b', 'SKILL.md');
    expect(date).toBeNull();
  });

  it('returns the date of the most recent commit', async () => {
    const octokit = makeOctokit({
      repos: {
        listCommits: vi.fn().mockResolvedValue({
          data: [{ commit: { committer: { date: '2026-01-15T10:00:00Z' } } }],
        }),
      },
    });
    const date = await getLastCommitDate(octokit, 'a', 'b', 'SKILL.md');
    expect(date).toBe('2026-01-15T10:00:00Z');
  });

  it('returns null on API error', async () => {
    const octokit = makeOctokit({
      repos: {
        listCommits: vi.fn().mockRejectedValue(new Error('not found')),
      },
    });
    const date = await getLastCommitDate(octokit, 'a', 'b', 'SKILL.md');
    expect(date).toBeNull();
  });
});

describe('getRepoMeta', () => {
  it('returns repo metadata', async () => {
    const octokit = makeOctokit();
    const meta = await getRepoMeta(octokit, 'a', 'b');
    expect(meta).toMatchObject({ stars: 42, url: 'https://github.com/a/b' });
  });

  it('returns safe defaults on API error', async () => {
    const octokit = makeOctokit({
      repos: {
        get: vi.fn().mockRejectedValue(new Error('not found')),
      },
    });
    const meta = await getRepoMeta(octokit, 'a', 'b');
    expect(meta.stars).toBe(0);
    expect(meta.url).toBe('https://github.com/a/b');
  });
});
