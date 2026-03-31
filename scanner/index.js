import { writeFileSync, mkdirSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { createClient, searchForSkillFiles, scanCuratedRepo, fetchFileContent, getLastCommitDate, getRepoMeta } from './github.js';
import { parseSkillMd, hashContent, deriveInstallCommand } from './parser.js';
import { CURATED_REPOS } from './config.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_PATH = resolve(__dirname, '../ui/public/data/skills.json');

async function main() {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    console.error('GITHUB_TOKEN environment variable is required');
    process.exit(1);
  }

  const octokit = createClient(token);
  const scanDate = new Date().toISOString();

  console.log('Phase 1: Scanning curated repos...');
  const curatedFiles = [];
  for (const ownerRepo of CURATED_REPOS) {
    console.log(`  Scanning ${ownerRepo}...`);
    const files = await scanCuratedRepo(octokit, ownerRepo);
    curatedFiles.push(...files.map((f) => ({ ...f, source: 'curated' })));
    console.log(`  Found ${files.length} SKILL.md file(s) in ${ownerRepo}`);
  }

  console.log('Phase 2: Searching GitHub...');
  const searchFiles = await searchForSkillFiles(octokit);
  console.log(`  Found ${searchFiles.length} files via search`);

  // Merge and dedupe by owner/repo/path
  const seen = new Set(curatedFiles.map((f) => `${f.owner}/${f.repo}/${f.path}`));
  const allFiles = [...curatedFiles];
  for (const f of searchFiles) {
    const key = `${f.owner}/${f.repo}/${f.path}`;
    if (!seen.has(key)) {
      seen.add(key);
      allFiles.push({ ...f, source: 'search' });
    }
  }

  console.log(`Phase 3: Fetching and parsing ${allFiles.length} files...`);
  const repoMetaCache = new Map();

  const rawSkills = [];
  for (const file of allFiles) {
    const repoKey = `${file.owner}/${file.repo}`;
    console.log(`  Processing ${repoKey}/${file.path}`);

    if (!repoMetaCache.has(repoKey)) {
      repoMetaCache.set(repoKey, await getRepoMeta(octokit, file.owner, file.repo));
    }
    const meta = repoMetaCache.get(repoKey);

    let rawContent;
    try {
      rawContent = await fetchFileContent(octokit, file.owner, file.repo, file.path);
    } catch (err) {
      console.warn(`  Failed to fetch ${repoKey}/${file.path}: ${err.message}`);
      continue;
    }

    const parsed = parseSkillMd(rawContent);
    const hash = hashContent(rawContent);
    const lastCommitDate = await getLastCommitDate(octokit, file.owner, file.repo, file.path);

    const skillName = parsed.name || file.path.split('/').at(-2) || 'unknown';

    rawSkills.push({
      id: `${repoKey}/${file.path}`,
      name: skillName,
      description: parsed.description || '',
      repo: repoKey,
      repoOwner: file.owner,
      repoUrl: meta.url,
      repoStars: meta.stars,
      skillPath: file.path,
      installCommand: deriveInstallCommand(file.owner, file.repo, skillName),
      contentHash: hash,
      lastCommitDate,
      scanDate,
      source: file.source,
      duplicateCount: 1,
      duplicateIds: [],
    });
  }

  console.log('Phase 4: Deduplicating...');
  const byHash = new Map();
  for (const skill of rawSkills) {
    if (!byHash.has(skill.contentHash)) {
      byHash.set(skill.contentHash, []);
    }
    byHash.get(skill.contentHash).push(skill);
  }

  const skills = [];
  for (const group of byHash.values()) {
    if (group.length === 1) {
      skills.push(group[0]);
    } else {
      for (const skill of group) {
        skill.duplicateCount = group.length;
        skill.duplicateIds = group.filter((s) => s.id !== skill.id).map((s) => s.id);
      }
      skills.push(...group);
    }
  }

  skills.sort((a, b) => a.name.localeCompare(b.name));

  const reposScanned = new Set(skills.map((s) => s.repo)).size;
  const uniqueHashes = new Set(skills.map((s) => s.contentHash));
  const duplicateGroups = [...uniqueHashes].filter(
    (h) => skills.filter((s) => s.contentHash === h).length > 1
  ).length;

  const output = {
    meta: {
      scanDate,
      totalSkills: skills.length,
      uniqueSkills: uniqueHashes.size,
      totalRepos: reposScanned,
      duplicateGroups,
    },
    skills,
  };

  mkdirSync(dirname(OUTPUT_PATH), { recursive: true });
  writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2));
  console.log(`Done. Wrote ${skills.length} skills to ${OUTPUT_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
