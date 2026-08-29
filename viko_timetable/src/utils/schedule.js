import moment from "moment";

// Gaps shorter than this are the normal turnaround between back-to-back
// periods and aren't worth calling out as a break.
const MIN_GAP_MINUTES = 15;

const at = (date, time) => moment(`${date} ${time}`, "YYYY-MM-DD HH:mm");

/** Human duration: 45 min, 1 h, 1 h 45, 5 h 05 */
export const formatDuration = (minutes) => {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h} h ${String(m).padStart(2, "0")}` : `${h} h`;
};

/**
 * A countdown only earns its place when the lesson is actually near — the
 * start time is already on the row, so "in 5 h 05" adds noise, not meaning.
 */
export const COUNTDOWN_WINDOW_MINUTES = 180;

/**
 * Annotates a day's lectures with their position in time, and inserts the
 * break rows between them. Returns a flat list of rows the view can render
 * directly, so the component stays free of time arithmetic.
 */
export const buildTimeline = (lectures, date, now) => {
  if (!lectures?.length) return [];

  const isToday = moment(now).isSame(moment(date, "YYYY-MM-DD"), "day");

  const items = lectures.map((lecture) => {
    const start = at(lecture.date || date, lecture.starttime);
    const end = at(lecture.date || date, lecture.endtime);

    let status = "upcoming";
    if (isToday) {
      if (now.isAfter(end)) status = "past";
      else if (now.isSameOrAfter(start)) status = "live";
    } else if (moment(date, "YYYY-MM-DD").isBefore(now, "day")) {
      status = "past";
    }

    const total = end.diff(start, "minutes");
    const elapsed = now.diff(start, "minutes");

    return {
      kind: "lecture",
      lecture,
      start,
      end,
      status,
      // How far through the lesson we are, 0–1, only meaningful when live
      progress: status === "live" && total > 0
        ? Math.min(1, Math.max(0, elapsed / total))
        : 0,
      minutesUntil: start.diff(now, "minutes"),
      durationMinutes: total,
    };
  });

  // The soonest lecture that hasn't started yet is the one to highlight
  const nextIndex = isToday
    ? items.findIndex((i) => i.status === "upcoming")
    : -1;
  if (nextIndex !== -1 && !items.some((i) => i.status === "live")) {
    items[nextIndex].isNext = true;
  }

  // Weave in break rows
  const rows = [];
  items.forEach((item, i) => {
    rows.push(item);
    const next = items[i + 1];
    if (!next) return;
    const gap = next.start.diff(item.end, "minutes");
    if (gap >= MIN_GAP_MINUTES) {
      rows.push({
        kind: "break",
        minutes: gap,
        // A break counts as "now" when the clock sits inside it
        isNow:
          isToday && now.isSameOrAfter(item.end) && now.isBefore(next.start),
      });
    }
  });

  return rows;
};

/** Where the live marker belongs when no lesson is currently running. */
export const getNowPlacement = (rows, date, now) => {
  if (!moment(now).isSame(moment(date, "YYYY-MM-DD"), "day")) return null;
  if (rows.some((r) => r.kind === "lecture" && r.status === "live")) return null;

  const lectures = rows.filter((r) => r.kind === "lecture");
  if (!lectures.length) return null;
  if (now.isBefore(lectures[0].start)) return "before";
  if (now.isAfter(lectures[lectures.length - 1].end)) return "after";
  return null; // sits inside a gap — the break row shows it instead
};
