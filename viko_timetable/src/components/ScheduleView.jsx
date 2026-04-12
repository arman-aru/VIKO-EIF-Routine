import moment from "moment";
import { useState } from "react";
import LectureCard from "./LectureCard";

const SkeletonCard = () => (
  <div className="skeleton-card">
    <div className="skeleton-left">
      <div className="skeleton-box skeleton-period" />
      <div className="skeleton-box skeleton-time" />
      <div className="skeleton-box skeleton-time" />
    </div>
    <div className="skeleton-body">
      <div className="skeleton-box skeleton-title" />
      <div className="skeleton-box skeleton-meta" />
    </div>
  </div>
);

const EmptyState = ({ isWeekend, onSelectGroup, noGroup }) => {
  if (noGroup) {
    return (
      <div className="empty-state">
        <div className="empty-icon">🎓</div>
        <h3 className="empty-title">Welcome to VIKO EIF Timetable</h3>
        <p className="empty-desc">Select your study group to view your schedule</p>
        <button className="btn-primary" onClick={onSelectGroup}>
          Choose My Group
        </button>
      </div>
    );
  }

  if (isWeekend) {
    return (
      <div className="empty-state">
        <div className="empty-icon">🌿</div>
        <h3 className="empty-title">Weekend!</h3>
        <p className="empty-desc">No classes today. Time to rest and recharge.</p>
      </div>
    );
  }

  return (
    <div className="empty-state">
      <div className="empty-icon">✨</div>
      <h3 className="empty-title">No classes today</h3>
      <p className="empty-desc">Enjoy your free day!</p>
    </div>
  );
};

const RefreshButton = ({ onRefresh, isLoading }) => {
  const [spinning, setSpinning] = useState(false);

  const handleClick = () => {
    if (spinning || isLoading) return;
    setSpinning(true);
    onRefresh();
    setTimeout(() => setSpinning(false), 1000);
  };

  return (
    <button
      className={`refresh-btn ${spinning || isLoading ? "refresh-btn--spinning" : ""}`}
      onClick={handleClick}
      title="Refresh schedule"
      aria-label="Refresh schedule"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <polyline points="23 4 23 10 17 10" />
        <polyline points="1 20 1 14 7 14" />
        <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
      </svg>
    </button>
  );
};

const ScheduleView = ({
  date,
  lectures,
  isLoading,
  selectedGroup,
  getLectureChange,
  onSelectGroup,
  onRefresh,
}) => {
  const dayMoment = moment(date, "YYYY-MM-DD");
  const isToday = dayMoment.isSame(moment(), "day");
  const isTomorrow = dayMoment.isSame(moment().add(1, "day"), "day");
  const isYesterday = dayMoment.isSame(moment().subtract(1, "day"), "day");
  const isWeekend = dayMoment.day() === 0 || dayMoment.day() === 6;

  const dayLabel = isToday
    ? "Today"
    : isTomorrow
    ? "Tomorrow"
    : isYesterday
    ? "Yesterday"
    : null;

  const noGroup = !selectedGroup;

  return (
    <div className="schedule-view">
      {/* Date heading */}
      <div className="schedule-date-header">
        <div className="schedule-date-main">
          {dayLabel && <span className="day-label">{dayLabel}</span>}
          <h2 className="schedule-date-text">{dayMoment.format("dddd")}</h2>
          <span className="schedule-date-full">
            {dayMoment.format("MMMM D, YYYY")}
          </span>
        </div>

        <div className="schedule-header-right">
          {!noGroup && lectures && !isLoading && (
            <div className="lecture-count-badge">
              {lectures.length > 0
                ? `${lectures.length} class${lectures.length !== 1 ? "es" : ""}`
                : "Free day"}
            </div>
          )}
          {!noGroup && (
            <RefreshButton onRefresh={onRefresh} isLoading={isLoading} />
          )}
        </div>
      </div>

      {/* Content */}
      <div className="schedule-list">
        {noGroup ? (
          <EmptyState noGroup onSelectGroup={onSelectGroup} />
        ) : isLoading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : lectures && lectures.length > 0 ? (
          lectures.map((lecture, i) => (
            <LectureCard
              key={i}
              lecture={lecture}
              change={getLectureChange(lecture)}
            />
          ))
        ) : (
          <EmptyState isWeekend={isWeekend} />
        )}
      </div>
    </div>
  );
};

export default ScheduleView;
