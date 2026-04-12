import { lightenHexToRgb } from "../utils/lightenColor";

const LectureCard = ({ lecture, change }) => {
  const isCancelled = change?.auditorija === "-";
  const hasRoomChange = change && change.auditorija && change.auditorija !== "-";

  // Convert hex color to a subtle background tint
  const accentColor = lecture.color?.startsWith("#")
    ? lecture.color
    : `#${lecture.color}`;

  const cardBg = lightenHexToRgb(
    accentColor.replace("#", "").length === 6 ? accentColor : "#6366f1",
    0.88
  );

  return (
    <div
      className={`lecture-card ${isCancelled ? "lecture-card--cancelled" : ""} ${lecture.changed ? "lecture-card--changed" : ""}`}
      style={{ "--accent": accentColor, "--card-bg": cardBg }}
    >
      {/* Left: period number + time */}
      <div className="lcard-left">
        <span className="lcard-period">{lecture.periodno}</span>
        <span className="lcard-time">{lecture.starttime}</span>
        <span className="lcard-time-sep">–</span>
        <span className="lcard-time">{lecture.endtime}</span>
      </div>

      {/* Center: subject + details */}
      <div className="lcard-body">
        <div className="lcard-subject-row">
          <h3 className="lcard-subject">{lecture.subject}</h3>
          {lecture.subgroup && (
            <span className="lcard-subgroup-badge">
              {lecture.subgroup}
            </span>
          )}
        </div>

        <div className="lcard-meta">
          {/* Room */}
          <span className="lcard-meta-item">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
            {isCancelled ? (
              <span className="lcard-cancelled-text">Cancelled</span>
            ) : hasRoomChange ? (
              <>
                <del className="lcard-del">{lecture.classroom}</del>
                <span className="lcard-new-room">{change.auditorija}</span>
              </>
            ) : (
              <span>{lecture.classroom}</span>
            )}
          </span>

          {/* Teacher */}
          <span className="lcard-meta-item">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            <span>
              {hasRoomChange && change.destytojas
                ? change.destytojas
                : lecture.teacherFull || lecture.teacher}
            </span>
          </span>
        </div>
      </div>

      {/* Right: status badges */}
      <div className="lcard-right">
        {isCancelled && (
          <span className="badge badge--cancelled">Cancelled</span>
        )}
        {lecture.changed && !isCancelled && (
          <span className="badge badge--changed">Changed</span>
        )}
      </div>

      {/* Color accent bar on left */}
      <div
        className="lcard-accent-bar"
        style={{ backgroundColor: accentColor }}
      />
    </div>
  );
};

export default LectureCard;
