const Header = ({ selectedGroup, onChangeGroup }) => {
  return (
    <header className="app-header">
      <div className="header-inner">
        {/* Branding */}
        <div className="header-brand">
          <img
            src="/viko-logo.png"
            alt="VIKO Logo"
            className="header-logo-img"
          />
          <div className="header-brand-text">
            <span className="header-title">VIKO <span className="header-title-eif">EIF</span></span>
            <span className="header-subtitle">Timetable</span>
          </div>
        </div>

        {/* Right side */}
        <div className="header-right">
          {/* Group selector */}
          {selectedGroup ? (
            <button
              className="group-chip"
              onClick={onChangeGroup}
              title="Change group"
            >
              <span className="group-chip-dot" />
              <span className="group-chip-text">{selectedGroup.short}</span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>
          ) : (
            <button className="group-chip group-chip--empty" onClick={onChangeGroup}>
              Select Group
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
