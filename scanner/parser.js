import { createHash } from 'crypto';
import matter from 'gray-matter';

export function parseSkillMd(rawContent) {
  return (
    parseFromFrontmatter(rawContent) ||
    parseFromMarkdownHeaders(rawContent) ||
    parseFromKeyValuePattern(rawContent) ||
    parseFromFirstParagraph(rawContent)
  );
}

function parseFromFrontmatter(raw) {
  try {
    const { data, content } = matter(raw);
    if (!data.name && !data.description) return null;
    return {
      name: data.name ? String(data.name).trim() : inferNameFromContent(content),
      description: data.description ? String(data.description).trim() : firstParagraph(content),
    };
  } catch {
    return null;
  }
}

function parseFromMarkdownHeaders(raw) {
  const h1 = raw.match(/^#\s+(.+)$/m);
  if (!h1) return null;

  const name = h1[1].trim();
  const afterH1 = raw.slice(raw.indexOf(h1[0]) + h1[0].length);

  const descSection = afterH1.match(/^##\s+description\s*\n([\s\S]*?)(?=^##|\z)/im);
  const description = descSection
    ? firstParagraph(descSection[1])
    : firstParagraph(afterH1);

  return description ? { name, description } : null;
}

function parseFromKeyValuePattern(raw) {
  const name = raw.match(/^[Nn]ame:\s*(.+)$/m)?.[1]?.trim();
  const description = raw.match(/^[Dd]escription:\s*(.+)$/m)?.[1]?.trim();
  if (!name && !description) return null;
  return { name: name ?? 'unknown', description: description ?? '' };
}

function parseFromFirstParagraph(raw) {
  const para = firstParagraph(raw);
  return { name: inferNameFromContent(raw), description: para ?? '' };
}

function firstParagraph(text) {
  const lines = text.split('\n');
  const paras = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      if (paras.length) break;
      continue;
    }
    paras.push(trimmed);
  }
  return paras.join(' ').trim() || null;
}

function inferNameFromContent(text) {
  const h1 = text.match(/^#\s+(.+)$/m);
  if (h1) return h1[1].trim();
  const first = firstParagraph(text);
  if (first) return first.split(/\s+/).slice(0, 4).join(' ');
  return 'unknown';
}

export function hashContent(rawContent) {
  const normalized = rawContent.replace(/\r\n/g, '\n').replace(/[ \t]+/g, ' ');
  return createHash('sha256').update(normalized).digest('hex');
}

export function deriveInstallCommand(owner, repo, skillName) {
  return `npx skills add ${owner}/${repo} --skill ${skillName}`;
}
