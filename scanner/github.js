import { Octokit } from 'octokit';
import { CURATED_REPOS, SKILL_SEARCH_PATHS, SEARCH_QUERIES, RATE_LIMIT } from './config.js';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export function createClient(token) {
  return new Octokit({ auth: token });
}

async function withBackoff(fn, retries = 3) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const isRateLimit = err.status === 403 || err.status === 422 || err.status === 429;
      if (!isRateLimit || attempt === retries) throw err;
      const delay = RATE_LIMIT.searchDelayMs * 2 ** attempt;
      console.warn(`Rate limit hit (${err.status}), retrying in ${delay}ms...`);
      await sleep(delay);
    }
  }
}

export async function searchForSkillFiles(octokit) {
  const seen = new Set();
  const results = [];

  for (const query of SEARCH_QUERIES) {
    for (let page = 1; page <= RATE_LIMIT.maxSearchPages; page++) {
      let data;
      try {
        ({ data } = await withBackoff(() =>
          octokit.rest.search.code({
            q: query,
            per_page: RATE_LIMIT.resultsPerPage,
            page,
          })
        ));
      } catch (err) {
        console.error(`Search failed for query "${query}" page ${page}:`, err.message);
        break;
      }

      for (const item of data.items) {
        const key = `${item.repository.full_name}/${item.path}`;
        if (!seen.has(key)) {
          seen.add(key);
          const [owner, repo] = item.repository.full_name.split('/');
          results.push({ owner, repo, path: item.path, htmlUrl: item.html_url });
        }
      }

      await sleep(RATE_LIMIT.searchDelayMs);
      if (data.items.length < RATE_LIMIT.resultsPerPage) break;
    }
  }

  return results;
}

export async function scanCuratedRepo(octokit, ownerRepo) {
  const [owner, repo] = ownerRepo.split('/');
  const found = [];

  for (const basePath of SKILL_SEARCH_PATHS) {
    await walkPath(octokit, owner, repo, basePath, found, 0);
    await sleep(RATE_LIMIT.requestDelayMs);
  }

  return found;
}

async function walkPath(octokit, owner, repo, path, found, depth) {
  if (depth > 3) return;

  let data;
  try {
    ({ data } = await octokit.rest.repos.getContent({ owner, repo, path }));
  } catch {
    return;
  }

  if (Array.isArray(data)) {
    for (const item of data) {
      if (item.type === 'file' && item.name === 'SKILL.md') {
        found.push({
          owner,
          repo,
          path: item.path,
          htmlUrl: item.html_url,
        });
      } else if (item.type === 'dir' && depth < 3) {
        await walkPath(octokit, owner, repo, item.path, found, depth + 1);
        await sleep(RATE_LIMIT.requestDelayMs);
      }
    }
  } else if (data.type === 'file' && data.name === 'SKILL.md') {
    found.push({ owner, repo, path: data.path, htmlUrl: data.html_url });
  }
}

export async function fetchFileContent(octokit, owner, repo, path) {
  const { data } = await octokit.rest.repos.getContent({
    owner,
    repo,
    path,
    mediaType: { format: 'raw' },
  });
  await sleep(RATE_LIMIT.requestDelayMs);
  return typeof data === 'string' ? data : Buffer.from(data.content, 'base64').toString('utf8');
}

export async function getLastCommitDate(octokit, owner, repo, path) {
  try {
    const { data } = await octokit.rest.repos.listCommits({
      owner,
      repo,
      path,
      per_page: 1,
    });
    await sleep(RATE_LIMIT.requestDelayMs);
    return data[0]?.commit?.committer?.date ?? null;
  } catch {
    return null;
  }
}

export async function getRepoMeta(octokit, owner, repo) {
  try {
    const { data } = await octokit.rest.repos.get({ owner, repo });
    await sleep(RATE_LIMIT.requestDelayMs);
    return {
      defaultBranch: data.default_branch,
      description: data.description,
      stars: data.stargazers_count,
      url: data.html_url,
    };
  } catch {
    return { defaultBranch: 'main', description: null, stars: 0, url: `https://github.com/${owner}/${repo}` };
  }
}
