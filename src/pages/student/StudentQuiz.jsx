import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useApp } from "../../context/AppContext";
import { Icon, Spinner } from "../../components/UI";
import { getQuizDetails, completeCourseIfEligible } from "../../services/db";
import { supabase } from "../../services/supabase";
import { callAI, aiPrompts } from "../../services/ai";
import t from "../../data/translations";

export default function StudentQuiz() {
  const { state } = useApp();
  const { user, lang } = state;
  const navigate = useNavigate();
  const { courseId } = useParams();

  const [quiz, setQuiz] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentQ, setCurrentQ] = useState(0);
  const [selected, setSelected] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [answers, setAnswers] = useState([]);
  const [finished, setFinished] = useState(false);
  const [aiExplanation, setAiExplanation] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [savingResult, setSavingResult] = useState(false);

  useEffect(() => {
    fetchQuiz();
  }, [courseId]);

  const fetchQuiz = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getQuizDetails(courseId);
      setQuiz(data);
    } catch (err) {
      if (err?.code === "PGRST116") {
        setError("no_quiz");
      } else {
        setError(err.message || "error");
      }
      console.error("Error fetching quiz:", err);
    } finally {
      setLoading(false);
    }
  };

  const getExplanation = async (q, userAnswer) => {
    setAiLoading(true);
    const result = await callAI(
      aiPrompts.quizExplanation(
        q.text,
        q.options[q.correct_index],
        q.options[userAnswer],
        q.explanation,
        lang,
      ),
      lang,
    );
    setAiExplanation(result);
    setAiLoading(false);
  };

  const handleSubmit = () => {
    if (selected === null) return;
    const newAnswers = [...answers, selected];
    setAnswers(newAnswers);
    setSubmitted(true);
    if (selected !== quiz.questions[currentQ].correct_index) {
      getExplanation(quiz.questions[currentQ], selected);
    }
  };

  const saveAttempt = async (finalScore) => {
    if (!user || !quiz) return;
    setSavingResult(true);
    try {
      const pct = Math.round((finalScore / quiz.questions.length) * 100);
      const passed = pct >= quiz.passing_score;
      const { error: attemptError } = await supabase.from("quiz_attempts").insert({
        student_id: user.id,
        quiz_id: quiz.id,
        score: pct,
        passed: passed,
        created_at: new Date().toISOString(),
      });
      if (attemptError) throw attemptError;
      if (passed) {
        await completeCourseIfEligible(user.id, courseId);
      }
    } catch (err) {
      console.error("Error saving quiz attempt:", err);
    } finally {
      setSavingResult(false);
    }
  };

  const handleNext = () => {
    if (currentQ + 1 >= quiz.questions.length) {
      const finalScore = answers.filter(
        (a, i) => a === quiz.questions[i]?.correct_index,
      ).length;
      saveAttempt(finalScore);
      setFinished(true);
    } else {
      setCurrentQ(currentQ + 1);
      setSelected(null);
      setSubmitted(false);
      setAiExplanation("");
    }
  };

  const reset = () => {
    setCurrentQ(0);
    setAnswers([]);
    setSelected(null);
    setSubmitted(false);
    setFinished(false);
    setAiExplanation("");
  };

  if (loading)
    return (
      <div className="page-content flex justify-center p-10">
        <Spinner dark />
      </div>
    );

  if (error === "no_quiz" || !quiz)
    return (
      <div
        className="page-content"
        style={{ textAlign: "center", paddingTop: 60 }}
      >
        <div style={{ fontSize: 48, marginBottom: 16 }}>📝</div>
        <h2 style={{ color: "var(--primary-light)", marginBottom: 8 }}>
          {lang === "fr" ? "Aucun quiz disponible" : "No quiz available"}
        </h2>
        <p style={{ color: "var(--token-color-palette-neutral-400)", fontSize: 14, marginBottom: 24 }}>
          {lang === "fr"
            ? "Ce cours n'a pas encore de quiz."
            : "This course doesn't have a quiz yet."}
        </p>
        <button className="btn btn-ghost" onClick={() => navigate(-1)}>
          ← {lang === "fr" ? "Retour" : "Back"}
        </button>
      </div>
    );

  if (error)
    return (
      <div
        className="page-content"
        style={{ textAlign: "center", paddingTop: 60 }}
      >
        <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
        <h2 style={{ color: "var(--danger)", marginBottom: 8 }}>
          {lang === "fr" ? "Erreur de chargement" : "Loading error"}
        </h2>
        <p style={{ color: "var(--token-color-palette-neutral-400)", fontSize: 14, marginBottom: 24 }}>
          {error}
        </p>
        <button className="btn btn-primary" onClick={fetchQuiz}>
          {lang === "fr" ? "Réessayer" : "Retry"}
        </button>
      </div>
    );

  const question = quiz.questions[currentQ];
  const score =
    quiz.questions.length > 0
      ? answers.filter((a, i) => a === quiz.questions[i]?.correct_index).length
      : 0;

  if (finished) {
    const pct = Math.round((score / quiz.questions.length) * 100);
    const passed = pct >= quiz.passing_score;

    return (
      <div className="page-content fade-in">
        <div style={{ maxWidth: 500, margin: "0 auto" }}>
          <div
            className="cert-card mb-4"
            style={{
              background: passed
                ? "linear-gradient(135deg, var(--success), var(--token-color-foreground-success-on-surface))"
                : "linear-gradient(135deg, var(--danger), var(--token-color-foreground-critical-on-surface))",
            }}
          >
            <div style={{ fontSize: 52, marginBottom: 16 }}>
              {passed ? "🎉" : "📚"}
            </div>
            <h2
              style={{
                fontFamily: "Fraunces, serif",
                fontSize: 26,
                marginBottom: 8,
              }}
            >
              {passed ? t[lang].passed : t[lang].failed}
            </h2>
            <div
              style={{
                fontSize: 52,
                fontWeight: 700,
                color: "white",
                margin: "12px 0",
              }}
            >
              {pct}%
            </div>
            <p style={{ color: "rgba(255,255,255,0.8)", fontSize: 14 }}>
              {score}/{quiz.questions.length}{" "}
              {lang === "fr" ? "bonnes réponses" : "correct answers"} ·{" "}
              {lang === "fr" ? "Seuil" : "Threshold"}:{" "}
              {quiz.passing_score || 70}%
            </p>
          </div>
          <div className="flex gap-3">
            <button
              className="btn btn-ghost w-full"
              style={{ justifyContent: "center" }}
              onClick={reset}
            >
              {t[lang].retry}
            </button>
            <button
              className="btn btn-primary w-full"
              style={{ justifyContent: "center" }}
              onClick={() => navigate("/student")}
            >
              {t[lang].back}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!question)
    return <div className="page-content">Aucune question dans ce quiz.</div>;

  return (
    <div className="page-content fade-in">
      <div style={{ maxWidth: 680, margin: "0 auto" }}>
        <div className="page-header flex justify-between items-center">
          <div>
            <h1 className="page-title" style={{ fontSize: 20 }}>
              {quiz.title}
            </h1>
            <p className="page-subtitle">
              {t[lang].questions} {currentQ + 1}/{quiz.questions.length}
            </p>
          </div>
          <div style={{ fontSize: 14, color: "var(--text-muted)" }}>
            ⏱ {quiz.time_limit} {t[lang].minutes}
          </div>
        </div>

        <div style={{ marginBottom: 24 }}>
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${(currentQ / quiz.questions.length) * 100}%` }}
            />
          </div>
        </div>

        <div className="card">
          <h3
            style={{
              fontSize: 18,
              fontWeight: 600,
              marginBottom: 20,
              lineHeight: 1.4,
            }}
          >
            {question.text}
          </h3>

          {(question.options || []).map((opt, i) => {
            let cls = "quiz-option";
            if (submitted) {
              if (i === question.correct_index) cls += " correct";
              else if (i === selected) cls += " wrong";
            } else if (i === selected) {
              cls += " selected";
            }
            return (
              <div
                key={i}
                className={cls}
                onClick={() => !submitted && setSelected(i)}
              >
                <span
                  style={{ fontWeight: 600, marginRight: 8, color: "var(--token-color-palette-neutral-400)" }}
                >
                  {["A", "B", "C", "D"][i]}.
                </span>
                {opt}
              </div>
            );
          })}

          {submitted && (
            <div
              style={{
                marginTop: 12,
                padding: 14,
                borderRadius: 8,
                background:
                  selected === question.correct_index ? "var(--surface-green-100)" : "var(--surface-red-100)",
              }}
            >
              <div
                style={{
                  fontWeight: 600,
                  fontSize: 14,
                  color:
                    selected === question.correct_index ? "var(--token-color-foreground-success-high-contrast)" : "var(--token-color-foreground-critical-high-contrast)",
                  marginBottom: 6,
                }}
              >
                {selected === question.correct_index
                  ? `✅ ${t[lang].correctFeedback}`
                  : `❌ ${t[lang].incorrectFeedback}`}
              </div>
              {aiLoading ? (
                <div className="flex items-center gap-2">
                  <Spinner dark />
                  <span style={{ fontSize: 13, color: "var(--text-muted)" }}>
                    IA en cours...
                  </span>
                </div>
              ) : (
                <p style={{ fontSize: 13, lineHeight: 1.6, color: "var(--primary-light)" }}>
                  {aiExplanation || question.explanation}
                </p>
              )}
            </div>
          )}

          <div className="flex gap-3 mt-4">
            {!submitted ? (
              <button
                className="btn btn-primary btn-full"
                onClick={handleSubmit}
                disabled={selected === null}
              >
                {t[lang].submit}
              </button>
            ) : (
              <button className="btn btn-accent btn-full" onClick={handleNext}>
                {currentQ + 1 < quiz.questions.length
                  ? t[lang].next
                  : lang === "fr"
                    ? "Voir les résultats"
                    : "See results"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

//semaine 4 : j'ai fini les etudiants
