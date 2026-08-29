/**
 * Single source for line icons. All share a 24px grid, 1.75 stroke and
 * currentColor so they inherit weight and hue from their context.
 */
const Icon = ({ children, size = 16, ...rest }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.75"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    focusable="false"
    {...rest}
  >
    {children}
  </svg>
);

export const RoomIcon = (p) => (
  <Icon {...p}>
    <path d="M3 21h18" />
    <path d="M5 21V7l7-4 7 4v14" />
    <path d="M10 21v-5h4v5" />
  </Icon>
);

export const TeacherIcon = (p) => (
  <Icon {...p}>
    <circle cx="12" cy="8" r="3.25" />
    <path d="M5 20a7 7 0 0 1 14 0" />
  </Icon>
);

export const RefreshIcon = (p) => (
  <Icon {...p}>
    <path d="M20.5 12a8.5 8.5 0 1 1-2.6-6.1" />
    <path d="M20.5 4.5V10H15" />
  </Icon>
);

export const ChevronLeft = (p) => (
  <Icon {...p}>
    <path d="M14.5 5 8 12l6.5 7" />
  </Icon>
);

export const ChevronRight = (p) => (
  <Icon {...p}>
    <path d="M9.5 5 16 12l-6.5 7" />
  </Icon>
);

export const ChevronDown = (p) => (
  <Icon {...p}>
    <path d="M6 9.5 12 15l6-5.5" />
  </Icon>
);

export const CloseIcon = (p) => (
  <Icon {...p}>
    <path d="M18 6 6 18M6 6l12 12" />
  </Icon>
);

export const SearchIcon = (p) => (
  <Icon {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="M20 20l-3.8-3.8" />
  </Icon>
);

export const CheckIcon = (p) => (
  <Icon {...p}>
    <path d="M20 6 9 17l-5-5" />
  </Icon>
);

/** Empty day — an open, cleared timetable grid. */
export const FreeDayIcon = (p) => (
  <Icon {...p} strokeWidth="1.25">
    <rect x="3" y="5" width="18" height="16" rx="2.5" />
    <path d="M3 10h18M8 3v4M16 3v4" />
    <path d="M8.5 15.5 11 18l4.5-4.5" />
  </Icon>
);

/** Weekend — the grid at rest, with the week's end marked out. */
export const WeekendIcon = (p) => (
  <Icon {...p} strokeWidth="1.25">
    <rect x="3" y="5" width="18" height="16" rx="2.5" />
    <path d="M3 10h18M8 3v4M16 3v4" />
    <path d="M15 14h3M15 17h3" opacity="0.45" />
    <path d="M6 14h5M6 17h5" opacity="0.45" />
  </Icon>
);

/** No group chosen — a timetable waiting to be filled. */
export const SelectGroupIcon = (p) => (
  <Icon {...p} strokeWidth="1.25">
    <rect x="3" y="5" width="18" height="16" rx="2.5" />
    <path d="M3 10h18M8 3v4M16 3v4" />
    <path d="M12 13.5v4M10 15.5h4" />
  </Icon>
);

export const OfflineIcon = (p) => (
  <Icon {...p}>
    <path d="M12 18h.01" />
    <path d="M8.5 14.5a5 5 0 0 1 7 0" />
    <path d="M5 11a10 10 0 0 1 14 0" />
    <path d="M3 3l18 18" />
  </Icon>
);

export default Icon;
