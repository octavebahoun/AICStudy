import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../../context/AppContext";
import {
  Icon,
  StatCard,
  ProgressBar,
  CourseThumb,
  Badge,
  Spinner,
} from "../../components/UI";
import { getCourses, getStudentCourses, getStudentBadgeStats } from "../../services/db";
import { subscribeToTable } from "../../services/supabase";
import t from "../../data/translations";

export function StudentDashboard() {
  const { state } = useApp();
  const { user, lang } = state;
  const navigate = useNavigate();
  const [enrollments, setEnrollments] = useState([]);
  const [badgeStats, setBadgeStats] = useState({ badges: 0, certificates: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id) fetchDashboard();
  }, [user?.id]);

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const [data, stats] = await Promise.all([
        getStudentCourses(user.id),
        getStudentBadgeStats(user.id),
      ]);
      setEnrollments(data);
      setBadgeStats(stats);
    } catch (err) {
      console.error("Error fetching student dashboard:", err);
    } finally {
      setLoading(false);
    }
  };

  const inProgress = enrollments.filter(
    (e) => e.course && (e.progress || 0) < 100,
  );
  const completed = enrollments.filter(
    (e) => e.course && (e.progress || 0) >= 100,
  );

  return (
    <div className="page-content fade-in">
      <div className="page-header flex justify-between items-center">
        <div>
          <h1 className="page-title">{t[lang].dashboard}</h1>
          <p
            className="page-subtitle"
            style={{ display: "flex", alignItems: "center", gap: 6 }}
          >
            {t[lang].welcome}, {user?.name}{" "}
            <Icon name="wave" size={14} color="var(--warning)" />
          </p>
        </div>
        <button
          className="btn btn-accent"
          onClick={() => navigate("/student/catalog")}
        >
          {t[lang].catalog} →
        </button>
      </div>

      <div className="grid-4 mb-6">
        <StatCard
          icon={<Icon name="bookOpen" size={24} color="var(--accent)" />}
          label={t[lang].inProgress}
          value={inProgress.length}
          bg="var(--surface-blue)"
        />
        <StatCard
          icon={<Icon name="checkCircle" size={24} color="var(--success)" />}
          label={t[lang].completed}
          value={completed.length}
          bg="var(--surface-green)"
        />
        <StatCard
          icon={<Icon name="award" size={24} color="var(--warning)" />}
          label={t[lang].badges}
          value={loading ? "..." : badgeStats.badges}
          bg="var(--surface-amber-100)"
        />
        <StatCard
          icon={<Icon name="scroll" size={24} color="var(--token-color-foreground-highlight)" />}
          label={t[lang].certificates}
          value={loading ? "..." : badgeStats.certificates}
          bg="var(--surface-purple)"
        />
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-title">
            <Icon
              name="bookOpen"
              size={16}
              color="var(--primary)"
              style={{ marginBottom: -3, marginRight: 8 }}
            />
            {t[lang].inProgress}
          </div>
          {loading ? (
            <Spinner dark />
          ) : inProgress.length === 0 ? (
            <p style={{ textAlign: "center", color: "var(--text-muted)", padding: 20 }}>
              {lang === "fr"
                ? "Aucun cours en cours"
                : "No courses in progress"}
            </p>
          ) : (
            inProgress.map((e) => (
              <div
                key={e.id}
                className="flex items-center gap-3"
                style={{
                  padding: 12,
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  marginBottom: 8,
                  cursor: "pointer",
                  transition: "background 0.15s",
                }}
                onClick={() => navigate(`/student/learn/${e.course_id}`)}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = "var(--bg)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "transparent")
                }
              >
                <CourseThumb
                  thumbnail={e.course?.thumbnail || "??"}
                  color={e.course?.color}
                  size={44}
                />
                <div style={{ flex: 1 }}>
                  <div
                    style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}
                  >
                    {e.course?.title}
                  </div>
                  <ProgressBar value={e.progress || 0} />
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                    {e.progress || 0}%{" "}
                    {lang === "fr" ? "complété" : "completed"}
                  </div>
                </div>
                <button
                  className="btn btn-accent btn-sm"
                  onClick={(ev) => {
                    ev.stopPropagation();
                    navigate(`/student/learn/${e.course_id}`);
                  }}
                >
                  {t[lang].continueCourse}
                </button>
              </div>
            ))
          )}
        </div>

        <div className="card">
          <div className="card-title">
            🏅 {lang === "fr" ? "Mes badges récents" : "Recent Badges"}
          </div>
          <p style={{ textAlign: "center", color: "var(--text-muted)", padding: 20 }}>
            {lang === "fr" ? "Bientôt disponible" : "Coming soon"}
          </p>
          <button
            className="btn btn-ghost btn-sm w-full"
            style={{ justifyContent: "center" }}
            onClick={() => navigate("/student/badges")}
          >
            {lang === "fr" ? "Voir tous mes badges →" : "View all badges →"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function StudentCatalog() {
  const { state } = useApp();
  const { lang } = state;
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    fetchCatalog();
    return subscribeToTable("courses", null, fetchCatalog);
  }, []);

  const fetchCatalog = async () => {
    setLoading(true);
    try {
      console.log("Fetching catalog for status: active...");
      const data = await getCourses({ status: "active" });
      console.log("Catalog data received:", data);
      setCourses(data || []);
    } catch (err) {
      console.error("CRITICAL: Error fetching catalog:", err);
      alert("Erreur base de données : " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const levelBadge = {
    beginner: "success",
    intermediate: "warning",
    advanced: "danger",
  };

  const filtered = courses.filter(
    (c) =>
      (filter === "all" || c.level === filter) &&
      c.title.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="page-content fade-in">
      <div className="page-header">
        <h1 className="page-title">{t[lang].catalog}</h1>
        <p className="page-subtitle">
          {loading ? "..." : filtered.length}{" "}
          {lang === "fr" ? "cours disponibles" : "available courses"}
        </p>
      </div>

      <div className="flex gap-3 mb-6 flex-wrap">
        <input
          className="input"
          style={{ maxWidth: 300 }}
          placeholder={t[lang].search}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="select"
          style={{ maxWidth: 160 }}
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="all">
            {lang === "fr" ? "Tous niveaux" : "All levels"}
          </option>
          <option value="beginner">{t[lang].beginner}</option>
          <option value="intermediate">{t[lang].intermediate}</option>
          <option value="advanced">{t[lang].advanced}</option>
        </select>
      </div>

      {loading ? (
        <div
          style={{ display: "flex", justifyContent: "center", padding: "40px" }}
        >
          <Spinner dark />
        </div>
      ) : (
        <div className="grid-3">
          {filtered.map((c) => (
            <div
              key={c.id}
              className="course-card"
              onClick={() => navigate(`/student/course/${c.id}`)}
            >
              <div
                className="course-thumb"
                style={{
                  background: `linear-gradient(135deg, ${c.color}, ${c.color}99)`,
                }}
              >
                {c.thumbnail || "??"}
              </div>
              <div className="course-body">
                <div className="course-title">{c.title}</div>
                <div className="course-desc">{c.description}</div>
                <div className="course-meta">
                  <Badge type={levelBadge[c.level]}>{t[lang][c.level]}</Badge>
                  <span>⏱ {c.duration}</span>
                  <span>👥 {c.enrolled_count || 0}</span>
                </div>
                <div className="flex justify-between items-center mt-2">
                  <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                    {lang === "fr" ? "Par" : "By"} {c.teacherName}
                  </span>
                  <button
                    className="btn btn-accent btn-sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/student/course/${c.id}`);
                    }}
                  >
                    {t[lang].startCourse}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
