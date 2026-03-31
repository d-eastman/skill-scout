import { useState, useCallback } from 'react';
import { relativeDate } from '../utils/filtering.js';
import DuplicateBadge from './DuplicateBadge.jsx';

export default function SkillCard({ skill }) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(skill.installCommand);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard API unavailable; silently ignore
    }
  }, [skill.installCommand]);

  const longDesc = skill.description.length > 120;
  const needsTruncation = longDesc && !expanded;

  return (
    <article className="skill-card" aria-label={`Skill: ${skill.name}`}>
      <div className="card-top">
        <span className="skill-name">{skill.name}</span>
        <div className="card-badges">
          {skill.duplicateCount > 1 && (
            <DuplicateBadge count={skill.duplicateCount} duplicateIds={skill.duplicateIds} />
          )}
          <span className={`source-badge ${skill.source}`} aria-label={`Source: ${skill.source}`}>
            {skill.source === 'curated' ? 'curated' : 'discovered'}
          </span>
        </div>
      </div>

      {skill.description && (
        <div>
          <p className={`description${needsTruncation ? ' truncated' : ''}`}>
            {skill.description}
          </p>
          {longDesc && (
            <button className="description-toggle" onClick={() => setExpanded((v) => !v)}>
              {expanded ? 'Show less' : 'Show more'}
            </button>
          )}
        </div>
      )}

      <div className="repo-row">
        <a
          className="repo-link"
          href={skill.repoUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Repository: ${skill.repo}`}
        >
          <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
            <path d="M2 2.5A2.5 2.5 0 0 1 4.5 0h8.75a.75.75 0 0 1 .75.75v12.5a.75.75 0 0 1-.75.75h-2.5a.75.75 0 0 1 0-1.5h1.75v-2h-8a1 1 0 0 0-.714 1.7.75.75 0 1 1-1.072 1.05A2.495 2.495 0 0 1 2 11.5Zm10.5-1h-8a1 1 0 0 0-1 1v6.708A2.486 2.486 0 0 1 4.5 9h8V1.5Z" />
          </svg>
          {skill.repo}
        </a>
        <span className="stars" aria-label={`${skill.repoStars} stars`}>
          <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
            <path d="M8 .25a.75.75 0 0 1 .673.418l1.882 3.815 4.21.612a.75.75 0 0 1 .416 1.279l-3.046 2.97.719 4.192a.751.751 0 0 1-1.088.791L8 12.347l-3.766 1.98a.75.75 0 0 1-1.088-.79l.72-4.194L.818 6.374a.75.75 0 0 1 .416-1.28l4.21-.611L7.327.668A.75.75 0 0 1 8 .25Z" />
          </svg>
          {skill.repoStars.toLocaleString()}
        </span>
      </div>

      <div className="install-row">
        <code className="install-cmd" title={skill.installCommand}>
          {skill.installCommand}
        </code>
        <button
          className={`copy-btn${copied ? ' copied' : ''}`}
          onClick={handleCopy}
          aria-label={copied ? 'Copied!' : 'Copy install command'}
        >
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>

      <div className="card-footer">
        <span className="commit-date">
          {skill.lastCommitDate ? `Updated ${relativeDate(skill.lastCommitDate)}` : 'No commit info'}
        </span>
        <span
          className="fingerprint"
          title={`Content hash: ${skill.contentHash}`}
          aria-label={`Content fingerprint: ${skill.contentHash.slice(0, 8)}`}
        >
          #{skill.contentHash.slice(0, 8)}
        </span>
      </div>
    </article>
  );
}
