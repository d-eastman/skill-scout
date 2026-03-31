export default function Header() {
  return (
    <header className="header">
      <div className="header-inner">
        <div className="brand">
          <span className="brand-icon" aria-hidden="true">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden="true">
              <circle cx="13" cy="13" r="9" stroke="currentColor" strokeWidth="2" fill="none" />
              <circle cx="13" cy="13" r="4" stroke="currentColor" strokeWidth="1.5" fill="none" />
              <line x1="2" y1="13" x2="5" y2="13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <line x1="21" y1="13" x2="24" y2="13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <line x1="13" y1="2" x2="13" y2="5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <line x1="13" y1="21" x2="13" y2="24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <line x1="20" y1="20" x2="28" y2="28" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </span>
          <div className="brand-text">
            <span className="brand-name">SkillScout</span>
            <span className="brand-tagline">Discover Claude skills across GitHub</span>
          </div>
        </div>
      </div>
    </header>
  );
}
