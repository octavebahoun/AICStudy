import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { useApp } from "../../context/AppContext";
import {
  Icon,
  Badge,
  ProgressBar,
  AIPanel,
  Spinner,
} from "../../components/UI";
import {
  getCourseDetails,
  enrollInCourse,
  updateLessonProgress,
} from "../../services/db";
import { callAI, aiPrompts } from "../../services/ai";
import { supabase } from "../../services/supabase";
import t from "../../data/translations";

export function StudentCourseDetail() {
  const { state } = useApp();
  const { user, lang } = state;
  const navigate = useNavigate();
  const { id } = useParams();
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);

  useEffect(() => {
    fetchCourse();
  }, [id]);

  const fetchCourse = async () => {
    setLoading(true);
    try {
      const data = await getCourseDetails(id);
      setCourse(data);
    } catch (err) {
      console.error("Error fetching course:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleStartCourse = async () => {
    if (!user) {
      navigate("/login");
      return;
    }
    setEnrolling(true);
    try {
      await enrollInCourse(user.id, course.id);
      navigate(`/student/learn/${course.id}`);
    } catch (err) {
      console.error("Enrollment error:", err);
      alert(lang === "fr" ? "Erreur lors de l'inscription" : "Error enrolling");
    } finally {
      setEnrolling(false);
    }
  };

  const levelBadge = {
    beginner: "success",
    intermediate: "warning",
    advanced: "danger",
  };

  if (loading)
    return (
      <div className="page-content flex justify-center p-10">
        <Spinner dark />
      </div>
    );
  if (!course)
    return (
      <div className="page-content">
        {lang === "fr" ? "Cours non trouvé" : "Course not found"}
      </div>
    );

  const modules = course.modules || [];

  return (
    <div className="page-content fade-in">
      <div className="page-header flex items-center gap-3">
        <button
          className="btn-icon"
          onClick={() => navigate("/student/catalog")}
        >
          <Icon name="chevronLeft" size={18} />
        </button>
        <div>
          <h1 className="page-title">{course.title}</h1>
          <p className="page-subtitle">
            {course.category} · {course.level}
          </p>
        </div>
      </div>

      <div className="grid-2">
        <div>
          <div className="card mb-4">
            <div
              style={{
                width: "100%",
                height: 160,
                borderRadius: 8,
                background: `linear-gradient(135deg, ${course.color || "#3B82F6"}, ${course.color || "#3B82F6"}99)`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 52,
                color: "white",
                fontWeight: 700,
                marginBottom: 16,
                fontFamily: "Fraunces, serif",
              }}
            >
              {course.thumbnail || "??"}
            </div>
            <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }}>
              {course.title}
            </h2>
            <p
              style={{
                fontSize: 14,
                color: "#64748B",
                marginBottom: 16,
                lineHeight: 1.6,
              }}
            >
              {course.description}
            </p>
            <div className="flex gap-2 flex-wrap mb-4">
              <Badge type={levelBadge[course.level]}>
                {t[lang][course.level]}
              </Badge>
              <Badge type="info">{course.category}</Badge>
              <span style={{ fontSize: 13, color: "#64748B" }}>
                ⏱ {course.duration}
              </span>
              <span style={{ fontSize: 13, color: "#64748B" }}>
                📚 {modules.length} {t[lang].modules}
              </span>
            </div>
            <button
              className="btn btn-primary btn-full btn-lg"
              onClick={handleStartCourse}
              disabled={enrolling}
            >
              {enrolling ? (
                <Spinner />
              ) : (
                <>
                  <Icon name="play" size={16} />
                  {t[lang].startCourse}
                </>
              )}
            </button>
          </div>
        </div>

        <div className="card">
          <div className="card-title">📚 {t[lang].courseContent}</div>
          {modules.length === 0 ? (
            <div style={{ padding: 20, textAlign: "center", color: "#64748B" }}>
              {lang === "fr"
                ? "Contenu bientôt disponible"
                : "Content coming soon"}
            </div>
          ) : (
            modules
              .sort((a, b) => a.order - b.order)
              .map((m) => (
                <div key={m.id} style={{ marginBottom: 16 }}>
                  <div
                    style={{
                      fontWeight: 600,
                      fontSize: 13,
                      color: "#1E293B",
                      marginBottom: 6,
                      padding: "7px 10px",
                      background: "#F8FAFC",
                      borderRadius: 6,
                    }}
                  >
                    {lang === "fr" ? "Module" : "Module"} {m.order}: {m.title}
                  </div>
                  {(m.lessons || [])
                    .sort((a, b) => a.order - b.order)
                    .map((l) => (
                      <div
                        key={l.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          padding: "7px 12px",
                          borderRadius: 6,
                          fontSize: 13,
                          cursor: "pointer",
                        }}
                        onMouseEnter={(e) =>
                          (e.currentTarget.style.background = "#F8FAFC")
                        }
                        onMouseLeave={(e) =>
                          (e.currentTarget.style.background = "transparent")
                        }
                        onClick={() => navigate(`/student/learn/${course.id}`)}
                      >
                        <div
                          style={{
                            width: 20,
                            height: 20,
                            borderRadius: "50%",
                            background: l.completed ? "#10B981" : "#E2E8F0",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                          }}
                        >
                          {l.completed && (
                            <Icon name="check" size={11} color="white" />
                          )}
                        </div>
                        <span>{l.title}</span>
                        <span
                          style={{
                            fontSize: 11,
                            color: "#94A3B8",
                            marginLeft: "auto",
                          }}
                        >
                          {l.duration}
                        </span>
                      </div>
                    ))}
                </div>
              ))
          )}
        </div>
      </div>
    </div>
  );
}

