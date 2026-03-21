import { useNavigate, useLocation } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { Icon } from "./UI";
import t from "../data/translations";

const navConfig = {
  admin: [
    {
      path: "/admin",
      label_fr: "Tableau de bord",
      label_en: "Dashboard",
      icon: "dashboard",
      exact: true,
    },
    {
      path: "/admin/users",
      label_fr: "Utilisateurs",
      label_en: "Users",
      icon: "users",
    },
    {
      path: "/admin/courses",
      label_fr: "Cours",
      label_en: "Courses",
      icon: "courses",
    },
    {
      path: "/admin/forum",
      label_fr: "Forum",
      label_en: "Forum",
      icon: "forum",
    },
    {
      path: "/admin/certificates",
      label_fr: "Certificats & Badges",
      label_en: "Certificates & Badges",
      icon: "certificates",
    },
    {
      path: "/admin/reports",
      label_fr: "Rapports IA",
      label_en: "AI Reports",
      icon: "report",
    },
    {
      path: "/admin/settings",
      label_fr: "Paramètres",
      label_en: "Settings",
      icon: "settings",
    },
  ],
  teacher: [
    {
      path: "/teacher",
      label_fr: "Tableau de bord",
      label_en: "Dashboard",
      icon: "dashboard",
      exact: true,
    },
    {
      path: "/teacher/courses",
      label_fr: "Mes cours",
      label_en: "My Courses",
      icon: "courses",
    },
    {
      path: "/teacher/students",
      label_fr: "Étudiants",
      label_en: "Students",
      icon: "users",
    },
    {
      path: "/teacher/forum",
      label_fr: "Forum",
      label_en: "Forum",
      icon: "forum",
    },
    {
      path: "/teacher/profile",
      label_fr: "Profil",
      label_en: "Profile",
      icon: "user",
    },
  ],
  student: [
    {
      path: "/student",
      label_fr: "Tableau de bord",
      label_en: "Dashboard",
      icon: "dashboard",
      exact: true,
    },
    {
      path: "/student/catalog",
      label_fr: "Catalogue",
      label_en: "Catalog",
      icon: "catalog",
    },
    {
      path: "/student/courses",
      label_fr: "Mes cours",
      label_en: "My Courses",
      icon: "courses",
    },
    {
      path: "/student/progress",
      label_fr: "Progression",
      label_en: "Progress",
      icon: "progress",
    },
    {
      path: "/student/badges",
      label_fr: "Badges & Certificats",
      label_en: "Badges & Certs",
      icon: "certificates",
    },
    {
      path: "/student/forum",
      label_fr: "Forum",
      label_en: "Forum",
      icon: "forum",
    },
    {
      path: "/student/profile",
      label_fr: "Profil",
      label_en: "Profile",
      icon: "user",
    },
  ],
};

export default function Sidebar() {
  const { state, dispatch } = useApp();
  const { user, lang, sidebarOpen, mobileSidebarOpen } = state;
  const navigate = useNavigate();
  const location = useLocation();

  if (!user) return null;
  const nav = navConfig[user.role] || [];

  const isActive = (item) =>
    item.exact
      ? location.pathname === item.path
      : location.pathname.startsWith(item.path);

  const handleNav = (path) => {
    navigate(path);
    dispatch({ type: "CLOSE_MOBILE_SIDEBAR" });
  };

  return (
    <>
      {mobileSidebarOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            zIndex: 99,
          }}
          onClick={() => dispatch({ type: "CLOSE_MOBILE_SIDEBAR" })}
        />
      )}
      <aside
        className={`sidebar ${!sidebarOpen ? "collapsed" : ""} ${mobileSidebarOpen ? "mobile-open" : ""}`}
      >
        <div
          className="sidebar-logo"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div className="flex items-center gap-2">
            <div className="logo-pill">
              AiC<span className="logo-s">S</span>
            </div>
            {(sidebarOpen || mobileSidebarOpen) && (
              <span className="logo-subtitle">tudy</span>
            )}
          </div>
          {mobileSidebarOpen && (
            <button
              className="btn-icon"
              style={{
                padding: 4,
                height: 28,
                width: 28,
                border: "none",
                background: "rgba(255,255,255,0.05)",
              }}
              onClick={() => dispatch({ type: "CLOSE_MOBILE_SIDEBAR" })}
            >
              <Icon name="x" size={16} color="white" />
            </button>
          )}
        </div>

        <nav className="sidebar-nav">
          {nav.map((item) => {
            const active = isActive(item);
            return (
              <button
                key={item.path}
                className={`nav-item ${active ? "active" : ""}`}
                onClick={() => handleNav(item.path)}
                title={
                  !sidebarOpen
                    ? lang === "fr"
                      ? item.label_fr
                      : item.label_en
                    : ""
                }
              >
                <span className="nav-icon">
                  <Icon
                    name={item.icon}
                    size={18}
                    color={active ? "#3B82F6" : "#94A3B8"}
                  />
                </span>
                {(sidebarOpen || mobileSidebarOpen) && (
                  <span className="nav-label">
                    {lang === "fr" ? item.label_fr : item.label_en}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <button
            className="nav-item"
            onClick={() => dispatch({ type: "LOGOUT" })}
          >
            <span className="nav-icon">
              <Icon name="logout" size={18} color="#94A3B8" />
            </span>
            {(sidebarOpen || mobileSidebarOpen) && (
              <span className="nav-label">{t[lang].logout}</span>
            )}
          </button>
        </div>
      </aside>
    </>
  );
}
