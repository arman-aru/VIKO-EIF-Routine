import moment from "moment";
import { useEffect, useRef } from "react";

const WeekStrip = ({ currentDate, onSelectDate }) => {
  const stripRef = useRef(null);
  const activeRef = useRef(null);

  const weekStart = moment(currentDate).startOf("isoWeek");
  const days = Array.from({ length: 7 }, (_, i) =>
    weekStart.clone().add(i, "days")
  );

  const today = moment().format("YYYY-MM-DD");

  // Scroll active day into view
  useEffect(() => {
    if (activeRef.current && stripRef.current) {
      activeRef.current.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center",
      });
    }
  }, [currentDate]);

  return (
    <div className="week-strip-wrapper">
      <div className="week-strip" ref={stripRef}>
        {days.map((day) => {
          const dateStr = day.format("YYYY-MM-DD");
          const isActive = dateStr === currentDate;
          const isToday = dateStr === today;
          const isWeekend = day.day() === 0 || day.day() === 6;

          return (
            <button
              key={dateStr}
              ref={isActive ? activeRef : null}
              className={`week-day
                ${isActive ? "week-day--active" : ""}
                ${isToday && !isActive ? "week-day--today" : ""}
                ${isWeekend ? "week-day--weekend" : ""}
              `}
              onClick={() => onSelectDate(dateStr)}
            >
              <span className="week-day-name">{day.format("ddd")}</span>
              <span className="week-day-num">{day.format("D")}</span>
              {isToday && <span className="week-today-dot" />}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default WeekStrip;
