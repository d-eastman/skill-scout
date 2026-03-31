export default function FilterPanel({ groupBy, sourceFilter, sortBy, onGroupBy, onSourceFilter, onSortBy }) {
  return (
    <div className="filter-panel" role="group" aria-label="Filter and sort options">
      <span className="filter-label" aria-hidden="true">Group:</span>
      <select
        className="filter-select"
        value={groupBy}
        onChange={(e) => onGroupBy(e.target.value)}
        aria-label="Group by"
      >
        <option value="none">None</option>
        <option value="owner">Owner</option>
        <option value="hash">Duplicates</option>
      </select>

      <span className="filter-label" aria-hidden="true">Source:</span>
      <select
        className="filter-select"
        value={sourceFilter}
        onChange={(e) => onSourceFilter(e.target.value)}
        aria-label="Filter by source"
      >
        <option value="all">All</option>
        <option value="curated">Curated</option>
        <option value="search">Discovered</option>
      </select>

      <span className="filter-label" aria-hidden="true">Sort:</span>
      <select
        className="filter-select"
        value={sortBy}
        onChange={(e) => onSortBy(e.target.value)}
        aria-label="Sort by"
      >
        <option value="name">Name</option>
        <option value="stars">Stars</option>
        <option value="lastCommit">Last Commit</option>
        <option value="scanDate">Recently Scanned</option>
      </select>
    </div>
  );
}
