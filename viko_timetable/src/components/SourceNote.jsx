import { VerifiedIcon } from "./icons";

const OFFICIAL_TIMETABLE_URL = "https://vikoeif.edupage.org/timetable/";

/** States where the timetable comes from, so students can check it themselves. */
const SourceNote = () => (
  <p className="source-note">
    <VerifiedIcon size={15} className="source-note__icon" />
    <span>
      All data comes directly from the official VIKO EIF timetable:{" "}
      <a
        className="source-note__link"
        href={OFFICIAL_TIMETABLE_URL}
        target="_blank"
        rel="noopener noreferrer"
      >
        vikoeif.edupage.org/timetable
      </a>
    </span>
  </p>
);

export default SourceNote;
