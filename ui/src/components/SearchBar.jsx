import { useRef, useCallback } from 'react';

export default function SearchBar({ value, onChange }) {
  const timeoutRef = useRef(null);

  const handleChange = useCallback(
    (e) => {
      const raw = e.target.value;
      clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => onChange(raw), 300);
    },
    [onChange]
  );

  const handleClear = useCallback(() => {
    onChange('');
    // Reset the native input value
    const input = document.querySelector('.search-input');
    if (input) input.value = '';
  }, [onChange]);

  return (
    <div className="search-bar" role="search">
      <label htmlFor="skill-search" className="sr-only">Search skills</label>
      <span className="search-icon" aria-hidden="true">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.099zm-5.242 1.156a5.5 5.5 0 1 1 0-11 5.5 5.5 0 0 1 0 11z" />
        </svg>
      </span>
      <input
        id="skill-search"
        type="search"
        className="search-input"
        placeholder="Search skills by name, description, repo…"
        defaultValue={value}
        onChange={handleChange}
        aria-label="Search skills"
      />
      {value && (
        <button className="search-clear" onClick={handleClear} aria-label="Clear search">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
            <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z" />
          </svg>
        </button>
      )}
    </div>
  );
}
