import { lightenHexToRgb } from "../utils/lightenColor";

const LectureCard = ({ lecture, change }) => {
  const isCancelled = change?.auditorija === "-";
  const hasRoomChange = change && change.auditorija && change.auditorija !== "-";

  const accentColor = lecture.color?.startsWith("#")
    ? lecture.color
    : `#${lecture.color}`;

  const cardBg = lightenHexToRgb(
    accentColor.replace("#", "").length === 6 ? accentColor : "#6366f1",
    0.88
  );

  return (
    <div
      className={`lcard ${isCancelled ? "lcard--cancelled" : ""} ${lecture.changed ? "lcard--changed" : ""}`}
      style={{ "--accent": accentColor, "--card-bg": cardBg }}
    >
      {/* Col 1: Period number */}
      <div className="lcard-col-period">
        <div className="lcard-period-bubble">{lecture.periodno}</div>
      </div>

      {/* Divider */}
      <div className="lcard-divider" />

      {/* Col 2: Time */}
      <div className="lcard-col-time">
        <span className="lcard-time-start">{lecture.starttime}</span>
        <span className="lcard-time-dot" />
        <span className="lcard-time-end">{lecture.endtime}</span>
      </div>

      {/* Divider */}
      <div className="lcard-divider" />

      {/* Col 3: Subject + meta */}
      <div className="lcard-col-body">
        <div className="lcard-subject-row">
          <h3 className={`lcard-subject ${isCancelled ? "lcard-subject--cancelled" : ""}`}>
            {lecture.subject}
          </h3>
          {lecture.subgroup && (
            <span className="lcard-subgroup-badge">{lecture.subgroup}</span>
          )}
          {lecture.changed && !isCancelled && (
            <span className="lcard-badge lcard-badge--changed">Changed</span>
          )}
          {isCancelled && (
            <span className="lcard-badge lcard-badge--cancelled">Cancelled</span>
          )}
        </div>

        <div className="lcard-meta">
          {/* Room */}
          <span className="lcard-meta-item">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
            {isCancelled ? (
              <span className="lcard-text--danger">Cancelled</span>
            ) : hasRoomChange ? (
              <>
                <del className="lcard-text--del">{lecture.classroom}</del>
                <span className="lcard-text--warn">{change.auditorija}</span>
              </>
            ) : (
              <span>{lecture.classroom}</span>
            )}
          </span>

          {/* Teacher */}
          <span className="lcard-meta-item">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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

      {/* Left accent bar */}
      <div className="lcard-accent-bar" style={{ backgroundColor: accentColor }} />
    </div>
  );
};

export default LectureCard;
