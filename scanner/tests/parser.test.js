import { describe, it, expect } from 'vitest';
import { parseSkillMd, hashContent, deriveInstallCommand } from '../parser.js';

describe('parseSkillMd', () => {
  describe('YAML frontmatter strategy', () => {
    it('extracts name and description from frontmatter', () => {
      const raw = `---
name: my-skill
description: Does something useful
---

# Body
`;
      expect(parseSkillMd(raw)).toEqual({
        name: 'my-skill',
        description: 'Does something useful',
      });
    });

    it('falls through to markdown headers if frontmatter has no name/description', () => {
      const raw = `---
author: alice
---

# MySkill

A great description here.
`;
      const result = parseSkillMd(raw);
      expect(result.name).toBe('MySkill');
      expect(result.description).toBe('A great description here.');
    });

    it('handles malformed frontmatter gracefully', () => {
      // gray-matter can throw on some invalid YAML; the parser should catch it
      const raw = `---
name: [unclosed bracket
---

# Fallback Skill

Fallback description.
`;
      // If it throws internally, we fall through to a later strategy
      const result = parseSkillMd(raw);
      expect(result).toBeTruthy();
      expect(typeof result.name).toBe('string');
      expect(typeof result.description).toBe('string');
    });
  });

  describe('Markdown headers strategy', () => {
    it('extracts name from H1 and description from first paragraph', () => {
      const raw = `# pdf

Generates PDF documents from markdown.
`;
      expect(parseSkillMd(raw)).toEqual({
        name: 'pdf',
        description: 'Generates PDF documents from markdown.',
      });
    });

    it('extracts description from a ## Description section if present', () => {
      const raw = `# my-tool

## Description
A detailed description of the tool.

## Usage
Some usage info.
`;
      const result = parseSkillMd(raw);
      expect(result.name).toBe('my-tool');
      expect(result.description).toBe('A detailed description of the tool.');
    });

    it('uses first non-header paragraph when no Description section exists', () => {
      const raw = `# git-hooks

Sets up git hooks.

## Installation
npm install
`;
      const result = parseSkillMd(raw);
      expect(result.name).toBe('git-hooks');
      expect(result.description).toBe('Sets up git hooks.');
    });
  });

  describe('Key-value pattern strategy', () => {
    it('extracts name and description from key-value lines', () => {
      const raw = `Name: excel-helper
Description: Handles Excel spreadsheets.
`;
      expect(parseSkillMd(raw)).toEqual({
        name: 'excel-helper',
        description: 'Handles Excel spreadsheets.',
      });
    });

    it('is case-insensitive for key names', () => {
      const raw = `name: lower-case
description: Works fine.
`;
      const result = parseSkillMd(raw);
      expect(result.name).toBe('lower-case');
      expect(result.description).toBe('Works fine.');
    });
  });

  describe('Fallback strategy', () => {
    it('returns a result even for completely unstructured content', () => {
      const raw = `Just a plain file with no recognizable structure whatsoever.`;
      const result = parseSkillMd(raw);
      expect(result).toBeTruthy();
      expect(typeof result.name).toBe('string');
      expect(typeof result.description).toBe('string');
    });

    it('handles empty content without crashing', () => {
      const result = parseSkillMd('');
      expect(result).toBeTruthy();
    });
  });
});

describe('hashContent', () => {
  it('returns a 64-character hex string', () => {
    const hash = hashContent('hello world');
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('normalizes CRLF to LF before hashing', () => {
    const lf = hashContent('line1\nline2\n');
    const crlf = hashContent('line1\r\nline2\r\n');
    expect(lf).toBe(crlf);
  });

  it('collapses multiple spaces', () => {
    const single = hashContent('a b c');
    const multi = hashContent('a  b   c');
    expect(single).toBe(multi);
  });

  it('produces different hashes for different content', () => {
    expect(hashContent('foo')).not.toBe(hashContent('bar'));
  });

  it('is deterministic', () => {
    const content = '# My Skill\n\nDoes something.\n';
    expect(hashContent(content)).toBe(hashContent(content));
  });
});

describe('deriveInstallCommand', () => {
  it('produces the correct install command', () => {
    expect(deriveInstallCommand('anthropics', 'claude-code', 'pdf')).toBe(
      'npx skills add anthropics/claude-code --skill pdf'
    );
  });

  it('handles hyphenated skill names', () => {
    expect(deriveInstallCommand('my-org', 'my-repo', 'docker-compose')).toBe(
      'npx skills add my-org/my-repo --skill docker-compose'
    );
  });
});
