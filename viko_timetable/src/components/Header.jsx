import { ChevronDown } from "./icons";

const Header = ({ selectedGroup, onChangeGroup }) => (
  <header className="topbar">
    <div className="topbar__inner">
      <div className="topbar__brand">
        <img src="/viko-logo.png" alt="" className="topbar__logo" />
        <span className="topbar__wordmark">
          VIKO <em>EIF</em>
        </span>
      </div>

      <button
        type="button"
        className={`group-chip ${selectedGroup ? "" : "group-chip--empty"}`}
        onClick={onChangeGroup}
      >
        <span className="group-chip__label">
          {selectedGroup ? selectedGroup.short : "Select group"}
        </span>
        <ChevronDown size={14} />
      </button>
    </div>
  </header>
);

export default Header;
