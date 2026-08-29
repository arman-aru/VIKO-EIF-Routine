import { COUNTDOWN_WINDOW_MINUTES, formatDuration } from "../utils/schedule";
import { RoomIcon, TeacherIcon } from "./icons";

/**
 * One lesson on the time rail: mono times in the left gutter, a period node
 * on the spine, and the lesson body. Live lessons carry a progress bar; the
 * next one up carries a countdown.
 */
const LectureCard = ({ row, change }) => {
  const { lecture, status, progress, minutesUntil, durationMinutes, isNext } = row;

  const isCancelled = change?.auditorija === "-";
  const hasRoomChange = change && change.auditorija && change.auditorija !== "-";
  const isLive = status === "live" && !isCancelled;

  const state = isCancelled
    ? "cancelled"
    : isLive
    ? "live"
    : status === "past"
    ? "past"
    : isNext
    ? "next"
    : "upcoming";

  return (
    <article
      className={`lesson lesson--${state}`}
      style={lecture.color ? { "--subject-hue": lecture.color } : undefined}
      aria-current={isLive ? "time" : undefined}
    >
      {/* Left gutter — start over end, tabular mono */}
      <div className="lesson__times">
        <time className="lesson__start">{lecture.starttime}</time>
        <time className="lesson__end">{lecture.endtime}</time>
      </div>

      {/* The spine, with this lesson's period number as its node */}
      <div className="lesson__rail" aria-hidden="true">
        <span className="lesson__node">{lecture.periodno}</span>
        <span className="lesson__thread" />
      </div>

      <div className="lesson__body">
        <div className="lesson__headline">
          <h3 className="lesson__subject">{lecture.subject}</h3>

          {isLive && (
            <span className="tag tag--live">
              <span className="tag__pulse" />
              Now
            </span>
          )}
          {isNext && !isLive && minutesUntil > 0 &&
            minutesUntil <= COUNTDOWN_WINDOW_MINUTES && (
              <span className="tag tag--next">
                in {formatDuration(minutesUntil)}
              </span>
            )}
          {isCancelled && <span className="tag tag--cancelled">Cancelled</span>}
          {lecture.changed && !isCancelled && (
            <span className="tag tag--changed">Changed</span>
          )}
        </div>

        <dl className="lesson__meta">
          <div className="lesson__meta-item">
            <dt className="sr-only">Room</dt>
            <RoomIcon size={14} />
            <dd>
              {isCancelled ? (
                <span className="text-danger">No room</span>
              ) : hasRoomChange ? (
                <>
                  <del className="text-struck">{lecture.classroom}</del>{" "}
                  <span className="text-warn">{change.auditorija}</span>
                </>
              ) : (
                lecture.classroom
              )}
            </dd>
          </div>

          <div className="lesson__meta-item">
            <dt className="sr-only">Lecturer</dt>
            <TeacherIcon size={14} />
            <dd>
              {hasRoomChange && change.destytojas
                ? change.destytojas
                : lecture.teacherFull || lecture.teacher}
            </dd>
          </div>

          {lecture.subgroup && (
            <div className="lesson__meta-item">
              <dt className="sr-only">Subgroup</dt>
              <dd className="lesson__subgroup">{lecture.subgroup}</dd>
            </div>
          )}
        </dl>

        {isLive && (
          <div
            className="lesson__progress"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(progress * 100)}
            aria-label="Lesson progress"
          >
            <span
              className="lesson__progress-fill"
              style={{ transform: `scaleX(${progress})` }}
            />
            <span className="lesson__progress-label">
              {formatDuration(
                Math.max(0, Math.round(durationMinutes * (1 - progress)))
              )}{" "}
              left
            </span>
          </div>
        )}
      </div>
    </article>
  );
};

export default LectureCard;
