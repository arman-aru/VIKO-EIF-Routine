const TelegramIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L8.32 13.617l-2.96-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.828.942z" />
  </svg>
);

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
          {/* Telegram bot link */}
          <a
            href="https://t.me/vikoeif_timetable_bot"
            target="_blank"
            rel="noopener noreferrer"
            className="tg-btn"
            title="Get daily class notifications on Telegram"
          >
            <TelegramIcon />
            <span className="tg-btn-label">Notify me</span>
          </a>

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
