import { useState, useEffect } from 'react';

export function useSkillData() {
  const [skills, setSkills] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const url = `${import.meta.env.BASE_URL}data/skills.json`;
    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load skills data (${res.status})`);
        return res.json();
      })
      .then(({ skills, meta }) => {
        setSkills(skills);
        setMeta(meta);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return { skills, meta, loading, error };
}
