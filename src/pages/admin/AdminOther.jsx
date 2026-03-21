import { useState, useEffect } from "react";
import { useApp } from "../../context/AppContext";
import { Icon, Avatar, Badge, AIPanel, Spinner } from "../../components/UI";
import { getForumPosts } from "../../services/db";
import { callAI, aiPrompts } from "../../services/ai";
import { supabase } from "../../services/supabase";
import t from "../../data/translations";

export function AdminForum() {
  const { state } = useApp();
  const { lang } = state;
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const data = await getForumPosts();
      setPosts(data);
    } catch (err) {
      console.error("Error fetching forum posts:", err);
    } finally {
      setLoading(false);
    }
  };

  const remove = async (id) => {
    if (!confirm(lang === "fr" ? "Supprimer ce post ?" : "Delete this post?"))
      return;
    const { error } = await supabase.from("forum_posts").delete().eq("id", id);
    if (!error) setPosts(posts.filter((p) => p.id !== id));
  };

  const togglePin = async (id, currentPinned) => {
    const { error } = await supabase
      .from("forum_posts")
      .update({ pinned: !currentPinned })
      .eq("id", id);
    if (!error)
      setPosts(
        posts.map((p) => (p.id === id ? { ...p, pinned: !currentPinned } : p)),
      );
  };

  return (
    <div className="page-content fade-in">
      <div className="page-header">
        <h1 className="page-title">
          {t[lang].forum} — {t[lang].moderation}
        </h1>
        <p className="page-subtitle">
          {loading ? "..." : posts.length}{" "}
          {lang === "fr" ? "discussions actives" : "active discussions"}
        </p>
      </div>

      {loading ? (
        <Spinner dark />
      ) : posts.length === 0 ? (
        <div
          className="card"
          style={{ textAlign: "center", padding: 40, color: "#64748B" }}
        >
          Aucun message sur le forum
        </div>
      ) : (
        posts.map((p) => (
          <div key={p.id} className={`forum-post ${p.pinned ? "pinned" : ""}`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <Avatar
                  initials={p.author?.avatar_url || "?"}
                  size={32}
                  bg="#3B82F6"
                />
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{p.title}</div>
                  <div style={{ fontSize: 12, color: "#64748B" }}>
                    {p.author?.full_name} ·{" "}
                    {new Date(p.created_at).toLocaleDateString()}
                  </div>
                </div>
                {p.pinned && (
                  <Badge type="info">📌 {t[lang].pinnedLabel}</Badge>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  className="btn-icon"
                  title={t[lang].pin}
                  onClick={() => togglePin(p.id, p.pinned)}
                >
                  <Icon
                    name="star"
                    size={15}
                    color={p.pinned ? "#F59E0B" : "#94A3B8"}
                  />
                </button>
                <button
                  className="btn-icon"
                  title={t[lang].delete}
                  onClick={() => remove(p.id)}
                >
                  <Icon name="trash" size={15} color="#EF4444" />
                </button>
              </div>
            </div>
            <p style={{ fontSize: 14, color: "#374151" }}>{p.content}</p>
            <div
              className="flex gap-4 mt-2"
              style={{ fontSize: 12, color: "#94A3B8" }}
            >
              <span>💬 {p.replies_count || 0}</span>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

export function AdminCertificates() {
  const { state } = useApp();
  const { lang } = state;
  const [badges, setBadges] = useState([]);
  const [certs, setCerts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: bData } = await supabase
        .from("badges")
        .select("*")
        .order("name");
      const { data: cData } = await supabase
        .from("certificates")
        .select("*, student:users(full_name), course:courses(title)")
        .order("issued_at", { ascending: false });
      setBadges(bData || []);
      setCerts(cData || []);
    } catch (err) {
      console.error("Error fetching rewards:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddBadge = async () => {
    const name = prompt(lang === "fr" ? "Nom du badge :" : "Badge name:");
    if (!name) return;
    const icon =
      prompt(lang === "fr" ? "Icône (Emoji) :" : "Icon (Emoji):") || "🏆";

    const { data, error } = await supabase
      .from("badges")
      .insert({ name, icon, color: "#3B82F6" })
      .select()
      .single();

    if (!error) {
      setBadges([...badges, data]);
      alert(lang === "fr" ? "Badge ajouté !" : "Badge added!");
    }
  };

  const deleteBadge = async (id) => {
    if (!confirm(lang === "fr" ? "Supprimer ce badge ?" : "Delete this badge?"))
      return;
    const { error } = await supabase.from("badges").delete().eq("id", id);
    if (!error) setBadges(badges.filter((b) => b.id !== id));
  };

  return (
    <div className="page-content fade-in">
      <div className="page-header flex justify-between items-center">
        <div>
          <h1 className="page-title">
            {t[lang].certificates} & {t[lang].badges}
          </h1>
          <p className="page-subtitle">
            {lang === "fr" ? "Gestion des récompenses" : "Manage rewards"}
          </p>
        </div>
        <button className="btn btn-primary" onClick={handleAddBadge}>
          <Icon name="plus" size={15} />
          {lang === "fr" ? "Nouveau badge" : "New badge"}
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center p-12">
          <Spinner dark />
        </div>
      ) : (
        <div className="grid-2">
          <div className="card">
            <div className="card-title">🏅 {t[lang].badgesConfig}</div>
            {badges.length === 0 ? (
              <p
                style={{
                  textAlign: "center",
                  color: "#94A3B8",
                  padding: 20,
                  fontSize: 13,
                }}
              >
                {lang === "fr"
                  ? "Aucun badge configuré."
                  : "No badges configured."}
              </p>
            ) : (
              badges.map((b) => (
                <div
                  key={b.id}
                  className="flex items-center justify-between"
                  style={{
                    padding: 10,
                    borderRadius: 8,
                    marginBottom: 8,
                    border: "1px solid #E2E8F0",
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      style={{
                        width: 38,
                        height: 38,
                        borderRadius: "50%",
                        background: (b.color || "#3B82F6") + "20",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 20,
                      }}
                    >
                      {b.icon}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>
                        {b.name}
                      </div>
                      <div style={{ fontSize: 12, color: "#64748B" }}>
                        {b.description || "—"}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button
                      className="btn-icon"
                      onClick={() => deleteBadge(b.id)}
                    >
                      <Icon name="trash" size={15} color="#EF4444" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="card">
            <div className="card-title">📜 {t[lang].recentCerts}</div>
            {certs.length === 0 ? (
              <p
                style={{
                  textAlign: "center",
                  color: "#94A3B8",
                  padding: 20,
                  fontSize: 13,
                }}
              >
                {lang === "fr"
                  ? "Aucun certificat délivré."
                  : "No certificates issued."}
              </p>
            ) : (
              certs.map((c) => (
                <div
                  key={c.id}
                  style={{
                    padding: 14,
                    border: "1px solid #E2E8F0",
                    borderRadius: 8,
                    marginBottom: 8,
                  }}
                >
                  <div style={{ fontWeight: 600, fontSize: 14 }}>
                    {c.course?.title || "Course deleted"}
                  </div>
                  <div style={{ fontSize: 12, color: "#64748B" }}>
                    {c.student?.full_name} · {t[lang].score}: {c.score}% ·{" "}
                    {new Date(c.issued_at).toLocaleDateString()}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function AdminReports() {
  const { state } = useApp();
  const { lang } = state;
  const [report, setReport] = useState("");
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [metrics, setMetrics] = useState({
    students: 0,
    courses: 0,
    avgScore: 0,
    enrollments: 0,
  });

  useEffect(() => {
    fetchMetrics();
  }, []);

  const fetchMetrics = async () => {
    setDataLoading(true);
    try {
      const { count: sCount } = await supabase
        .from("users")
        .select("*", { count: "exact", head: true })
        .eq("role", "student");
      const { count: cCount } = await supabase
        .from("courses")
        .select("*", { count: "exact", head: true });
      const { count: eCount } = await supabase
        .from("enrollments")
        .select("*", { count: "exact", head: true });
      const { data: qData } = await supabase
        .from("quiz_attempts")
        .select("score");

      const avg = qData?.length
        ? Math.round(
            qData.reduce((acc, curr) => acc + curr.score, 0) / qData.length,
          )
        : 0;

      setMetrics({
        students: sCount || 0,
        courses: cCount || 0,
        avgScore: avg,
        enrollments: eCount || 0,
      });
    } catch (err) {
      console.error("Error fetching metrics:", err);
    } finally {
      setDataLoading(false);
    }
  };

  const statsForAI = `${metrics.students} étudiants, ${metrics.courses} cours, ${metrics.enrollments} inscriptions, score moyen aux quiz: ${metrics.avgScore}%`;

  const generate = async () => {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const result = await callAI(
        aiPrompts.adminAnalysis(query, statsForAI, lang),
        lang,
      );
      setReport(result);
    } catch (err) {
      console.error("AI Error:", err);
    } finally {
      setLoading(false);
    }
  };

  const suggestions =
    lang === "fr"
      ? [
          "Analyse de l'engagement global ?",
          "Comment améliorer le score moyen ?",
          "Recommandations pédagogiques ?",
        ]
      : [
          "Global engagement analysis?",
          "How to improve average score?",
          "Pedagogical recommendations?",
        ];

  if (dataLoading)
    return (
      <div className="page-content center">
        <Spinner dark />
      </div>
    );

  return (
    <div className="page-content fade-in">
      <div className="page-header">
        <h1 className="page-title">🤖 {t[lang].aiReports}</h1>
        <p className="page-subtitle">{t[lang].smartAnalysis}</p>
      </div>

      <div className="grid-4 mb-6">
        {[
          {
            label: lang === "fr" ? "Étudiants" : "Students",
            value: metrics.students,
            trend: "Total",
            color: "#3B82F6",
          },
          {
            label: lang === "fr" ? "Cours" : "Courses",
            value: metrics.courses,
            trend: "Total",
            color: "#10B981",
          },
          {
            label: lang === "fr" ? "Score moyen" : "Avg score",
            value: metrics.avgScore + "%",
            trend: "Quiz",
            color: "#F59E0B",
          },
          {
            label: lang === "fr" ? "Inscriptions" : "Enrollments",
            value: metrics.enrollments,
            trend: "Total",
            color: "#6366F1",
          },
        ].map((s, i) => (
          <div key={i} className="stat-card">
            <div
              className="stat-icon"
              style={{ background: s.color + "15", fontSize: 24 }}
            >
              📊
            </div>
            <div>
              <div className="stat-value" style={{ color: s.color }}>
                {s.value}
              </div>
              <div className="stat-label">{s.label}</div>
            </div>
            <div className="stat-trend">{s.trend}</div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="card-title">💬 {t[lang].askAI}</div>
        <div className="flex gap-3 mb-3">
          <input
            className="input"
            placeholder={
              lang === "fr"
                ? "Ex: Comment booster l'engagement ?"
                : "E.g. How to boost engagement?"
            }
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && generate()}
          />
          <button
            className="btn btn-accent"
            onClick={generate}
            disabled={loading}
            style={{ minWidth: 120, justifyContent: "center" }}
          >
            {loading ? (
              <Spinner />
            ) : (
              <>
                <Icon name="send" size={14} />
                {t[lang].analyze}
              </>
            )}
          </button>
        </div>
        <div className="flex gap-2 flex-wrap mb-4">
          {suggestions.map((s) => (
            <button
              key={s}
              className="btn btn-ghost btn-sm"
              onClick={() => setQuery(s)}
            >
              {s}
            </button>
          ))}
        </div>
        {report && (
          <div
            className="ai-report-box"
            style={{
              background: "#F8FAFC",
              border: "1px solid #E2E8F0",
              borderRadius: 8,
              padding: 16,
              fontSize: 14,
              lineHeight: 1.7,
              color: "#374151",
              whiteSpace: "pre-wrap",
            }}
          >
            {report}
          </div>
        )}
      </div>
    </div>
  );
}

export function AdminSettings() {
  const { state } = useApp();
  const { lang } = state;

  return (
    <div className="page-content fade-in">
      <div className="page-header">
        <h1 className="page-title">{t[lang].settings}</h1>
        <p className="page-subtitle">
          {lang === "fr"
            ? "Paramètres de la plateforme AiC Study"
            : "AiC Study platform settings"}
        </p>
      </div>
      <div className="grid-2">
        <div className="card">
          <div className="card-title">🏢 {t[lang].generalInfo}</div>
          <div className="input-group">
            <label className="input-label">{t[lang].platformName}</label>
            <input className="input" defaultValue="AiC Study" />
          </div>
          <div className="input-group">
            <label className="input-label">{t[lang].organization}</label>
            <input className="input" defaultValue="AIC Organization" />
          </div>
          <div className="input-group">
            <label className="input-label">{t[lang].contactEmail}</label>
            <input className="input" defaultValue="contact@aicstudy.com" />
          </div>
          <button className="btn btn-primary">{t[lang].save}</button>
        </div>

        <div className="card">
          <div className="card-title">🤖 {t[lang].aiConfig}</div>
          <div className="input-group">
            <label className="input-label">{t[lang].apiKey}</label>
            <input className="input" type="password" placeholder="sk-..." />
          </div>
          <div className="input-group">
            <label className="input-label">
              {lang === "fr" ? "Modèle IA" : "AI Model"}
            </label>
            <select className="select">
              <option>claude-sonnet-4-20250514</option>
            </select>
          </div>
          <div
            style={{
              padding: 12,
              background: "#F0FDF4",
              borderRadius: 8,
              fontSize: 13,
              color: "#065F46",
            }}
          >
            ✅{" "}
            {lang === "fr"
              ? "Configurez votre clé dans .env"
              : "Configure your key in .env"}
          </div>
          <button className="btn btn-primary mt-3">{t[lang].save}</button>
        </div>

        <div className="card">
          <div className="card-title">🌍 {t[lang].langRegion}</div>
          <div className="input-group">
            <label className="input-label">{t[lang].defaultLang}</label>
            <select className="select">
              <option value="fr">Français</option>
              <option value="en">English</option>
            </select>
          </div>
          <button className="btn btn-primary">{t[lang].save}</button>
        </div>

        <div className="card">
          <div className="card-title">🔐 {t[lang].security}</div>
          <div className="input-group">
            <label className="input-label">{t[lang].sessionDuration}</label>
            <select className="select">
              <option>24h</option>
              <option>7 {lang === "fr" ? "jours" : "days"}</option>
              <option>30 {lang === "fr" ? "jours" : "days"}</option>
            </select>
          </div>
          <div className="input-group">
            <label className="input-label">{t[lang].twoFactor}</label>
            <select className="select">
              <option>{t[lang].disabled}</option>
              <option>{t[lang].enabled}</option>
            </select>
          </div>
          <button className="btn btn-primary">{t[lang].save}</button>
        </div>
      </div>
    </div>
  );
}
