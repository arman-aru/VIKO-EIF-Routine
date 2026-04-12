import moment from "moment";

const BottomNav = ({ date, onPrev, onNext, onToday }) => {
  const isToday = moment(date).isSame(moment(), "day");

  return (
    <nav className="bottom-nav">
      <button className="bottom-nav-btn" onClick={onPrev} aria-label="Previous day">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        <span>Prev</span>
      </button>

      <button
        className={`bottom-nav-btn bottom-nav-btn--today ${isToday ? "bottom-nav-btn--active" : ""}`}
        onClick={onToday}
        aria-label="Go to today"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
        <span>Today</span>
      </button>

      <button className="bottom-nav-btn" onClick={onNext} aria-label="Next day">
        <span>Next</span>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </button>
    </nav>
  );
};

export default BottomNav;
