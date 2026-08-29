import moment from "moment";

const MAX_DOTS = 4;

/**
 * The week at a glance. Each day carries load dots for its class count, so
 * the strip says which days are busy instead of just listing numbers.
 */
const WeekStrip = ({ currentDate, onSelectDate, weekCounts = {} }) => {
  const weekStart = moment(currentDate, "YYYY-MM-DD").startOf("isoWeek");
  const days = Array.from({ length: 7 }, (_, i) =>
    weekStart.clone().add(i, "days")
  );
  const today = moment().format("YYYY-MM-DD");

  return (
    <nav className="week" aria-label="Week">
      {days.map((day) => {
        const key = day.format("YYYY-MM-DD");
        const isActive = key === currentDate;
        const isToday = key === today;
        const count = weekCounts[key] || 0;

        return (
          <button
            key={key}
            type="button"
            className={[
              "week__day",
              isActive && "week__day--active",
              isToday && "week__day--today",
              (day.day() === 0 || day.day() === 6) && "week__day--weekend",
            ]
              .filter(Boolean)
              .join(" ")}
            onClick={() => onSelectDate(key)}
            aria-current={isActive ? "date" : undefined}
            aria-label={`${day.format("dddd D MMMM")}, ${
              count === 1 ? "1 class" : `${count} classes`
            }`}
          >
            <span className="week__weekday">{day.format("dd")}</span>
            <span className="week__num">{day.format("D")}</span>
            <span className="week__load" aria-hidden="true">
              {count === 0 ? (
                <i className="week__dot week__dot--none" />
              ) : (
                Array.from({ length: Math.min(count, MAX_DOTS) }, (_, i) => (
                  <i key={i} className="week__dot" />
                ))
              )}
            </span>
          </button>
        );
      })}
    </nav>
  );
};

export default WeekStrip;
