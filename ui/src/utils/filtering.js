export function filterSkills(skills, { searchQuery, sourceFilter }) {
  let result = skills;

  if (sourceFilter !== 'all') {
    result = result.filter((s) => s.source === sourceFilter);
  }

  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase();
    result = result.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q) ||
        s.repo.toLowerCase().includes(q) ||
        s.repoOwner.toLowerCase().includes(q)
    );
  }

  return result;
}

export function sortSkills(skills, sortBy) {
  return [...skills].sort((a, b) => {
    switch (sortBy) {
      case 'stars':
        return b.repoStars - a.repoStars;
      case 'lastCommit': {
        const da = a.lastCommitDate ? new Date(a.lastCommitDate) : 0;
        const db = b.lastCommitDate ? new Date(b.lastCommitDate) : 0;
        return db - da;
      }
      case 'scanDate':
        return new Date(b.scanDate) - new Date(a.scanDate);
      case 'name':
      default:
        return a.name.localeCompare(b.name);
    }
  });
}

export function groupSkills(skills, groupBy) {
  if (groupBy === 'none') return [{ groupKey: null, groupLabel: null, skills }];

  const groups = new Map();
  for (const skill of skills) {
    const key = groupBy === 'owner' ? skill.repoOwner : skill.contentHash.slice(0, 8);
    const label =
      groupBy === 'owner' ? skill.repoOwner : `Duplicate group: ${skill.contentHash.slice(0, 8)}`;
    if (!groups.has(key)) groups.set(key, { groupKey: key, groupLabel: label, skills: [] });
    groups.get(key).skills.push(skill);
  }

  return [...groups.values()].sort((a, b) => a.groupLabel.localeCompare(b.groupLabel));
}

export function relativeDate(isoString) {
  if (!isoString) return 'unknown';
  const diff = Date.now() - new Date(isoString).getTime();
  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
  const days = Math.round(diff / 86_400_000);
  if (Math.abs(days) < 1) return 'today';
  if (Math.abs(days) < 7) return rtf.format(-days, 'day');
  if (Math.abs(days) < 30) return rtf.format(-Math.round(days / 7), 'week');
  if (Math.abs(days) < 365) return rtf.format(-Math.round(days / 30), 'month');
  return rtf.format(-Math.round(days / 365), 'year');
}
