import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../../context/AppContext";
import {
  StatCard,
  ProgressBar,
  AIPanel,
  Spinner,
  CourseThumb,
} from "../../components/UI";
import { getCourses, getAdminStats } from "../../services/db";
import { callAI, aiPrompts } from "../../services/ai";
import { chartData } from "../../data/mockData";
import t from "../../data/translations";

export default function AdminDashboard() {
  const { state } = useApp();
  const { user, lang } = state;
  const navigate = useNavigate();
  const [dbStats, setDbStats] = useState({
    totalStudents: 0,
    totalCourses: 0,
    activeCourses: 0,
    completionRate: 0,
  });
  const [topCourses, setTopCourses] = useState([]);
  const [pendingCourses, setPendingCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [aiReport, setAiReport] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [s, c] = await Promise.all([getAdminStats(), getCourses()]);
      setDbStats(s);
      setTopCourses(
        c.filter((course) => course.status === "active").slice(0, 3),
      );
      setPendingCourses(c.filter((course) => course.status === "pending"));
    } catch (err) {
      console.error("Error fetching dashboard data:", err);
    } finally {
      setLoading(false);
    }
  };

  const generateReport = async () => {
    const statsText = `${dbStats.totalStudents} étudiants, ${dbStats.totalCourses} cours, taux de complétion ${dbStats.completionRate}%`;
    setAiLoading(true);
    const result = await callAI(aiPrompts.adminReport(statsText, lang), lang);
    setAiReport(result);
    setAiLoading(false);
  };

  const maxVal =
    chartData.length > 0 ? Math.max(...chartData.map((d) => d.students)) : 1;

  return (
    <div className="page-content fade-in">
      <div className="page-header flex justify-between items-center">
        <div>
          <h1 className="page-title">{t[lang].dashboard}</h1>
          <p className="page-subtitle">
            {t[lang].welcome}, {user?.name} 👋
          </p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => navigate("/admin/users")}
        >
          {t[lang].manage}
        </button>
      </div>

      <div className="grid-4 mb-6">
        <StatCard
          icon="👥"
          label={t[lang].totalStudents}
          value={loading ? "..." : dbStats.totalStudents}
          trend="+0"
          bg="var(--surface-blue)"
        />
        <StatCard
          icon="📚"
          label={t[lang].totalCourses}
          value={loading ? "..." : dbStats.totalCourses}
          trend="+0"
          bg="var(--surface-green)"
        />
        <StatCard
          icon="✅"
          label={t[lang].activeCourses}
          value={loading ? "..." : dbStats.activeCourses}
          trend="stable"
          bg="var(--surface-amber-100)"
        />
        <StatCard
          icon="🎯"
          label={t[lang].completionRate}
          value={loading ? "..." : dbStats.completionRate + "%"}
          trend="+0%"
          bg="var(--surface-purple)"
        />
      </div>

      <div className="grid-2 mb-6">
        <div className="card">
          <div className="card-title">📈 {t[lang].enrollmentEvolution}</div>
          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              gap: 8,
              height: 130,
            }}
          >
            {chartData.map((d, i) => (
              <div
                key={i}
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <div
                  style={{
                    flex: 1,
                    width: "100%",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "flex-end",
                    gap: 2,
                  }}
                >
                  <div
                    title={`Complétions: ${d.completions}`}
                    style={{
                      background: "var(--success)",
                      borderRadius: "3px 3px 0 0",
                      height: `${(d.completions / maxVal) * 100}%`,
                      opacity: 0.7,
                    }}
                  />
                  <div
                    title={`Inscrits: ${d.students}`}
                    style={{
                      background: "var(--accent)",
                      borderRadius: "3px 3px 0 0",
                      height: `${(d.students / maxVal) * 80}%`,
                      opacity: 0.8,
                    }}
                  />
                </div>
                <div style={{ fontSize: 10, color: "var(--token-color-palette-neutral-400)" }}>{d.month}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="card-title">🏆 {t[lang].topCourses}</div>
          {loading ? (
            <Spinner dark />
          ) : topCourses.length === 0 ? (
            <p style={{ textAlign: "center", color: "var(--text-muted)", padding: 20 }}>
              {lang === "fr" ? "Aucun cours actif" : "No active courses"}
            </p>
          ) : (
            topCourses.map((c) => (
              <div key={c.id} style={{ marginBottom: 14 }}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <CourseThumb
                      thumbnail={c.thumbnail || "??"}
                      color={c.color}
                      size={24}
                    />
                    <span style={{ fontSize: 13, fontWeight: 500 }}>
                      {c.title}
                    </span>
                  </div>
                  <span style={{ fontSize: 13, color: "var(--text-muted)" }}>
                    {c.completion_rate || 0}%
                  </span>
                </div>
                <ProgressBar value={c.completion_rate || 0} />
              </div>
            ))
          )}
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-title">⏳ {t[lang].pendingValidation}</div>
          {loading ? (
            <Spinner dark />
          ) : pendingCourses.length === 0 ? (
            <div
              style={{
                padding: "20px",
                textAlign: "center",
                color: "var(--text-muted)",
                fontSize: 14,
              }}
            >
              ✅{" "}
              {lang === "fr" ? "Aucun cours en attente" : "No pending courses"}
            </div>
          ) : (
            pendingCourses.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between"
                style={{
                  padding: 12,
                  background: "var(--surface-amber-100)",
                  borderRadius: 8,
                  marginBottom: 8,
                }}
              >
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{c.title}</div>
                  <div style={{ fontSize: 12, color: "var(--token-color-foreground-warning-high-contrast)" }}>
                    {c.teacherName}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    className="btn btn-success btn-sm"
                    onClick={() => navigate("/admin/courses")}
                  >
                    {t[lang].manage}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="card">
          <div className="card-title">🤖 {t[lang].aiReports}</div>
          {aiReport ? (
            <div
              style={{
                fontSize: 14,
                lineHeight: 1.7,
                color: "var(--primary-light)",
                background: "var(--bg)",
                padding: 14,
                borderRadius: 8,
              }}
            >
              {aiReport}
            </div>
          ) : (
            <AIPanel
              title={t[lang].generateReport}
              onAction={generateReport}
              actionLabel={t[lang].generateReport}
              loading={aiLoading}
            >
              <p style={{ fontSize: 13, color: "var(--token-color-foreground-action-active)" }}>
                {lang === "fr"
                  ? "Analysez les performances de votre plateforme avec l'IA."
                  : "Analyze your platform performance with AI."}
              </p>
            </AIPanel>
          )}
        </div>
      </div>
    </div>
  );
}
