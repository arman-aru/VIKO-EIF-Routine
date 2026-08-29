import moment from "moment";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

const MAX_DOTS = 4;
// How long the strip must sit still before we treat a swipe as finished
const SETTLE_MS = 120;

const isoWeekStart = (d) =>
  moment(d, "YYYY-MM-DD").startOf("isoWeek").format("YYYY-MM-DD");

const Week = ({ weekStart, currentDate, today, weekCounts, onSelectDate }) => {
  const days = Array.from({ length: 7 }, (_, i) =>
    moment(weekStart, "YYYY-MM-DD").add(i, "days")
  );

  return (
    <div className="week">
      {days.map((day) => {
        const key = day.format("YYYY-MM-DD");
        const isActive = key === currentDate;
        const count = weekCounts[key] || 0;

        return (
          <button
            key={key}
            type="button"
            className={[
              "week__day",
              isActive && "week__day--active",
              key === today && "week__day--today",
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
    </div>
  );
};

/**
 * The week at a glance, swipeable between weeks.
 *
 * Three weeks are rendered side by side and the middle one is kept centred.
 * Settling on a neighbour moves the viewed week and re-centres instantly, so
 * you can keep swiping in either direction. Tapping a day only selects it.
 */
const WeekStrip = ({ currentDate, onSelectDate, weekCounts = {} }) => {
  const [viewWeek, setViewWeek] = useState(() => isoWeekStart(currentDate));
  const scrollerRef = useRef(null);
  // Suppresses the settle handler while we re-centre programmatically
  const centring = useRef(false);

  // Follow the selection when it lands in another week (Prev/Next at a week
  // boundary, or the reset back to today)
  useEffect(() => {
    const week = isoWeekStart(currentDate);
    setViewWeek((prev) => (prev === week ? prev : week));
  }, [currentDate]);

  const centre = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    centring.current = true;
    el.scrollLeft = el.clientWidth;
    // Release once the scroll events from that jump have flushed
    requestAnimationFrame(() => {
      centring.current = false;
    });
  }, []);

  // Re-centre before paint so the swap between weeks is never visible
  useLayoutEffect(centre, [viewWeek, centre]);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;

    let timer;
    const onSettled = () => {
      if (centring.current || !el.clientWidth) return;
      const page = Math.round(el.scrollLeft / el.clientWidth);
      if (page === 1) return; // still on the middle week
      setViewWeek((week) =>
        moment(week, "YYYY-MM-DD").add(page - 1, "week").format("YYYY-MM-DD")
      );
    };

    const onScroll = () => {
      clearTimeout(timer);
      timer = setTimeout(onSettled, SETTLE_MS);
    };

    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      el.removeEventListener("scroll", onScroll);
      clearTimeout(timer);
    };
  }, []);

  const today = moment().format("YYYY-MM-DD");
  const weeks = [-1, 0, 1].map((offset) =>
    moment(viewWeek, "YYYY-MM-DD").add(offset, "week").format("YYYY-MM-DD")
  );

  return (
    <nav className="week-scroller" ref={scrollerRef} aria-label="Week">
      {weeks.map((weekStart) => (
        <Week
          key={weekStart}
          weekStart={weekStart}
          currentDate={currentDate}
          today={today}
          weekCounts={weekCounts}
          onSelectDate={onSelectDate}
        />
      ))}
    </nav>
  );
};

export default WeekStrip;
