import moment from "moment";
import { useContext, useEffect, useMemo, useState } from "react";
import { Route, Routes, useSearchParams } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { AppContext } from "./context/AppContext";
import { db, limitToLast, onValue, orderByChild, query, ref } from "./firebaseConfig";
import { getPayload } from "./payloads";
import useFetch from "./useFetch";
import { getAcademicYear } from "./utils/academicYear";

import BottomNav from "./components/BottomNav";
import InstallPrompt from "./components/InstallPrompt";
import GroupModal from "./components/GroupModal";
import Header from "./components/Header";
import ScheduleView from "./components/ScheduleView";
import WeekStrip from "./components/WeekStrip";

const today = () => moment().format("YYYY-MM-DD");

const App = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { API_URL } = useContext(AppContext);

  // Date state — a shared link may deep-link to a specific day, otherwise today
  const [date, setDate] = useState(() => {
    const shared = searchParams.get("date");
    return shared && moment(shared, "YYYY-MM-DD", true).isValid()
      ? shared
      : today();
  });

  // Drop the deep-linked date from the URL once consumed, so a later reload or
  // PWA relaunch of this same URL opens on today instead of a stale day.
  useEffect(() => {
    if (!searchParams.get("date")) return;
    const next = new URLSearchParams(searchParams);
    next.delete("date");
    setSearchParams(next, { replace: true });
  }, []);

  // Reopening the app always lands on today. An earlier version only reset
  // when the calendar day had changed, which left the week strip showing an
  // old week whenever someone browsed another date and came back the same day.
  useEffect(() => {
    const syncToToday = () => setDate(today());

    const onVisible = () => {
      if (document.visibilityState === "visible") syncToToday();
    };

    // visibilitychange covers app resume and tab switching; pageshow covers
    // bfcache restores, which is how mobile PWAs usually return to the front
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("pageshow", syncToToday);

    // Fire exactly at the next midnight, then reschedule
    let timer;
    const scheduleAtMidnight = () => {
      const msUntilMidnight = moment().endOf("day").add(1, "ms").diff(moment());
      timer = setTimeout(() => {
        syncToToday();
        scheduleAtMidnight();
      }, msUntilMidnight);
    };
    scheduleAtMidnight();

    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("pageshow", syncToToday);
      clearTimeout(timer);
    };
  }, []);

  // Group state — from localStorage or null (triggers modal)
  const [selectedGroup, setSelectedGroup] = useState(() => {
    const saved = localStorage.getItem("selected_group");
    return saved ? JSON.parse(saved) : null;
  });

  // A shared ?group= link resolves on its own once the group list lands, so
  // don't open the picker over it.
  const [showGroupModal, setShowGroupModal] = useState(
    () => !localStorage.getItem("selected_group") && !searchParams.get("group")
  );

  // Refresh key — increment to force re-fetch
  const [refreshKey, setRefreshKey] = useState(0);

  // Metadata: teachers, subjects, classrooms, groups
  const [teachers, setTeachers] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [classrooms, setClassrooms] = useState([]);
  // Bootstrap list for the group picker only — its ids are NOT trustworthy,
  // because EduPage re-assigns group ids every academic year.
  const [fallbackGroups, setFallbackGroups] = useState([]);
  // Authoritative, year-scoped groups from /all. Ids here are safe to use.
  const [yearGroups, setYearGroups] = useState([]);
  const [groupsLoading, setGroupsLoading] = useState(false);

  // Firebase changed lectures
  const [changedLectures, setChangedLectures] = useState([]);

  // Every EduPage dataset is scoped to an academic year, derived from the date
  const academicYear = useMemo(() => getAcademicYear(date), [date]);
  const groupsCacheKey = `groups_list_${academicYear}`;

  // Fetch metadata (week range for the currently viewed date)
  const weekStart = moment(date).startOf("isoWeek").format("YYYY-MM-DD");
  const weekEnd = moment(date).endOf("isoWeek").format("YYYY-MM-DD");

  // The strip can be swiped a week either side, so pull those too — their
  // class-count dots are then already there when the week comes into view.
  const rangeStart = moment(weekStart).subtract(1, "week").format("YYYY-MM-DD");
  const rangeEnd = moment(weekEnd).add(1, "week").format("YYYY-MM-DD");

  const { data: allInfo } = useFetch(
    `${API_URL}/all`,
    getPayload(weekStart, weekEnd, true, undefined, academicYear),
    `${weekStart}:${academicYear}`,
    undefined,
    refreshKey
  );

  // Group ids differ per academic year, so always resolve the saved group by
  // its short code against this year's list rather than trusting a cached id.
  const resolvedGroupId = useMemo(() => {
    if (!selectedGroup) return null;
    return (
      yearGroups.find((g) => g.short === selectedGroup.short)?.id || null
    );
  }, [yearGroups, selectedGroup]);

  // Fetch three weeks in one request, then slice by day locally. Switching
  // days and swiping weeks become instant, and it gives the week strip real
  // per-day class counts instead of a blind row of numbers.
  const { data: currentData, loading: currentLoading } = useFetch(
    resolvedGroupId ? `${API_URL}/current` : null,
    getPayload(rangeStart, rangeEnd, false, resolvedGroupId, academicYear),
    `${weekStart}:${academicYear}`,
    resolvedGroupId,
    refreshKey
  );

  // Parse metadata from /all response
  useEffect(() => {
    if (!allInfo) return;

    const tables = allInfo?.r?.tables || [];

    // Helper: get rows for a table
    const rows = (t) => t?.data_rows || [];

    // Strategy 1: EduPage sometimes exposes a table `id` field ("teachers", "classes", etc.)
    const byId = (name) => tables.find((t) => t?.id === name || t?.type === name);

    let teacherTable   = byId("teachers");
    let groupTable     = byId("classes");
    let classroomTable = byId("classrooms");
    let subjectTable   = byId("subjects");

    // Strategy 2: Content-based detection (fallback when no table id field)
    if (!teacherTable) {
      // Teachers are the only rows that have firstname/lastname fields
      teacherTable = tables.find((t) => rows(t).some((r) => "firstname" in r));
    }
    if (!groupTable) {
      // Groups: short codes with 2+ letter prefix + 2-digit year, e.g. PI24E, EI23A, IS24SN
      // Must NOT be a classroom code (classrooms: single letter + 3 digits, e.g. A101)
      groupTable = tables.find((t) =>
        t !== teacherTable &&
        rows(t).some((r) => /^[A-Z]{2,}\d{2}/.test(r.short || ""))
      );
    }
    if (!classroomTable) {
      // Classrooms: single-letter prefix + digits (A101, B203) OR pure alphanumeric short codes
      // that are NOT group codes and NOT long names
      classroomTable = tables.find((t) =>
        t !== teacherTable &&
        t !== groupTable &&
        rows(t).every((r) => !(r.name || "").includes(" ")) &&
        rows(t).some((r) => /^[A-Z]\d+/.test(r.short || ""))
      );
    }
    if (!subjectTable) {
      // Subjects: the only remaining table (has long names with spaces)
      subjectTable = tables.find(
        (t) => t !== teacherTable && t !== groupTable && t !== classroomTable
      );
    }

    const allTeachers   = rows(teacherTable);
    const allGroups     = rows(groupTable);
    const allClassrooms = rows(classroomTable);
    const allSubjects   = rows(subjectTable);

    setTeachers(allTeachers);
    setSubjects(allSubjects);
    setClassrooms(allClassrooms);

    if (allGroups.length > 0) {
      setYearGroups(allGroups);
      localStorage.setItem(groupsCacheKey, JSON.stringify(allGroups));
    }
  }, [allInfo, groupsCacheKey]);

  // Seed this year's groups from cache while /all is in flight
  useEffect(() => {
    const cached = localStorage.getItem(groupsCacheKey);
    setYearGroups(cached ? JSON.parse(cached) : []);
  }, [groupsCacheKey]);

  // Load groups from bundled static file — instant, no backend needed.
  // Picker bootstrap only: these ids belong to an older year and are discarded
  // as soon as the year-scoped list arrives.
  useEffect(() => {
    setGroupsLoading(true);
    fetch("/data/groups.json")
      .then((r) => r.json())
      .then((data) => {
        if (data?.length > 0) setFallbackGroups(data);
      })
      .catch(() => {})
      .finally(() => setGroupsLoading(false));
  }, []);

  // What the picker shows: this year's real groups, else the bootstrap list
  const groups = yearGroups.length > 0 ? yearGroups : fallbackGroups;

  // Parse the whole week's timetable items into lectures keyed by date.
  // Labels fall back to placeholders rather than blocking on metadata, so
  // cards always render.
  const weekLectures = useMemo(() => {
    if (!currentData?.r?.ttitems) return null;

    // EduPage mixes real lessons ("card") with non-lesson markers such as
    // whole-day "out" placeholders — keep only actual lessons.
    const cards = currentData.r.ttitems.filter((lec) => lec.type === "card");

    // Coerce all IDs to strings — EduPage mixes number/string IDs across endpoints
    const subjectMap   = new Map(subjects.map((s)   => [String(s.id), s]));
    const classroomMap = new Map(classrooms.map((c)  => [String(c.id), c]));
    const teacherMap   = new Map(teachers.map((t)    => [String(t.id), t]));

    // A lesson can span several rooms and several lecturers ("104, 104A") —
    // show all of them, not just the first.
    const namesFor = (ids, map, key) =>
      (ids || [])
        .map((id) => map.get(String(id))?.[key])
        .filter(Boolean)
        .join(", ");

    const byDate = {};

    cards.forEach((lec) => {
      const sid = String(lec.subjectid ?? lec.subjectids?.[0] ?? "");
      // EduPage uses both plural (classroomids) and singular (classroomid) names
      const roomIds = lec.classroomids ?? (lec.classroomid ? [lec.classroomid] : []);
      const teacherIds = lec.teacherids ?? (lec.teacherid ? [lec.teacherid] : []);
      const firstTeacher = teacherMap.get(String(teacherIds[0]));

      const entry = {
        subject:
          subjectMap.get(sid)?.name ||
          subjectMap.get(sid)?.short ||
          "Unknown subject",
        subjectShort: subjectMap.get(sid)?.short || "?",
        classroom: namesFor(roomIds, classroomMap, "short") || "–",
        teacher: namesFor(teacherIds, teacherMap, "short") || "–",
        teacherFull:
          namesFor(teacherIds, teacherMap, "short") ||
          [firstTeacher?.firstname, firstTeacher?.lastname]
            .filter(Boolean)
            .join(" ") ||
          "–",
        date: lec.date,
        starttime: lec.starttime,
        endtime: lec.endtime,
        periodno: lec.uniperiod,
        color: lec.colors?.[0] || null,
        changed: lec.changed || false,
        subgroup: lec.groupnames?.[0] || null,
      };

      (byDate[lec.date] ||= []).push(entry);
    });

    Object.values(byDate).forEach((day) =>
      day.sort((a, b) => a.starttime.localeCompare(b.starttime))
    );

    return byDate;
  }, [currentData, subjects, classrooms, teachers]);

  const lectures = useMemo(
    () => (weekLectures ? weekLectures[date] || [] : null),
    [weekLectures, date]
  );

  // Per-day class counts drive the load dots in the week strip
  const weekCounts = useMemo(() => {
    if (!weekLectures) return {};
    return Object.fromEntries(
      Object.entries(weekLectures).map(([d, list]) => [d, list.length])
    );
  }, [weekLectures]);

  // Check if a lecture has a room/teacher change from Firebase
  const getLectureChange = (lecture) => {
    return changedLectures.find((p) => p.paskaita === lecture.periodno) || null;
  };

  // Firebase: listen for changed lectures for current date/group
  useEffect(() => {
    const dbRef = ref(db, "user-posts/");
    const orderedQuery = query(dbRef, orderByChild("paskaita"), limitToLast(50));

    const unsub = onValue(orderedQuery, (snapshot) => {
      const posts = [];
      const targetDate = moment(date, "YYYY-MM-DD").format("ddd MMM DD YYYY");
      snapshot.forEach((child) => {
        const val = child.val();
        if (
          moment(val.date, "ddd MMM DD YYYY").isSame(targetDate, "day") &&
          val.grupe?.replace(/<[^>]*>/g, "").includes(selectedGroup?.short || "")
        ) {
          posts.push(val);
        }
      });
      setChangedLectures(posts);
    });

    return () => unsub();
  }, [date, selectedGroup]);

  // Sync URL params. The viewed date is deliberately NOT persisted here: the
  // browser and PWA relaunch the last URL, so a stored date would reopen the
  // app on a stale day.
  useEffect(() => {
    if (selectedGroup) {
      setSearchParams({ group: selectedGroup.short }, { replace: true });
    }
  }, [selectedGroup]);

  // Handle URL group param on load (URL overrides, e.g. shared link)
  useEffect(() => {
    if (groups.length === 0) return;
    const paramGroup = searchParams.get("group");
    if (paramGroup) {
      const found = groups.find((g) => g.short === paramGroup.toUpperCase());
      if (found) handleSelectGroup(found);
    }
  }, [groups]);

  const handleSelectGroup = (group) => {
    setSelectedGroup(group);
    localStorage.setItem("selected_group", JSON.stringify(group));
    setShowGroupModal(false);
  };

  const handleRefresh = () => {
    setRefreshKey((k) => k + 1);
  };

  const navigateDate = (direction) => {
    const newDate = moment(date).add(direction, "days").format("YYYY-MM-DD");
    setDate(newDate);
  };

  const goToToday = () => setDate(today());

  // Also "loading" while this year's group list (needed to resolve the id)
  // has not arrived yet
  const isLoading =
    !!selectedGroup && (currentLoading || yearGroups.length === 0);

  return (
    <div className="app-root">
      {/* Brand row and week strip share one full-bleed sticky bar, so there
          is a single backdrop rather than two overlapping panels. */}
      <div className="appbar">
        <Header
          selectedGroup={selectedGroup}
          onChangeGroup={() => setShowGroupModal(true)}
        />
        <WeekStrip
          currentDate={date}
          onSelectDate={setDate}
          weekCounts={weekCounts}
        />
      </div>

      <main className="main-content">
        <ScheduleView
          date={date}
          lectures={lectures}
          isLoading={isLoading}
          selectedGroup={selectedGroup}
          getLectureChange={getLectureChange}
          onSelectGroup={() => setShowGroupModal(true)}
          onRefresh={handleRefresh}
          refreshKey={refreshKey}
        />
      </main>

      <BottomNav
        date={date}
        onPrev={() => navigateDate(-1)}
        onNext={() => navigateDate(1)}
        onToday={goToToday}
      />

      {showGroupModal && (
        <GroupModal
          groups={groups}
          groupsLoading={groupsLoading}
          selectedGroup={selectedGroup}
          onSelect={handleSelectGroup}
          onClose={selectedGroup ? () => setShowGroupModal(false) : null}
        />
      )}

      <InstallPrompt />

      <ToastContainer
        position="top-center"
        autoClose={2500}
        hideProgressBar
        closeOnClick
        draggable
        theme="dark"
        toastClassName="toast-custom"
      />
    </div>
  );
};

const AppWithRoutes = () => (
  <Routes>
    <Route path="*" element={<App />} />
  </Routes>
);

export default AppWithRoutes;
