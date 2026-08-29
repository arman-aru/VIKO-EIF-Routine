import { useEffect, useMemo, useRef, useState } from "react";
import { CheckIcon, CloseIcon, SearchIcon } from "./icons";

const DESKTOP_WIDTH = 640;

/** PI25E → PI. Groups the list by programme so 25 codes stay scannable. */
const programmeOf = (group) => (group.short || "").match(/^[A-Z]+/)?.[0] || "Other";

const GroupModal = ({ groups, groupsLoading, selectedGroup, onSelect, onClose }) => {
  const [search, setSearch] = useState("");
  const inputRef = useRef(null);
  const panelRef = useRef(null);

  useEffect(() => {
    // Autofocus would open the keyboard on mobile and bury the list
    if (window.innerWidth > DESKTOP_WIDTH) inputRef.current?.focus();
  }, []);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  useEffect(() => {
    if (!onClose) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const sections = useMemo(() => {
    const q = search.trim().toLowerCase();
    const matches = groups.filter(
      (g) =>
        g.short?.toLowerCase().includes(q) || g.name?.toLowerCase().includes(q)
    );
    const grouped = matches.reduce((acc, g) => {
      const key = programmeOf(g);
      (acc[key] ||= []).push(g);
      return acc;
    }, {});
    return Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b));
  }, [groups, search]);

  const total = sections.reduce((n, [, list]) => n + list.length, 0);

  return (
    <div className="sheet-overlay" onClick={onClose}>
      <div
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="sheet-title"
        ref={panelRef}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sheet__grip" aria-hidden="true" />

        <div className="sheet__head">
          <div>
            <h2 className="sheet__title" id="sheet-title">
              Your group
            </h2>
            <p className="sheet__sub">
              {selectedGroup
                ? `Showing ${selectedGroup.short}`
                : "Pick a group to load its timetable"}
            </p>
          </div>
          {onClose && (
            <button className="icon-btn" onClick={onClose} aria-label="Close">
              <CloseIcon size={18} />
            </button>
          )}
        </div>

        <div className="field">
          <SearchIcon size={16} className="field__icon" />
          <input
            ref={inputRef}
            className="field__input"
            type="text"
            placeholder="Search groups"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="characters"
            spellCheck="false"
            aria-label="Search groups"
          />
          {search && (
            <button
              className="field__clear"
              onClick={() => setSearch("")}
              aria-label="Clear search"
            >
              <CloseIcon size={14} />
            </button>
          )}
        </div>

        <div className="sheet__list">
          {groupsLoading && total === 0 ? (
            <div className="sheet__status">
              <span className="spinner" />
              Loading groups
            </div>
          ) : total === 0 ? (
            <div className="sheet__status">
              {search
                ? `No group matches “${search}”`
                : "No groups available. Check your connection."}
            </div>
          ) : (
            sections.map(([programme, list]) => (
              <section key={programme} className="sheet__section">
                <h3 className="sheet__section-title">{programme}</h3>
                <div className="sheet__grid">
                  {list.map((group) => {
                    const isActive = selectedGroup?.short === group.short;
                    return (
                      <button
                        key={group.id}
                        className={`group-option ${
                          isActive ? "group-option--active" : ""
                        }`}
                        onClick={() => onSelect(group)}
                      >
                        <span className="group-option__code">{group.short}</span>
                        {isActive && <CheckIcon size={15} />}
                      </button>
                    );
                  })}
                </div>
              </section>
            ))
          )}
        </div>

        {!onClose && (
          <p className="sheet__note">You can change this later from the header.</p>
        )}
      </div>
    </div>
  );
};

export default GroupModal;