export function StudentCourseReader() {
  const { state } = useApp();
  const { user, lang } = state;
  const navigate = useNavigate();
  const { id } = useParams();
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeLesson, setActiveLesson] = useState(null);
  const [aiMessages, setAiMessages] = useState([]);
  const [aiInput, setAiInput] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [summary, setSummary] = useState("");
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [fetchError, setFetchError] = useState(null);

  useEffect(() => {
    if (id && user?.id) fetchCourse();
  }, [id, user?.id]);

  const fetchCourse = async () => {
    setLoading(true);
    setFetchError(null);
    try {
      console.log("Reader: Fetching course details for ID:", id);
      const { data, error: courseErr } = await supabase
        .from("courses")
        .select("*, modules(*, lessons(*))")
        .eq("id", id)
        .single();

      if (courseErr) {
        console.error("Reader: Supabase error:", courseErr);
        setFetchError(courseErr.message);
        return;
      }

      console.log("Reader: Course data received:", data);

      if (!data) {
        setFetchError("Aucune donnée renvoyée.");
        return;
      }

      // Fetch progress
      if (user?.id) {
        console.log("Reader: Fetching progress for user:", user.id);
        const { data: progressData, error: progErr } = await supabase
          .from("lesson_progress")
          .select("*")
          .eq("student_id", user.id);

        if (progErr) console.error("Reader: Progress error:", progErr);

        const progressMap = {};
        (progressData || []).forEach((p) => {
          progressMap[p.lesson_id] = p.completed;
        });

        // Merge progress into lessons
        const modulesWithProgress = (data.modules || []).map((m) => ({
          ...m,
          lessons: (m.lessons || []).map((l) => ({
            ...l,
            completed: progressMap[l.id] || false,
          })),
        }));

        const courseWithProgress = { ...data, modules: modulesWithProgress };
        setCourse(courseWithProgress);

        const allLessons = modulesWithProgress.flatMap((m) => m.lessons || []);
        if (allLessons.length > 0) setActiveLesson(allLessons[0]);
      } else {
        setCourse(data);
        const allLessons = (data.modules || []).flatMap((m) => m.lessons || []);
        if (allLessons.length > 0) setActiveLesson(allLessons[0]);
      }

      setAiMessages([
        {
          role: "assistant",
          text:
            lang === "fr"
              ? `Bonjour ! Je suis votre assistant pour le cours "${data.title}". Posez-moi vos questions !`
              : `Hello! I'm your assistant for "${data.title}". Ask me anything!`,
        },
      ]);
    } catch (err) {
      console.error("Error fetching course details:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleComplete = async (lessonId) => {
    if (!user) return;
    try {
      const isCompleted = !activeLesson.completed;
      await updateLessonProgress(user.id, lessonId, isCompleted);

      // Update local state
      const updatedModules = course.modules.map((m) => ({
        ...m,
        lessons: m.lessons.map((l) => {
          if (l.id === lessonId) return { ...l, completed: isCompleted };
          return l;
        }),
      }));
      setCourse({ ...course, modules: updatedModules });
      setActiveLesson({ ...activeLesson, completed: isCompleted });

      // If just completed and next lesson exists, maybe wait or show congrats?
      // For now just stay on current.
    } catch (err) {
      console.error(err);
    }
  };

  const sendAiMessage = async () => {
    if (!aiInput.trim()) return;
    const msg = aiInput;
    setAiMessages((prev) => [...prev, { role: "user", text: msg }]);
    setAiInput("");
    setAiLoading(true);
    const result = await callAI(
      aiPrompts.courseAssistant(msg, course.title, lang),
      lang,
    );
    setAiMessages((prev) => [...prev, { role: "assistant", text: result }]);
    setAiLoading(false);
  };

  const generateSummary = async () => {
    setSummaryLoading(true);
    const result = await callAI(
      aiPrompts.lessonSummary(activeLesson?.title, course.title, lang),
      lang,
    );
    setSummary(result);
    setSummaryLoading(false);
  };

  if (loading)
    return (
      <div className="page-content flex justify-center p-10">
        <Spinner dark />
      </div>
    );
  if (!course)
    return (
      <div className="page-content">
        {lang === "fr" ? "Cours non trouvé" : "Course not found"}
      </div>
    );

  const modules = course.modules || [];
  const allLessons = modules.flatMap((m) => m.lessons || []);
  const currentIndex = allLessons.findIndex((l) => l.id === activeLesson?.id);
  const prevLesson = currentIndex > 0 ? allLessons[currentIndex - 1] : null;
  const nextLesson =
    currentIndex < allLessons.length - 1 ? allLessons[currentIndex + 1] : null;

  return (
    <div className="page-content fade-in">
      <div className="page-header flex items-center gap-3">
        <button
          className="btn-icon"
          onClick={() => navigate(`/student/course/${course.id}`)}
        >
          <Icon name="chevronLeft" size={18} />
        </button>
        <div>
          <h1 className="page-title" style={{ fontSize: 20 }}>
            {course.title}
          </h1>
          <p className="page-subtitle">{activeLesson?.title}</p>
        </div>
      </div>

      <div className="learn-grid">
        <div>
          <div className="card mb-4">
            <div
              style={{
                background: `linear-gradient(135deg, ${course.color || "#3B82F6"}20, ${course.color || "#3B82F6"}10)`,
                borderRadius: 8,
                padding: "32px",
                textAlign: "center",
                marginBottom: 16,
                fontSize: 52,
              }}
            >
              {course.thumbnail || "??"}
            </div>
            <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 10 }}>
              {activeLesson?.title}
            </h2>
            <div className="prose">
              {activeLesson?.content ? (
                <ReactMarkdown>{activeLesson.content}</ReactMarkdown>
              ) : (
                <p style={{ color: "#94A3B8", fontStyle: "italic" }}>
                  {lang === "fr"
                    ? "Contenu de la leçon en attente."
                    : "Lesson content pending."}
                </p>
              )}
            </div>
            <div className="flex gap-3 mt-8 justify-between">
              <button
                className="btn btn-ghost"
                disabled={!prevLesson}
                onClick={() => prevLesson && setActiveLesson(prevLesson)}
              >
                <Icon name="chevronLeft" size={15} />
                {t[lang].previous}
              </button>

              <button
                className={`btn ${activeLesson?.completed ? "btn-ghost" : "btn-success"}`}
                onClick={() => handleToggleComplete(activeLesson.id)}
                style={{ flex: 1, margin: "0 10px", justifyContent: "center" }}
              >
                {activeLesson?.completed ? (
                  <>
                    <Icon name="check" size={15} />{" "}
                    {lang === "fr" ? "Terminé" : "Completed"}
                  </>
                ) : lang === "fr" ? (
                  "Marquer comme terminé"
                ) : (
                  "Mark as completed"
                )}
              </button>

              <button
                className="btn btn-primary"
                disabled={!nextLesson}
                onClick={() => nextLesson && setActiveLesson(nextLesson)}
              >
                {t[lang].next} <Icon name="chevronRight" size={15} />
              </button>
            </div>
          </div>

          {summary && (
            <div className="card mb-4 ai-summary-card">
              <div className="card-title">
                📝 {lang === "fr" ? "Résumé IA" : "AI Summary"}
              </div>
              <p
                style={{
                  fontSize: 14,
                  lineHeight: 1.7,
                  color: "#374151",
                  whiteSpace: "pre-wrap",
                }}
              >
                {summary}
              </p>
            </div>
          )}

          <AIPanel
            title={
              lang === "fr" ? "Résumer cette leçon" : "Summarize this lesson"
            }
            onAction={generateSummary}
            actionLabel={t[lang].summarize}
            loading={summaryLoading}
          >
            <p style={{ fontSize: 13, color: "#1E40AF" }}>
              {lang === "fr"
                ? "Obtenez les points clés de cette leçon."
                : "Get the key points of this lesson."}
            </p>
          </AIPanel>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="card">
            <div className="card-title">📚 {t[lang].modules}</div>
            {modules
              .sort((a, b) => a.order - b.order)
              .map((m) => (
                <div key={m.id} style={{ marginBottom: 12 }}>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: "#94A3B8",
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                      marginBottom: 4,
                    }}
                  >
                    {m.title}
                  </div>
                  {(m.lessons || [])
                    .sort((a, b) => a.order - b.order)
                    .map((l) => (
                      <div
                        key={l.id}
                        className={`lesson-item ${activeLesson?.id === l.id ? "active-lesson" : ""}`}
                        onClick={() => setActiveLesson(l)}
                      >
                        <div
                          className={`lesson-check ${l.completed ? "done" : "pending"}`}
                        >
                          {l.completed && (
                            <Icon name="check" size={11} color="white" />
                          )}
                        </div>
                        <span
                          style={{
                            fontSize: 12,
                            fontWeight: activeLesson?.id === l.id ? 600 : 400,
                          }}
                        >
                          {l.title}
                        </span>
                        <span
                          style={{
                            fontSize: 11,
                            color: "#94A3B8",
                            marginLeft: "auto",
                          }}
                        >
                          {l.duration}
                        </span>
                      </div>
                    ))}
                </div>
              ))}
          </div>

          <div
            className="card"
            style={{ flex: 1, display: "flex", flexDirection: "column" }}
          >
            <div className="card-title">🤖 {t[lang].aiAssistant}</div>
            <div
              className="ai-chat"
              style={{
                flex: 1,
                overflowY: "auto",
                marginBottom: 10,
                maxHeight: 300,
              }}
            >
              {aiMessages.map((m, i) => (
                <div key={i} className={`ai-msg ${m.role}`}>
                  {m.text}
                </div>
              ))}
              {aiLoading && (
                <div className="ai-msg assistant">
                  <div className="spinner spinner-dark" />
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <input
                className="input"
                style={{ flex: 1 }}
                placeholder={t[lang].askQuestion}
                value={aiInput}
                onChange={(e) => setAiInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendAiMessage()}
              />
              <button
                className="btn btn-accent"
                onClick={sendAiMessage}
                disabled={aiLoading}
              >
                <Icon name="send" size={15} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
