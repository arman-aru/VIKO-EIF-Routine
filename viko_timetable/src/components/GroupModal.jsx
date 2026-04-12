import { useEffect, useRef, useState } from "react";

const GroupModal = ({ groups, selectedGroup, onSelect, onClose }) => {
  const [search, setSearch] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Prevent scroll on body while modal open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const filtered = groups.filter((g) =>
    g.short?.toLowerCase().includes(search.toLowerCase()) ||
    g.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div>
            <h2 className="modal-title">Select Your Group</h2>
            <p className="modal-subtitle">
              {selectedGroup
                ? "Currently: " + selectedGroup.short
                : "Choose your study group to see your timetable"}
            </p>
          </div>
          {onClose && (
            <button className="modal-close-btn" onClick={onClose} aria-label="Close">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Search */}
        <div className="modal-search-wrap">
          <svg className="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            ref={inputRef}
            className="modal-search"
            type="text"
            placeholder="Search group (e.g. PI24E)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button className="search-clear" onClick={() => setSearch("")}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Group list */}
        <div className="modal-list">
          {filtered.length === 0 ? (
            <div className="modal-empty">
              <span>No groups found for "{search}"</span>
            </div>
          ) : (
            filtered.map((group) => {
              const isActive = selectedGroup?.id === group.id;
              return (
                <button
                  key={group.id}
                  className={`group-item ${isActive ? "group-item--active" : ""}`}
                  onClick={() => onSelect(group)}
                >
                  <span className="group-badge">{group.short}</span>
                  <span className="group-name">{group.name || group.short}</span>
                  {isActive && (
                    <svg className="group-check" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </button>
              );
            })
          )}
        </div>

        {!onClose && (
          <p className="modal-footer-note">
            You can change your group anytime from the header
          </p>
        )}
      </div>
    </div>
  );
};

export default GroupModal;
