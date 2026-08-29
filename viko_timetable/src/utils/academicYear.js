import moment from "moment";

// EduPage scopes every dataset (timetable, groups, subjects, teachers) to an
// academic year. The year label is the calendar year the autumn semester
// starts in, so 2026-09-03 and 2027-01-15 both belong to year 2026.
const ACADEMIC_YEAR_START_MONTH = 7; // August (moment months are 0-indexed)

export const getAcademicYear = (date) => {
  const m = moment(date);
  return m.month() >= ACADEMIC_YEAR_START_MONTH ? m.year() : m.year() - 1;
};
