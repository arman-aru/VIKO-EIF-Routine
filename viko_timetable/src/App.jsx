import moment from "moment";
import { useContext, useEffect, useMemo, useState } from "react";
import { Route, Routes, useSearchParams } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { AppContext } from "./context/AppContext";
import { db, limitToLast, onValue, orderByChild, query, ref } from "./firebaseConfig";
import { getPayload } from "./payloads";
import useFetch from "./useFetch";

import BottomNav from "./components/BottomNav";
import InstallPrompt from "./components/InstallPrompt";
import GroupModal from "./components/GroupModal";
import Header from "./components/Header";
import ScheduleView from "./components/ScheduleView";
import WeekStrip from "./components/WeekStrip";

const App = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { API_URL } = useContext(AppContext);

  // Date state — from URL or today
  const [date, setDate] = useState(() => {
    const d = searchParams.get("date");
    return d ? moment(d).format("YYYY-MM-DD") : moment().format("YYYY-MM-DD");
  });

  // Auto-reset to today when:
  // 1. App comes back from background (user reopens PWA)
  // 2. Midnight passes while app is open
  useEffect(() => {
    const today = () => moment().format("YYYY-MM-DD");

    // When tab/app becomes visible again, check if day changed
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        setDate((prev) => (prev !== today() ? today() : prev));
      }
    };
    document.addEventListener("visibilitychange", onVisible);

    // Schedule a timer to fire exactly at the next midnight
    const scheduleAtMidnight = () => {
      const now = moment();
      const msUntilMidnight =
        moment().endOf("day").add(1, "ms").diff(now);
      return setTimeout(() => {
        setDate(today());
        scheduleAtMidnight(); // reschedule for the next midnight
      }, msUntilMidnight);
    };
    const timer = scheduleAtMidnight();

    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      clearTimeout(timer);
    };
  }, []);

  // Group state — from localStorage or null (triggers modal)
  const [selectedGroup, setSelectedGroup] = useState(() => {
    const saved = localStorage.getItem("selected_group");
    return saved ? JSON.parse(saved) : null;
  });

  const [showGroupModal, setShowGroupModal] = useState(!localStorage.getItem("selected_group"));

  // Refresh key — increment to force re-fetch
  const [refreshKey, setRefreshKey] = useState(0);

  // Metadata: teachers, subjects, classrooms, groups
  const [teachers, setTeachers] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [classrooms, setClassrooms] = useState([]);
  const [groups, setGroups] = useState(() => {
    // v2: invalidate old cache that may have contained subjects instead of groups
    const version = localStorage.getItem("groups_list_v");
    if (version !== "2") {
      localStorage.removeItem("groups_list");
      localStorage.setItem("groups_list_v", "2");
    }
    const cached = localStorage.getItem("groups_list");
    return cached ? JSON.parse(cached) : [];
  });
  const [groupsLoading, setGroupsLoading] = useState(false);

  // Firebase changed lectures
  const [changedLectures, setChangedLectures] = useState([]);

  // Fetch metadata (week range for the currently viewed date)
  const weekStart = moment(date).startOf("isoWeek").format("YYYY-MM-DD");
  const weekEnd = moment(date).endOf("isoWeek").format("YYYY-MM-DD");

  const { data: allInfo } = useFetch(
    `${API_URL}/all`,
    getPayload(weekStart, weekEnd, true),
    date,
    undefined,
    refreshKey
  );

  // Fetch current day timetable for selected group
  const { data: currentData, loading: currentLoading } = useFetch(
    `${API_URL}/current`,
    getPayload(date, date, false, selectedGroup?.id || "-910"),
    date,
    selectedGroup?.id,
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
      setGroups(allGroups);
      localStorage.setItem("groups_list", JSON.stringify(allGroups));
    }
  }, [allInfo]);

  // Load groups from bundled static file — instant, no backend needed.
  // This runs on first visit (no localStorage cache) before the API responds.
  useEffect(() => {
    if (groups.length > 0) return;
    setGroupsLoading(true);
    fetch("/data/groups.json")
      .then((r) => r.json())
      .then((data) => {
        if (data?.length > 0) {
          setGroups(data);
          localStorage.setItem("groups_list", JSON.stringify(data));
        }
      })
      .catch(() => {})
      .finally(() => setGroupsLoading(false));
  }, []);

  // Parse timetable items — don't block on subjects being loaded,
  // fall back to "Unknown" labels so cards always appear
  const lectures = useMemo(() => {
    if (!currentData?.r?.ttitems) return null;

    // DEBUG: log first timetable item to verify field names (remove after confirming)
    if (currentData.r.ttitems.length > 0) {
      console.log("[DEBUG] ttitem sample:", currentData.r.ttitems[0]);
      console.log("[DEBUG] teachers count:", teachers.length, "classrooms count:", classrooms.length);
    }

    // Coerce all IDs to strings — EduPage mixes number/string IDs across endpoints
    const subjectMap   = new Map(subjects.map((s)   => [String(s.id), s]));
    const classroomMap = new Map(classrooms.map((c)  => [String(c.id), c]));
    const teacherMap   = new Map(teachers.map((t)    => [String(t.id), t]));

    return currentData.r.ttitems.map((lec) => {
      const sid = String(lec.subjectid ?? lec.subjectids?.[0] ?? "");
      // EduPage uses both plural (classroomids) and singular (classroomid) field names
      const cid = String(
        lec.classroomids?.[0] ?? lec.classroomid ?? ""
      );
      const tid = String(
        lec.teacherids?.[0] ?? lec.teacherid ?? ""
      );
      const teacher = teacherMap.get(tid);
      return ({
      subject:
        subjectMap.get(sid)?.name ||
        subjectMap.get(sid)?.short ||
        lec.subjectid ||
        "Unknown",
      subjectShort: subjectMap.get(sid)?.short || "?",
      classroom: classroomMap.get(cid)?.short || "–",
      teacher: teacher?.short || "–",
      teacherFull:
        [teacher?.firstname, teacher?.lastname].filter(Boolean).join(" ") ||
        teacher?.short || "–",
      date: lec.date,
      starttime: lec.starttime,
      endtime: lec.endtime,
      periodno: lec.uniperiod,
      color: lec.colors?.[0] || "#6366f1",
      changed: lec.changed || false,
      subgroup: lec.groupnames?.[0] || null,
    });});
  }, [currentData, subjects, classrooms, teachers]);

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

  // Sync URL params
  useEffect(() => {
    if (selectedGroup) {
      setSearchParams({ date, group: selectedGroup.short }, { replace: true });
    }
  }, [date, selectedGroup]);

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

  const goToToday = () => setDate(moment().format("YYYY-MM-DD"));

  const isLoading = !!selectedGroup && currentLoading;

  return (
    <div className="app-root">
      <Header
        selectedGroup={selectedGroup}
        onChangeGroup={() => setShowGroupModal(true)}
      />

      <main className="main-content">
        <WeekStrip currentDate={date} onSelectDate={setDate} />

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
