export default function StatsBar({ meta }) {
  const scanDate = new Date(meta.scanDate).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  const stats = [
    { label: 'skills', value: meta.totalSkills },
    { label: 'unique', value: meta.uniqueSkills },
    { label: 'repos', value: meta.totalRepos },
    { label: 'dup groups', value: meta.duplicateGroups },
    { label: 'last scan', value: scanDate },
  ];

  return (
    <div className="stats-bar" role="region" aria-label="Scan statistics">
      {stats.map(({ label, value }) => (
        <div key={label} className="stat-pill">
          <span className="stat-value">{value}</span>
          <span className="stat-label">{label}</span>
        </div>
      ))}
    </div>
  );
}
