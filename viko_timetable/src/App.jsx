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
  // Identify tables by content — do NOT rely on index order (API may reorder)
  // Groups: short codes like "PI24E", "EI23A" — short <= 8 chars, alphanumeric
  // Teachers: have firstname/lastname fields
  // Classrooms: short codes like "A101", "B203" — short <= 6 chars, no spaces
  // Subjects: long descriptive names with spaces
  useEffect(() => {
    if (!allInfo) return;

    const tables = allInfo?.r?.tables || [];
    const allRows = (i) => tables[i]?.data_rows || [];

    // Find teachers: rows that have a firstname field
    const teacherTable = tables.find((t) =>
      (t?.data_rows || []).some((r) => r.firstname !== undefined)
    );
    // Find groups: rows whose short is 2–8 chars, all alphanumeric, no spaces
    const groupTable = tables.find((t) =>
      (t?.data_rows || []).some((r) => /^[A-Za-z]{1,4}\d{2}/.test(r.short || ""))
    );
    // Find subjects: rows whose name has spaces (long course names)
    const subjectTable = tables.find((t) =>
      t !== teacherTable &&
      t !== groupTable &&
      (t?.data_rows || []).some((r) => (r.name || "").includes(" "))
    );
    // Classrooms: the remaining table
    const classroomTable = tables.find(
      (t) => t !== teacherTable && t !== groupTable && t !== subjectTable
    );

    const allTeachers   = teacherTable?.data_rows   || [];
    const allGroups     = groupTable?.data_rows      || [];
    const allSubjects   = subjectTable?.data_rows    || [];
    const allClassrooms = classroomTable?.data_rows  || [];

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

    const subjectMap = new Map(subjects.map((s) => [s.id, s]));
    const classroomMap = new Map(classrooms.map((c) => [c.id, c]));
    const teacherMap = new Map(teachers.map((t) => [t.id, t]));

    return currentData.r.ttitems.map((lec) => ({
      subject:
        subjectMap.get(lec.subjectid)?.name ||
        subjectMap.get(lec.subjectid)?.short ||
        lec.subjectid ||
        "Unknown",
      subjectShort: subjectMap.get(lec.subjectid)?.short || "?",
      classroom: classroomMap.get(lec.classroomids?.[0])?.short || "–",
      teacher: teacherMap.get(lec.teacherids?.[0])?.short || "–",
      teacherFull:
        [
          teacherMap.get(lec.teacherids?.[0])?.firstname,
          teacherMap.get(lec.teacherids?.[0])?.lastname,
        ]
          .filter(Boolean)
          .join(" ") || teacherMap.get(lec.teacherids?.[0])?.short || "–",
      date: lec.date,
      starttime: lec.starttime,
      endtime: lec.endtime,
      periodno: lec.uniperiod,
      color: lec.colors?.[0] || "#6366f1",
      changed: lec.changed || false,
      subgroup: lec.groupnames?.[0] || null,
    }));
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
