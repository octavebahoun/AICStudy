import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../../context/AppContext";
import {
  StatCard,
  ProgressBar,
  Badge,
  Avatar,
  CourseThumb,
  Icon,
  Spinner,
} from "../../components/UI";
import { getStudentEnrollments, getStudentCertificates, getForumPosts } from "../../services/db";
import { supabase, subscribeToTable } from "../../services/supabase";
import t from "../../data/translations";

export function StudentMyCourses() {
  const { state } = useApp();
  const { user, lang } = state;
  const navigate = useNavigate();
  const [tab, setTab] = useState("inProgress");
  const [enrollments, setEnrollments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id) fetchEnrollments();
  }, [user?.id]);

  const fetchEnrollments = async () => {
    setLoading(true);
    try {
      const data = await getStudentEnrollments(user.id);
      setEnrollments(data);
    } catch (err) {
      console.error("Error fetching enrollments:", err);
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
  const list = tab === "inProgress" ? inProgress : completed;

  return (
    <div className="page-content fade-in">
      <div className="page-header">
        <h1 className="page-title">{t[lang].myCourses}</h1>
      </div>
      <div className="tab-list">
        <button
          className={`tab-btn ${tab === "inProgress" ? "active" : ""}`}
          onClick={() => setTab("inProgress")}
        >
          {t[lang].inProgress} ({inProgress.length})
        </button>
        <button
          className={`tab-btn ${tab === "completed" ? "active" : ""}`}
          onClick={() => setTab("completed")}
        >
          {t[lang].completed} ({completed.length})
        </button>
      </div>

      {loading ? (
        <Spinner dark />
      ) : list.length === 0 ? (
        <div
          className="card"
          style={{ textAlign: "center", padding: 40, color: "var(--text-muted)" }}
        >
          {lang === "fr" ? "Aucun cours ici." : "No courses here."}
        </div>
      ) : (
        <div className="grid-3">
          {list.map((e) => {
            const c = e.course;
            return (
              <div key={e.id} className="course-card">
                <div
                  className="course-thumb"
                  style={{
                    background: `linear-gradient(135deg, ${c.color || "var(--accent)"}, ${c.color || "var(--accent)"}99)`,
                  }}
                >
                  {c.thumbnail || "??"}
                </div>
                <div className="course-body">
                  <div className="course-title">{c.title}</div>
                  <div className="course-meta mb-3">
                    <span>
                      {c.category} · {c.level}
                    </span>
                  </div>
                  <ProgressBar value={e.progress || 0} />
                  <div
                    style={{
                      fontSize: 12,
                      color: "var(--text-muted)",
                      margin: "4px 0 12px",
                    }}
                  >
                    {e.progress || 0}%{" "}
                    {lang === "fr" ? "complété" : "completed"}
                  </div>
                  <button
                    className="btn btn-accent btn-sm w-full"
                    style={{ justifyContent: "center" }}
                    onClick={() =>
                      navigate(
                        e.progress < 100
                          ? `/student/learn/${c.id}`
                          : `/student/badges`,
                      )
                    }
                  >
                    {e.progress < 100
                      ? t[lang].continueCourse
                      : t[lang].viewCertificate}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function StudentProgress() {
  const { state } = useApp();
  const { user, lang } = state;
  const [enrollments, setEnrollments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id) fetchStats();
  }, [user?.id]);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const data = await getStudentEnrollments(user.id);
      setEnrollments(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const completed = enrollments.filter((e) => (e.progress || 0) >= 100);
  const avgProgress = enrollments.length
    ? Math.round(
        enrollments.reduce((a, b) => a + (b.progress || 0), 0) /
          enrollments.length,
      )
    : 0;

  return (
    <div className="page-content fade-in">
      <div className="page-header">
        <h1 className="page-title">{t[lang].myProgress}</h1>
        <p className="page-subtitle">
          {lang === "fr"
            ? "Suivez votre évolution et vos accomplissements."
            : "Track your growth and achievements."}
        </p>
      </div>

      <div className="grid-3 mb-6">
        <StatCard
          icon={<Icon name="trending" size={24} color="var(--accent)" />}
          label={lang === "fr" ? "Progression moyenne" : "Average Progress"}
          value={`${avgProgress}%`}
          bg="var(--surface-blue)"
        />
        <StatCard
          icon={<Icon name="checkCircle" size={24} color="var(--success)" />}
          label={lang === "fr" ? "Cours terminés" : "Courses Finished"}
          value={completed.length}
          bg="var(--surface-green)"
        />
        <StatCard
          icon={<Icon name="bookOpen" size={24} color="var(--warning)" />}
          label={lang === "fr" ? "En cours" : "In Progress"}
          value={enrollments.length - completed.length}
          bg="var(--surface-amber-100)"
        />
      </div>

      <div className="card">
        <div className="card-title">
          <Icon
            name="progress"
            size={16}
            color="var(--primary)"
            style={{ marginRight: 8, marginBottom: -3 }}
          />
          {lang === "fr" ? "Détails par cours" : "Course Details"}
        </div>
        {loading ? (
          <Spinner dark />
        ) : enrollments.length === 0 ? (
          <p style={{ textAlign: "center", color: "var(--text-muted)", padding: 20 }}>
            {lang === "fr"
              ? "Aucune donnée de progression."
              : "No progress data available."}
          </p>
        ) : (
          <div className="flex flex-col gap-4">
            {enrollments.map((e) => (
              <div
                key={e.id}
                style={{ padding: "12px 0", borderBottom: "1px solid var(--token-color-palette-neutral-100)" }}
              >
                <div className="flex justify-between items-center mb-2">
                  <span style={{ fontWeight: 600, fontSize: 14 }}>
                    {e.course?.title}
                  </span>
                  <Badge type={e.progress >= 100 ? "success" : "primary"}>
                    {e.progress || 0}%
                  </Badge>
                </div>
                <ProgressBar value={e.progress || 0} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function StudentBadges() {
  const { state } = useApp();
  const { user, lang } = state;
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id) fetchCertificates();
  }, [user?.id]);

  const fetchCertificates = async () => {
    setLoading(true);
    try {
      const data = await getStudentCertificates(user.id);
      setCertificates(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-content fade-in">
      <div className="page-header">
        <h1 className="page-title">
          {t[lang].badges} & {t[lang].certificates}
        </h1>
        <p className="page-subtitle">
          {lang === "fr"
            ? "Vos récompenses pour vos efforts."
            : "Your rewards for your hard work."}
        </p>
      </div>

      {loading ? (
        <Spinner dark />
      ) : certificates.length === 0 ? (
        <div
          className="card"
          style={{ textAlign: "center", padding: 60, color: "var(--text-muted)" }}
        >
          <div style={{ fontSize: 48, marginBottom: 16 }}>🏆</div>
          <p>
            {lang === "fr"
              ? "Complétez un cours à 100% pour obtenir votre premier certificat !"
              : "Complete a course 100% to earn your first certificate!"}
          </p>
        </div>
      ) : (
        <div className="grid-3">
          {certificates.map((c) => (
            <div
              key={c.id}
              className="card flex flex-col items-center text-center"
              style={{
                padding: 24,
                background: "linear-gradient(135deg, var(--bg-card), var(--surface-blue))",
              }}
            >
              <div
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: "50%",
                  background: "var(--surface-green)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 16,
                  border: "4px solid var(--surface-green-100)",
                }}
              >
                <Icon name="award" size={40} color="var(--success)" />
              </div>
              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>
                {c.course?.title}
              </h3>
              <Badge type="success">
                {lang === "fr" ? "Certifié" : "Certified"}
              </Badge>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 12 }}>
                {lang === "fr" ? "Obtenu le" : "Earned on"}{" "}
                {new Date(c.issued_at).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function StudentForum() {
  const { state } = useApp();
  const { user, lang } = state;
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");

  useEffect(() => {
    fetchPosts();
    return subscribeToTable("forum_posts", null, fetchPosts);
  }, []);

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const data = await getForumPosts();
      setPosts(data);
    } catch (err) {
      console.error("Error fetching forum:", err);
    } finally {
      setLoading(false);
    }
  };

  const addPost = async () => {
    if (!newContent.trim() || !newTitle.trim()) return;
    const { data, error } = await supabase
      .from("forum_posts")
      .insert({
        title: newTitle,
        content: newContent,
        author_id: user.id,
      })
      .select("*, author:users(full_name, avatar_url)")
      .single();

    if (!error && data) {
      setPosts([data, ...posts]);
      setNewTitle("");
      setNewContent("");
    }
  };

  return (
    <div className="page-content fade-in">
      <div className="page-header flex justify-between items-center">
        <div>
          <h1 className="page-title">{t[lang].forum}</h1>
          <p className="page-subtitle">
            {loading ? "..." : posts.length}{" "}
            {lang === "fr" ? "discussions" : "discussions"}
          </p>
        </div>
      </div>

      <div className="card mb-4">
        <div className="input-group">
          <label className="input-label">{t[lang].title}</label>
          <input
            className="input"
            placeholder={
              lang === "fr"
                ? "Titre de votre discussion..."
                : "Discussion title..."
            }
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
          />
        </div>
        <div className="input-group">
          <label className="input-label">
            {lang === "fr" ? "Message" : "Message"}
          </label>
          <textarea
            className="textarea"
            placeholder={t[lang].typeMessage}
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            style={{ minHeight: 80 }}
          />
        </div>
        <button className="btn btn-primary" onClick={addPost}>
          <Icon name="send" size={15} />
          {t[lang].postMessage}
        </button>
      </div>

      {loading ? (
        <Spinner dark />
      ) : (
        posts.map((p) => (
          <div key={p.id} className={`forum-post ${p.pinned ? "pinned" : ""}`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <Avatar
                  initials={p.author?.avatar_url || "?"}
                  size={32}
                  bg="var(--accent)"
                />
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{p.title}</div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                    {p.author?.full_name} ·{" "}
                    {new Date(p.created_at).toLocaleDateString()}
                  </div>
                </div>
                {p.pinned && (
                  <Badge type="info">📌 {t[lang].pinnedLabel}</Badge>
                )}
              </div>
            </div>
            <p style={{ fontSize: 14, color: "var(--primary-light)" }}>{p.content}</p>
            <div
              className="flex gap-4 mt-2"
              style={{ fontSize: 12, color: "var(--token-color-palette-neutral-400)" }}
            >
              <span>💬 {p.replies_count || 0}</span>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

export function StudentProfile() {
  const { state, dispatch } = useApp();
  const { user, lang } = state;

  return (
    <div className="page-content fade-in">
      <div className="page-header">
        <h1 className="page-title">{t[lang].profile}</h1>
      </div>
      <div className="grid-2">
        <div className="card">
          <div style={{ textAlign: "center", marginBottom: 24 }}>
            <Avatar initials={user?.avatar} size={72} bg="var(--success)" />
            <div style={{ marginTop: 12, fontSize: 18, fontWeight: 600 }}>
              {user?.name}
            </div>
            <div className="mt-2">
              <Badge type="success">{t[lang].student}</Badge>
            </div>
          </div>
          <div className="input-group">
            <label className="input-label">{t[lang].fullName}</label>
            <input className="input" defaultValue={user?.name} />
          </div>
          <div className="input-group">
            <label className="input-label">{t[lang].email}</label>
            <input className="input" defaultValue={user?.email} disabled />
          </div>
          <div className="input-group">
            <label className="input-label">{t[lang].language}</label>
            <select
              className="select"
              value={lang}
              onChange={(e) =>
                dispatch({ type: "SET_LANG", payload: e.target.value })
              }
            >
              <option value="fr">Français</option>
              <option value="en">English</option>
            </select>
          </div>
          <button className="btn btn-primary">{t[lang].save}</button>
        </div>
        <div className="card">
          <div className="card-title">🎓 {t[lang].myAchievements}</div>
          <p style={{ color: "var(--text-muted)", fontSize: 14 }}>
            {lang === "fr"
              ? "Vos accomplissements seront bientôt synchronisés ici."
              : "Your achievements will be synced here soon."}
          </p>
        </div>
      </div>
    </div>
  );
}
