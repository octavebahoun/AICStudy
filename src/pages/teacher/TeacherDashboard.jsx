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
import { getTeacherDashboardData } from "../../services/db";
import { subscribeToTable } from "../../services/supabase";
import t from "../../data/translations";

export default function TeacherDashboard() {
  const { state } = useApp();
  const { user, lang } = state;
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    fetchDashboard();
    const unsubCourses = subscribeToTable("courses", `teacher_id=eq.${user.id}`, fetchDashboard);
    const unsubEnrollments = subscribeToTable("enrollments", null, fetchDashboard);
    return () => {
      unsubCourses();
      unsubEnrollments();
    };
  }, [user?.id]);

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const data = await getTeacherDashboardData(user.id);
      setCourses(data.courses);
      setPosts(data.recentPosts);
    } catch (err) {
      console.error("Error fetching teacher dashboard:", err);
    } finally {
      setLoading(false);
    }
  };

  const totalStudents = courses.reduce(
    (a, c) => a + (c.enrolled_count || 0),
    0,
  );
  const avgCompletion = courses.length
    ? Math.round(
        courses.reduce((a, c) => a + (c.completion_rate || 0), 0) /
          courses.length,
      )
    : 0;

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
          className="btn btn-primary"
          onClick={() => navigate("/teacher/courses/new")}
        >
          + {t[lang].createCourse}
        </button>
      </div>

      <div className="grid-4 mb-6">
        <StatCard
          icon={<Icon name="book" size={24} color="var(--accent)" />}
          label={t[lang].myCourses}
          value={loading ? "..." : courses.length}
          bg="var(--surface-blue)"
        />
        <StatCard
          icon={<Icon name="users" size={24} color="var(--success)" />}
          label={t[lang].totalStudents}
          value={loading ? "..." : totalStudents}
          bg="var(--surface-green)"
        />
        <StatCard
          icon={<Icon name="trending" size={24} color="var(--warning)" />}
          label={t[lang].completionRate}
          value={loading ? "..." : `${avgCompletion}%`}
          bg="var(--surface-amber-100)"
        />
        <StatCard
          icon={<Icon name="folders" size={24} color="var(--token-color-foreground-highlight)" />}
          label={t[lang].modules}
          value={
            loading
              ? "..."
              : courses.reduce((a, c) => a + (c.modules_count || 0), 0)
          }
          bg="var(--surface-purple)"
        />
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-title">
            <Icon
              name="book"
              size={16}
              color="var(--primary)"
              style={{ marginBottom: -3, marginRight: 8 }}
            />
            {t[lang].myCourses}
          </div>
          {loading ? (
            <Spinner dark />
          ) : courses.length === 0 ? (
            <p style={{ textAlign: "center", color: "var(--text-muted)", padding: 20 }}>
              {lang === "fr" ? "Aucun cours créé" : "No courses created"}
            </p>
          ) : (
            courses.map((c) => (
              <div
                key={c.id}
                className="flex items-center gap-3"
                style={{
                  padding: "10px",
                  borderRadius: 8,
                  marginBottom: 8,
                  border: "1px solid var(--border)",
                  cursor: "pointer",
                  transition: "background 0.15s",
                }}
                onClick={() => navigate(`/teacher/courses/${c.id}`)}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = "var(--bg)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "transparent")
                }
              >
                <CourseThumb
                  thumbnail={c.thumbnail || "??"}
                  color={c.color || "var(--accent)"}
                  size={40}
                />
                <div style={{ flex: 1 }}>
                  <div className="flex justify-between mb-1">
                    <span style={{ fontSize: 14, fontWeight: 600 }}>
                      {c.title}
                    </span>
                    <Badge type={c.status === "active" ? "success" : "warning"}>
                      {c.status === "active" ? t[lang].active : t[lang].pending}
                    </Badge>
                  </div>
                  <ProgressBar value={c.completion_rate || 0} />
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                    {c.enrolled_count || 0}{" "}
                    {lang === "fr" ? "inscrits" : "enrolled"} ·{" "}
                    {c.completion_rate || 0}%
                  </div>
                </div>
                <button
                  className="btn btn-ghost btn-sm"
                  style={{ padding: "6px" }}
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/teacher/courses/${c.id}`);
                  }}
                >
                  <Icon name="edit" size={14} />
                </button>
              </div>
            ))
          )}
        </div>

        <div className="card">
          <div className="card-title">💬 {t[lang].forum}</div>
          {loading ? (
            <Spinner dark />
          ) : posts.length === 0 ? (
            <p style={{ textAlign: "center", color: "var(--text-muted)", padding: 20 }}>
              {lang === "fr"
                ? "Aucune discussion récente"
                : "No recent discussions"}
            </p>
          ) : (
            posts.map((p) => (
              <div
                key={p.id}
                style={{
                  padding: "10px",
                  borderRadius: 8,
                  marginBottom: 8,
                  border: "1px solid var(--border)",
                  cursor: "pointer",
                }}
                onClick={() => navigate("/teacher/forum")}
              >
                <div style={{ fontWeight: 600, fontSize: 14 }}>{p.title}</div>
                <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                  {p.author?.full_name} · 💬 {p.replies_count || 0}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
