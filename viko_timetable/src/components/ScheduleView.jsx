import moment from "moment";
import { useMemo, useState } from "react";
import { useNow } from "../hooks/useNow";
import { buildTimeline, formatDuration, getNowPlacement } from "../utils/schedule";
import LectureCard from "./LectureCard";
import {
  FreeDayIcon,
  RefreshIcon,
  SelectGroupIcon,
  WeekendIcon,
} from "./icons";

const SkeletonRow = () => (
  <div className="lesson lesson--skeleton" aria-hidden="true">
    <div className="lesson__times">
      <span className="shimmer shimmer--time" />
      <span className="shimmer shimmer--time" />
    </div>
    <div className="lesson__rail">
      <span className="lesson__node lesson__node--empty" />
      <span className="lesson__thread" />
    </div>
    <div className="lesson__body">
      <span className="shimmer shimmer--title" />
      <span className="shimmer shimmer--meta" />
    </div>
  </div>
);

const EmptyState = ({ icon: Glyph, title, body, action }) => (
  <div className="empty">
    <Glyph size={40} className="empty__icon" />
    <h3 className="empty__title">{title}</h3>
    <p className="empty__body">{body}</p>
    {action}
  </div>
);

const RefreshButton = ({ onRefresh, isLoading }) => {
  const [spinning, setSpinning] = useState(false);

  const handleClick = () => {
    if (spinning || isLoading) return;
    setSpinning(true);
    onRefresh();
    setTimeout(() => setSpinning(false), 900);
  };

  return (
    <button
      className={`icon-btn ${spinning || isLoading ? "is-spinning" : ""}`}
      onClick={handleClick}
      aria-label="Refresh schedule"
    >
      <RefreshIcon size={17} />
    </button>
  );
};

/** The live marker, shown when the clock isn't inside a lesson. */
const NowMarker = ({ now }) => (
  <div className="now-marker">
    <span className="now-marker__dot" />
    <span className="now-marker__rule" />
    <span className="now-marker__time">{now.format("HH:mm")}</span>
  </div>
);

const BreakRow = ({ minutes, isNow }) => (
  <div className={`break ${isNow ? "break--now" : ""}`}>
    <span className="break__thread" aria-hidden="true" />
    <span className="break__label">
      {formatDuration(minutes)} break{isNow ? " · now" : ""}
    </span>
  </div>
);

const ScheduleView = ({
  date,
  lectures,
  isLoading,
  selectedGroup,
  getLectureChange,
  onSelectGroup,
  onRefresh,
}) => {
  const now = useNow();
  const day = moment(date, "YYYY-MM-DD");
  const isToday = day.isSame(now, "day");
  const isWeekend = day.day() === 0 || day.day() === 6;

  const relative = isToday
    ? "Today"
    : day.isSame(moment(now).add(1, "day"), "day")
    ? "Tomorrow"
    : day.isSame(moment(now).subtract(1, "day"), "day")
    ? "Yesterday"
    : null;

  const rows = useMemo(
    () => buildTimeline(lectures, date, now),
    [lectures, date, now]
  );
  const nowPlacement = getNowPlacement(rows, date, now);

  const count = lectures?.length ?? 0;
  const hasGroup = !!selectedGroup;
  const showCount = hasGroup && lectures && !isLoading;

  return (
    <section className="day">
      <header className="day__head">
        <div className="day__title-block">
          {relative && <span className="day__relative">{relative}</span>}
          <h2 className="day__name">{day.format("dddd")}</h2>
          <p className="day__date">{day.format("D MMMM YYYY")}</p>
        </div>

        <div className="day__actions">
          {showCount && (
            <span className="day__count">
              {count > 0 ? `${count} ${count === 1 ? "class" : "classes"}` : "Free"}
            </span>
          )}
          {hasGroup && <RefreshButton onRefresh={onRefresh} isLoading={isLoading} />}
        </div>
      </header>

      <div className="day__body">
        {!hasGroup ? (
          <EmptyState
            icon={SelectGroupIcon}
            title="Pick your group"
            body="Choose your study group and your week appears here."
            action={
              <button className="btn btn--primary" onClick={onSelectGroup}>
                Choose group
              </button>
            }
          />
        ) : isLoading ? (
          <div className="rail">
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
          </div>
        ) : count > 0 ? (
          <div className="rail" key={date}>
            {nowPlacement === "before" && <NowMarker now={now} />}
            {rows.map((row, i) =>
              row.kind === "break" ? (
                <BreakRow key={`b${i}`} minutes={row.minutes} isNow={row.isNow} />
              ) : (
                <LectureCard
                  key={`${row.lecture.periodno}-${row.lecture.starttime}`}
                  row={row}
                  change={getLectureChange(row.lecture)}
                />
              )
            )}
            {nowPlacement === "after" && <NowMarker now={now} />}
          </div>
        ) : isWeekend ? (
          <EmptyState
            icon={WeekendIcon}
            title="Weekend"
            body="Nothing scheduled. The week picks up on Monday."
          />
        ) : (
          <EmptyState
            icon={FreeDayIcon}
            title="No classes"
            body={`Nothing scheduled for ${day.format("dddd")}.`}
          />
        )}
      </div>
    </section>
  );
};

export default ScheduleView;
