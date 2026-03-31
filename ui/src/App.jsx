import { useState, useMemo } from 'react';
import { useSkillData } from './hooks/useSkillData.js';
import { filterSkills, sortSkills, groupSkills } from './utils/filtering.js';
import Header from './components/Header.jsx';
import StatsBar from './components/StatsBar.jsx';
import SearchBar from './components/SearchBar.jsx';
import FilterPanel from './components/FilterPanel.jsx';
import SkillGrid from './components/SkillGrid.jsx';

export default function App() {
  const { skills, meta, loading, error } = useSkillData();
  const [searchQuery, setSearchQuery] = useState('');
  const [groupBy, setGroupBy] = useState('none');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [sortBy, setSortBy] = useState('name');

  const grouped = useMemo(() => {
    const filtered = filterSkills(skills, { searchQuery, sourceFilter });
    const sorted = sortSkills(filtered, sortBy);
    return groupSkills(sorted, groupBy);
  }, [skills, searchQuery, sourceFilter, sortBy, groupBy]);

  const totalResults = grouped.reduce((n, g) => n + g.skills.length, 0);

  if (loading) return <div className="loading" role="status">Loading skills…</div>;
  if (error) return <div className="load-error" role="alert">Error: {error}</div>;

  return (
    <div className="app">
      <Header />
      {meta && <StatsBar meta={meta} />}
      <div className="controls-row">
        <SearchBar value={searchQuery} onChange={setSearchQuery} />
        <FilterPanel
          groupBy={groupBy}
          sourceFilter={sourceFilter}
          sortBy={sortBy}
          onGroupBy={setGroupBy}
          onSourceFilter={setSourceFilter}
          onSortBy={setSortBy}
        />
      </div>
      <p className="result-count" aria-live="polite">
        {totalResults} {totalResults === 1 ? 'skill' : 'skills'}
      </p>
      <main id="main-content">
        <SkillGrid groups={grouped} />
      </main>
    </div>
  );
}
