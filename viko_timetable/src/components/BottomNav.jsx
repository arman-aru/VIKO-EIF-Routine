import moment from "moment";
import { ChevronLeft, ChevronRight } from "./icons";

const BottomNav = ({ date, onPrev, onNext, onToday }) => {
  const isToday = moment(date, "YYYY-MM-DD").isSame(moment(), "day");
  // Always the real current date — this button is a shortcut *to* today, so
  // labelling it with the viewed day made it read as the wrong date.
  const todayLabel = moment().format("D MMM");

  return (
    <nav className="daynav" aria-label="Change day">
      <button type="button" className="daynav__step" onClick={onPrev}>
        <ChevronLeft size={18} />
        <span>Prev</span>
      </button>

      <button
        type="button"
        className={`daynav__today ${isToday ? "daynav__today--active" : ""}`}
        onClick={onToday}
        aria-label={`Go to today, ${moment().format("D MMMM")}`}
      >
        <span className="daynav__today-label">Today</span>
        <span className="daynav__today-date">{todayLabel}</span>
      </button>

      <button type="button" className="daynav__step" onClick={onNext}>
        <span>Next</span>
        <ChevronRight size={18} />
      </button>
    </nav>
  );
};

export default BottomNav;
