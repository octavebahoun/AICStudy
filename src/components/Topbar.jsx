import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { Icon, Avatar } from "./UI";
import t from "../data/translations";

export default function Topbar() {
  const { state, dispatch } = useApp();
  const { user, lang, notifications } = state;
  const navigate = useNavigate();
  const [showNotifs, setShowNotifs] = useState(false);
  const unread = notifications.filter((n) => !n.read).length;

  if (!user) return null;

  const avatarBg =
    user.role === "admin"
      ? "#1E3A5F"
      : user.role === "teacher"
        ? "#8B5CF6"
        : "#10B981";
  const profilePath = `/${user.role}/profile`;

  return (
    <div className="topbar">
      <div className="topbar-left">
        <button
          className="btn-icon"
          onClick={() => {
            if (window.innerWidth <= 768) {
              dispatch({ type: "TOGGLE_MOBILE_SIDEBAR" });
            } else {
              dispatch({ type: "TOGGLE_SIDEBAR" });
            }
          }}
        >
          <Icon name="menu" size={18} />
        </button>
        <div className="search-bar">
          <Icon name="eye" size={15} color="#94A3B8" />
          <input className="search-input" placeholder={t[lang].search} />
        </div>
      </div>

      <div className="topbar-right">
        <div className="lang-toggle">
          <button
            className={`lang-btn ${lang === "fr" ? "active" : ""}`}
            onClick={() => dispatch({ type: "SET_LANG", payload: "fr" })}
          >
            FR
          </button>
          <button
            className={`lang-btn ${lang === "en" ? "active" : ""}`}
            onClick={() => dispatch({ type: "SET_LANG", payload: "en" })}
          >
            EN
          </button>
        </div>

        <div className="notif-wrapper">
          <button
            className="btn-icon"
            onClick={() => {
              setShowNotifs(!showNotifs);
              dispatch({ type: "MARK_NOTIFICATIONS_READ" });
            }}
          >
            <Icon name="bell" size={18} />
            {unread > 0 && <div className="notif-dot" />}
          </button>
          {showNotifs && (
            <div className="notif-dropdown">
              <div className="font-semibold mb-2 text-sm">
                {t[lang].notifications}
              </div>
              {notifications.map((n) => (
                <div
                  key={n.id}
                  className={`notif-item ${!n.read ? "unread" : ""}`}
                >
                  {n.text}
                </div>
              ))}
            </div>
          )}
        </div>

        <button
          className="flex items-center gap-2"
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: "4px",
          }}
          onClick={() => navigate(profilePath)}
        >
          <Avatar initials={user.avatar} size={34} bg={avatarBg} />
          <div style={{ textAlign: "left", display: "none" }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{user.name}</div>
          </div>
        </button>
      </div>
    </div>
  );
}
