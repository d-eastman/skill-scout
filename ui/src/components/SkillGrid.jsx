import SkillCard from './SkillCard.jsx';

export default function SkillGrid({ groups }) {
  const total = groups.reduce((n, g) => n + g.skills.length, 0);

  if (total === 0) {
    return (
      <div className="skill-grid">
        <div className="empty-state" role="status">
          <h3>No skills found</h3>
          <p>Try adjusting your search or filters.</p>
        </div>
      </div>
    );
  }

  const hasGroups = groups.some((g) => g.groupKey !== null);

  return (
    <div className="skill-grid" role="list" aria-label="Skills">
      {groups.map(({ groupKey, groupLabel, skills }) => (
        <GroupSection
          key={groupKey ?? '__all__'}
          label={groupLabel}
          skills={skills}
          showHeader={hasGroups}
        />
      ))}
    </div>
  );
}

function GroupSection({ label, skills, showHeader }) {
  return (
    <>
      {showHeader && (
        <h2 className="group-header" role="listitem">
          {label}
          <span className="sr-only"> ({skills.length} skills)</span>
        </h2>
      )}
      {skills.map((skill) => (
        <div key={skill.id} role="listitem">
          <SkillCard skill={skill} />
        </div>
      ))}
    </>
  );
}
