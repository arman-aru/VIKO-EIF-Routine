import moment from "moment";

const BottomNav = ({ date, onPrev, onNext, onToday }) => {
  const isToday = moment(date).isSame(moment(), "day");
  const displayDate = moment(date).format("D MMM");

  return (
    <nav className="bottom-nav">

      {/* Previous */}
      <button className="bnav-arrow" onClick={onPrev} aria-label="Previous day">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        <span>Prev</span>
      </button>

      {/* Today — centre pill */}
      <button
        className={`bnav-today ${isToday ? "bnav-today--active" : ""}`}
        onClick={onToday}
        aria-label="Go to today"
      >
        <span className="bnav-today-label">Today</span>
        <span className="bnav-today-date">{displayDate}</span>
      </button>

      {/* Next */}
      <button className="bnav-arrow" onClick={onNext} aria-label="Next day">
        <span>Next</span>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </button>

    </nav>
  );
};

export default BottomNav;
