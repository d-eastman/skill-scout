import { useState } from 'react';

export default function DuplicateBadge({ count, duplicateIds }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div>
      <button
        className="dup-badge"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        aria-label={`${count} copies — click to ${expanded ? 'collapse' : 'expand'}`}
      >
        <svg width="10" height="10" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
          <path d="M4 2a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V2zm2-1a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1H6zM2 5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1v-1h1v1a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h1v1H2z" />
        </svg>
        {count} {count === 1 ? 'copy' : 'copies'}
      </button>
      {expanded && duplicateIds.length > 0 && (
        <ul className="dup-list" role="list">
          {duplicateIds.map((id) => {
            const [owner, repo, ...rest] = id.split('/');
            const path = rest.join('/');
            const url = `https://github.com/${owner}/${repo}/blob/main/${path}`;
            return (
              <li key={id}>
                <a href={url} target="_blank" rel="noopener noreferrer">
                  {id}
                </a>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
