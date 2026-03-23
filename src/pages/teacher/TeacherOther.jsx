import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useApp } from "../../context/AppContext";
import {
  Icon,
  Avatar,
  Badge,
  ProgressBar,
  AIPanel,
  Spinner,
} from "../../components/UI";
import { supabase } from "../../services/supabase";
import { callAI, aiPrompts } from "../../services/ai";
import t from "../../data/translations";

export function TeacherQuiz() {
  const { state } = useApp();
  const { lang } = state;
  const navigate = useNavigate();
  const { courseId } = useParams();

  const [course, setCourse] = useState(null);
  const [quiz, setQuiz] = useState(null);
  const [loading, setLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiQuestions, setAiQuestions] = useState("");
  const [saveLoading, setSaveLoading] = useState(false);
  // Controlle des quizs
  const [quizTitle, setQuizTitle] = useState("");
  const [passingScore, setPassingScore] = useState(70);
  const [timeLimit, setTimeLimit] = useState(30);
  const [showAddQ, setShowAddQ] = useState(false);
  const [newQ, setNewQ] = useState({
    text: "",
    options: ["", "", "", ""],
    correct_index: 0,
    explanation: "",
  });
  const [addingQ, setAddingQ] = useState(false);
  const [editingQId, setEditingQId] = useState(null);
  const [aiCount, setAiCount] = useState(3);
  const [activeTab, setActiveTab] = useState("questions");
  const [attempts, setAttempts] = useState([]);
  const [loadingAttempts, setLoadingAttempts] = useState(false);

  useEffect(() => {
    fetchQuiz();
    if (activeTab === "results") fetchAttempts();
  }, [courseId, activeTab]);

  const fetchQuiz = async () => {
    setLoading(true);
    try {
      const { data: cData, error: cErr } = await supabase
        .from("courses")
        .select("id, title")
        .eq("id", courseId)
        .single();
      if (cErr) throw cErr;
      setCourse(cData);

      const { data: qData, error: qErr } = await supabase
        .from("quizzes")
        .select("*, questions(*)")
        .eq("course_id", courseId)
        .single();

      if (qErr && qErr.code !== "PGRST116") throw qErr;

      if (qData) {
        const sortedQuiz = {
          ...qData,
          questions: (qData.questions || []).sort((a, b) => a.order - b.order),
        };
        setQuiz(sortedQuiz);
        setQuizTitle(qData.title || "");
        setPassingScore(qData.passing_score || 70);
        setTimeLimit(qData.time_limit || 30);
      }
    } catch (err) {
      console.error("Error fetching quiz:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAttempts = async () => {
    if (!quiz) return;
    setLoadingAttempts(true);
    try {
      const { data, error } = await supabase
        .from("quiz_attempts")
        .select("*, student:users(full_name, email)")
        .eq("quiz_id", quiz.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      setAttempts(data || []);
    } catch (err) {
      console.error("Error fetching attempts:", err);
    } finally {
      setLoadingAttempts(false);
    }
  };

  const handleCreateQuiz = async () => {
    setSaveLoading(true);
    try {
      const { data, error } = await supabase
        .from("quizzes")
        .insert({
          course_id: courseId,
          title: `Quiz : ${course.title}`,
          passing_score: 70,
          time_limit: 30,
        })
        .select()
        .single();
      if (error) throw error;
      setQuiz({ ...data, questions: [] });
      setQuizTitle(data.title);
      setPassingScore(data.passing_score);
      setTimeLimit(data.time_limit);
    } catch (err) {
      alert(err.message);
    } finally {
      setSaveLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    if (!quiz) return;
    setSaveLoading(true);
    try {
      const { error } = await supabase
        .from("quizzes")
        .update({
          title: quizTitle,
          passing_score: passingScore,
          time_limit: timeLimit,
        })
        .eq("id", quiz.id);
      if (error) throw error;
      setQuiz((q) => ({
        ...q,
        title: quizTitle,
        passing_score: passingScore,
        time_limit: timeLimit,
      }));
      alert(lang === "fr" ? "Paramètres sauvegardés !" : "Settings saved!");
    } catch (err) {
      alert(err.message);
    } finally {
      setSaveLoading(false);
    }
  };

  const handleSaveQuestion = async () => {
    if (!newQ.text.trim() || newQ.options.some((o) => !o.trim())) {
      alert(lang === "fr" ? "Remplissez tous les champs." : "Fill all fields.");
      return;
    }
    setAddingQ(true);
    try {
      if (editingQId) {
        const { data, error } = await supabase
          .from("questions")
          .update({
            text: newQ.text,
            options: newQ.options,
            correct_index: newQ.correct_index,
            explanation: newQ.explanation,
          })
          .eq("id", editingQId)
          .select()
          .single();
        if (error) throw error;
        setQuiz((q) => ({
          ...q,
          questions: q.questions.map((x) => (x.id === editingQId ? data : x)),
        }));
      } else {
        const { data, error } = await supabase
          .from("questions")
          .insert({
            quiz_id: quiz.id,
            text: newQ.text,
            options: newQ.options,
            correct_index: newQ.correct_index,
            explanation: newQ.explanation,
            order: (quiz.questions || []).length + 1,
          })
          .select()
          .single();
        if (error) throw error;
        setQuiz((q) => ({ ...q, questions: [...(q.questions || []), data] }));
      }

      setNewQ({
        text: "",
        options: ["", "", "", ""],
        correct_index: 0,
        explanation: "",
      });
      setEditingQId(null);
      setShowAddQ(false);
    } catch (err) {
      alert(err.message);
    } finally {
      setAddingQ(false);
    }
  };

  const handleEditQuestion = (q) => {
    setEditingQId(q.id);
    setNewQ({
      text: q.text,
      options: [...q.options],
      correct_index: q.correct_index,
      explanation: q.explanation || "",
    });
    setShowAddQ(true);
  };

  const handleDeleteQuestion = async (qId) => {
    if (
      !confirm(
        lang === "fr" ? "Supprimer cette question ?" : "Delete this question?",
      )
    )
      return;
    const { error } = await supabase.from("questions").delete().eq("id", qId);
    if (!error)
      setQuiz((q) => ({
        ...q,
        questions: q.questions.filter((x) => x.id !== qId),
      }));
  };

  const generateQuiz = async () => {
    if (!course || !quiz) return;
    setAiLoading(true);
    setAiQuestions("");
    try {
      const result = await callAI(
        aiPrompts.generateQuiz(course.title, aiCount, lang),
        lang,
      );

      // je parse le json ici
      const jsonStr = result.includes("[")
        ? result.substring(result.indexOf("["), result.lastIndexOf("]") + 1)
        : result;
      const questionsData = JSON.parse(jsonStr);

      if (Array.isArray(questionsData)) {
        // ici j'enregistrer les questions une à une
        const newQuestions = [];
        let lastOrder = (quiz.questions || []).length;

        for (const qData of questionsData) {
          lastOrder++;
          const { data, error } = await supabase
            .from("questions")
            .insert({
              quiz_id: quiz.id,
              text: qData.text,
              options: qData.options,
              correct_index: qData.correct_index,
              explanation: qData.explanation || "",
              order: lastOrder,
            })
            .select()
            .single();

          if (!error && data) {
            newQuestions.push(data);
          }
        }

        setQuiz((q) => ({
          ...q,
          questions: [...(q.questions || []), ...newQuestions],
        }));

        alert(
          lang === "fr"
            ? `${newQuestions.length} questions générées et ajoutées !`
            : `${newQuestions.length} questions generated and added!`,
        );
      } else {
        throw new Error("Invalid format");
      }
    } catch (err) {
      console.error("Error generating/saving AI quiz:", err);
      alert(
        lang === "fr"
          ? "Erreur lors de la génération. Essayez avec moins de questions."
          : "Error during generation. Try with fewer questions.",
      );
    } finally {
      setAiLoading(false);
    }
  };

  if (loading)
    return (
      <div className="page-content center">
        <Spinner dark />
      </div>
    );

  if (!quiz) {
    return (
      <div className="page-content center flex-col gap-4">
        <Icon name="quiz" size={48} color="#94A3B8" />
        <h2 style={{ color: "#475569" }}>
          {lang === "fr"
            ? "Aucun quiz pour ce cours"
            : "No quiz for this course"}
        </h2>
        <button
          className="btn btn-primary"
          onClick={handleCreateQuiz}
          disabled={saveLoading}
        >
          {saveLoading ? (
            <Spinner />
          ) : lang === "fr" ? (
            "Créer un quiz"
          ) : (
            "Create a quiz"
          )}
        </button>
      </div>
    );
  }

  return (
    <div className="page-content fade-in">
      <div className="page-header flex items-center gap-3">
        <button
          className="btn-icon"
          onClick={() => navigate("/teacher/courses")}
        >
          <Icon name="chevronLeft" size={18} />
        </button>
        <div>
          <h1 className="page-title">{quiz.title}</h1>
          <div className="flex gap-4 mt-3">
            {[
              {
                id: "questions",
                label: lang === "fr" ? "Questions" : "Questions",
              },
              { id: "results", label: lang === "fr" ? "Résultats" : "Results" },
              {
                id: "settings",
                label: lang === "fr" ? "Paramètres" : "Settings",
              },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: "6px 0",
                  fontSize: 14,
                  fontWeight: activeTab === tab.id ? 600 : 400,
                  color: activeTab === tab.id ? "var(--primary)" : "#64748B",
                  borderBottom:
                    activeTab === tab.id
                      ? "2px solid var(--primary)"
                      : "2px solid transparent",
                  background: "none",
                  borderTop: "none",
                  borderLeft: "none",
                  borderRight: "none",
                  cursor: "pointer",
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {activeTab === "questions" && (
        <div className="grid-2">
          <div className="card">
            <div className="flex justify-between items-center mb-4">
              <div className="card-title" style={{ margin: 0 }}>
                {t[lang].questions} ({(quiz.questions || []).length})
              </div>
              <button
                className="btn btn-accent btn-sm"
                onClick={() => {
                  setEditingQId(null);
                  setNewQ({
                    text: "",
                    options: ["", "", "", ""],
                    correct_index: 0,
                    explanation: "",
                  });
                  setShowAddQ(true);
                }}
              >
                <Icon name="plus" size={13} />
                {t[lang].addQuestion}
              </button>
            </div>
            {/* Modal ajout/edit question */}
            {showAddQ && (
              <div
                style={{
                  background: "#F8FAFC",
                  border: "1px solid #E2E8F0",
                  borderRadius: 10,
                  padding: 16,
                  marginBottom: 12,
                }}
              >
                <div className="card-title" style={{ fontSize: 14 }}>
                  {editingQId
                    ? lang === "fr"
                      ? "Modifier la question"
                      : "Edit Question"
                    : lang === "fr"
                      ? "Nouvelle question"
                      : "New Question"}
                </div>
                <div className="input-group">
                  <label className="input-label">
                    {lang === "fr" ? "Question" : "Question"}
                  </label>
                  <input
                    className="input"
                    value={newQ.text}
                    onChange={(e) => setNewQ({ ...newQ, text: e.target.value })}
                    placeholder={
                      lang === "fr"
                        ? "Texte de la question..."
                        : "Question text..."
                    }
                  />
                </div>
                {newQ.options.map((opt, oi) => (
                  <div className="input-group" key={oi}>
                    <label
                      className="input-label"
                      style={{ display: "flex", alignItems: "center", gap: 8 }}
                    >
                      <input
                        type="radio"
                        name="correct"
                        checked={newQ.correct_index === oi}
                        onChange={() => setNewQ({ ...newQ, correct_index: oi })}
                      />
                      {["A", "B", "C", "D"][oi]}.
                    </label>
                    <input
                      className="input"
                      value={opt}
                      onChange={(e) => {
                        const opts = [...newQ.options];
                        opts[oi] = e.target.value;
                        setNewQ({ ...newQ, options: opts });
                      }}
                      placeholder={`Option ${["A", "B", "C", "D"][oi]}`}
                    />
                  </div>
                ))}
                <div className="input-group">
                  <label className="input-label">
                    {lang === "fr"
                      ? "Explication (optionnel)"
                      : "Explanation (optional)"}
                  </label>
                  <input
                    className="input"
                    value={newQ.explanation}
                    onChange={(e) =>
                      setNewQ({ ...newQ, explanation: e.target.value })
                    }
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={handleSaveQuestion}
                    disabled={addingQ}
                  >
                    {addingQ ? (
                      <Spinner />
                    ) : lang === "fr" ? (
                      "Enregistrer"
                    ) : (
                      "Save"
                    )}
                  </button>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => setShowAddQ(false)}
                  >
                    {lang === "fr" ? "Annuler" : "Cancel"}
                  </button>
                </div>
              </div>
            )}

            {(quiz.questions || []).length === 0 ? (
              <p
                style={{
                  textAlign: "center",
                  color: "#94A3B8",
                  padding: 20,
                  fontSize: 13,
                }}
              >
                {lang === "fr"
                  ? "Aucune question. Cliquez sur + ou utilisez l'IA !"
                  : "No questions. Click + or use AI!"}
              </p>
            ) : (
              (quiz.questions || []).map((q, i) => (
                <div
                  key={q.id || i}
                  style={{
                    border: "1px solid #E2E8F0",
                    borderRadius: 8,
                    padding: 12,
                    marginBottom: 8,
                  }}
                >
                  <div className="flex justify-between mb-2">
                    <span style={{ fontSize: 13, fontWeight: 600, flex: 1 }}>
                      Q{i + 1}. {q.text}
                    </span>
                    <div className="flex gap-2">
                      <button
                        className="btn-icon"
                        onClick={() => handleEditQuestion(q)}
                      >
                        <Icon name="edit" size={14} color="var(--primary)" />
                      </button>
                      <button
                        className="btn-icon"
                        onClick={() => handleDeleteQuestion(q.id)}
                      >
                        <Icon name="trash" size={14} color="#EF4444" />
                      </button>
                    </div>
                  </div>
                  {(q.options || []).map((o, oi) => (
                    <div
                      key={oi}
                      style={{
                        fontSize: 12,
                        padding: "4px 8px",
                        borderRadius: 4,
                        background:
                          oi === q.correct_index ? "#D1FAE5" : "#F8FAFC",
                        color: oi === q.correct_index ? "#065F46" : "#64748B",
                        marginBottom: 2,
                      }}
                    >
                      {oi === q.correct_index ? "✅" : "○"} {o}
                    </div>
                  ))}
                </div>
              ))
            )}
          </div>

          <AIPanel
            title={t[lang].generateQuiz}
            onAction={generateQuiz}
            actionLabel={t[lang].generateQuiz}
            loading={aiLoading}
          >
            <p style={{ fontSize: 13, color: "#1E40AF", marginBottom: 12 }}>
              {lang === "fr"
                ? "Générez des questions depuis le contenu du cours."
                : "Generate questions from course content."}
            </p>

            <div className="input-group" style={{ maxWidth: 200 }}>
              <label className="input-label">
                {lang === "fr" ? "Nombre de questions" : "Number of questions"}
              </label>
              <input
                type="number"
                className="input"
                min={1}
                max={10}
                value={aiCount}
                onChange={(e) => setAiCount(parseInt(e.target.value) || 1)}
              />
            </div>

            {aiQuestions && (
              <div
                style={{
                  marginTop: 8,
                  fontSize: 13,
                  lineHeight: 1.7,
                  color: "#374151",
                  background: "white",
                  padding: 10,
                  borderRadius: 6,
                  whiteSpace: "pre-wrap",
                }}
              >
                {aiQuestions}
              </div>
            )}
          </AIPanel>
        </div>
      )}

      {activeTab === "results" && (
        <div className="card">
          <div className="card-title">
            👨‍🎓 {lang === "fr" ? "Résultats des Étudiants" : "Student Results"}
          </div>
          {loadingAttempts ? (
            <Spinner dark />
          ) : attempts.length === 0 ? (
            <p style={{ padding: 20, textAlign: "center", color: "#64748B" }}>
              {lang === "fr"
                ? "Aucune tentative enregistrée."
                : "No attempts recorded."}
            </p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>{lang === "fr" ? "Étudiant" : "Student"}</th>
                    <th>Score</th>
                    <th>{lang === "fr" ? "Statut" : "Status"}</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {attempts.map((a) => (
                    <tr key={a.id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>
                          {a.student?.full_name}
                        </div>
                        <div style={{ fontSize: 11, color: "#94A3B8" }}>
                          {a.student?.email}
                        </div>
                      </td>
                      <td style={{ fontWeight: 700, fontSize: 16 }}>
                        {a.score}%
                      </td>
                      <td>
                        <Badge type={a.passed ? "success" : "danger"}>
                          {a.passed
                            ? lang === "fr"
                              ? "Réussi"
                              : "Passed"
                            : lang === "fr"
                              ? "Échoué"
                              : "Failed"}
                        </Badge>
                      </td>
                      <td style={{ fontSize: 12, color: "#64748B" }}>
                        {new Date(a.created_at).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === "settings" && (
        <div className="card" style={{ maxWidth: 600 }}>
          <div
            className="card-title"
            style={{ display: "flex", alignItems: "center", gap: 8 }}
          >
            <Icon name="settings" size={16} color="var(--primary)" />
            {lang === "fr" ? "Paramètres du Quiz" : "Quiz Settings"}
          </div>
          <div className="input-group">
            <label className="input-label">{t[lang].title}</label>
            <input
              className="input"
              value={quizTitle}
              onChange={(e) => setQuizTitle(e.target.value)}
            />
          </div>
          <div className="grid-2">
            <div className="input-group">
              <label className="input-label">{t[lang].passingScore} (%)</label>
              <input
                className="input"
                type="number"
                min={0}
                max={100}
                value={passingScore}
                onChange={(e) => setPassingScore(Number(e.target.value))}
              />
            </div>
            <div className="input-group">
              <label className="input-label">{t[lang].timeLimit} (min)</label>
              <input
                className="input"
                type="number"
                min={1}
                value={timeLimit}
                onChange={(e) => setTimeLimit(Number(e.target.value))}
              />
            </div>
          </div>
          <button
            className="btn btn-primary"
            onClick={handleSaveSettings}
            disabled={saveLoading}
          >
            {saveLoading ? <Spinner /> : t[lang].save}
          </button>
        </div>
      )}
    </div>
  );
}

export function TeacherStudents() {
  const { state } = useApp();
  const { lang } = state;
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStudents = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("users")
          .select("*")
          .eq("role", "student")
          .order("full_name");
        if (error) throw error;
        setStudents(data || []);
      } catch (err) {
        console.error("Error fetching students:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchStudents();
  }, []);

  return (
    <div className="page-content fade-in">
      <div className="page-header">
        <h1 className="page-title">{t[lang].students}</h1>
        <p className="page-subtitle">
          {loading ? "..." : students.length}{" "}
          {lang === "fr"
            ? "étudiants dans vos cours"
            : "students in your courses"}
        </p>
      </div>
      <div className="card">
        {loading ? (
          <div
            style={{ display: "flex", justifyContent: "center", padding: 40 }}
          >
            <Spinner dark />
          </div>
        ) : students.length === 0 ? (
          <p style={{ textAlign: "center", color: "#94A3B8", padding: 40 }}>
            {lang === "fr"
              ? "Aucun étudiant inscrit."
              : "No students enrolled."}
          </p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="table">
              <thead>
                <tr>
                  <th>{lang === "fr" ? "Étudiant" : "Student"}</th>
                  <th>{lang === "fr" ? "Email" : "Email"}</th>
                  <th>{lang === "fr" ? "Statut" : "Status"}</th>
                  <th>{lang === "fr" ? "Inscrit le" : "Joined"}</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <Avatar
                          initials={
                            s.avatar_url ||
                            (s.full_name || "?").substring(0, 2).toUpperCase()
                          }
                          size={32}
                          bg="#10B981"
                        />
                        <div style={{ fontWeight: 600, fontSize: 14 }}>
                          {s.full_name || s.email}
                        </div>
                      </div>
                    </td>
                    <td style={{ fontSize: 13, color: "#64748B" }}>
                      {s.email}
                    </td>
                    <td>
                      <span
                        style={{
                          fontSize: 12,
                          padding: "2px 8px",
                          borderRadius: 20,
                          background:
                            s.status === "active" ? "#D1FAE5" : "#FEE2E2",
                          color: s.status === "active" ? "#065F46" : "#991B1B",
                        }}
                      >
                        {s.status}
                      </span>
                    </td>
                    <td style={{ fontSize: 13, color: "#64748B" }}>
                      {s.created_at
                        ? new Date(s.created_at).toLocaleDateString()
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export function TeacherForum() {
  const { state } = useApp();
  const { user, lang } = state;
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newContent, setNewContent] = useState("");
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    const fetchPosts = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("forum_posts")
          .select("*, author:users(full_name, avatar_url)")
          .order("pinned", { ascending: false })
          .order("created_at", { ascending: false });
        if (error) throw error;
        setPosts(data || []);
      } catch (err) {
        console.error("Error fetching forum posts:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchPosts();
  }, []);

  const addPost = async () => {
    if (!newContent.trim() || !user?.id) return;
    setPosting(true);
    try {
      const { data, error } = await supabase
        .from("forum_posts")
        .insert({
          title: lang === "fr" ? "Nouvelle annonce" : "New announcement",
          content: newContent,
          author_id: user.id,
          pinned: false,
        })
        .select("*, author:users(full_name, avatar_url)")
        .single();
      if (error) throw error;
      if (data) setPosts([data, ...posts]);
      setNewContent("");
    } catch (err) {
      console.error("Error posting:", err);
      alert(err.message);
    } finally {
      setPosting(false);
    }
  };

  return (
    <div className="page-content fade-in">
      <div className="page-header">
        <h1 className="page-title">{t[lang].forum}</h1>
        <p className="page-subtitle">
          {loading ? "..." : posts.length}{" "}
          {lang === "fr" ? "discussions actives" : "active discussions"}
        </p>
      </div>

      <div className="card mb-4">
        <textarea
          className="textarea"
          placeholder={t[lang].typeMessage}
          value={newContent}
          onChange={(e) => setNewContent(e.target.value)}
          style={{ minHeight: 80 }}
        />
        <button
          className="btn btn-primary mt-3"
          onClick={addPost}
          disabled={posting}
        >
          {posting ? <Spinner /> : <Icon name="send" size={15} />}
          {t[lang].postMessage}
        </button>
      </div>

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: 40 }}>
          <Spinner dark />
        </div>
      ) : (
        posts.map((p) => (
          <div key={p.id} className={`forum-post ${p.pinned ? "pinned" : ""}`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <Avatar
                  initials={
                    p.author?.avatar_url ||
                    (p.author?.full_name || "?").substring(0, 2).toUpperCase()
                  }
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
                {p.pinned && <Badge type="info">📌</Badge>}
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

export function TeacherProfile() {
  const { state } = useApp();
  const { user, lang } = state;
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState(user?.name || "");

  useEffect(() => {
    if (!user?.id) return;
    const fetchCourses = async () => {
      try {
        const { data } = await supabase
          .from("courses")
          .select("id, title, enrolled_count, completion_rate")
          .eq("teacher_id", user.id);
        setCourses(data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchCourses();
  }, [user?.id]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("users")
        .update({ full_name: name })
        .eq("id", user.id);
      if (error) throw error;
      alert(lang === "fr" ? "Profil mis à jour !" : "Profile updated!");
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
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
      <div className="page-header">
        <h1 className="page-title">{t[lang].profile}</h1>
      </div>
      <div className="grid-2">
        <div className="card">
          <div style={{ textAlign: "center", marginBottom: 24 }}>
            <Avatar initials={user?.avatar} size={72} bg="#8B5CF6" />
            <div style={{ marginTop: 12, fontSize: 18, fontWeight: 600 }}>
              {user?.name}
            </div>
            <div className="mt-2">
              <Badge type="warning">{t[lang].teacher}</Badge>
            </div>
          </div>
          <div className="input-group">
            <label className="input-label">{t[lang].fullName}</label>
            <input
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="input-group">
            <label className="input-label">{t[lang].email}</label>
            <input className="input" defaultValue={user?.email} disabled />
          </div>
          <div className="input-group">
            <label className="input-label">
              {lang === "fr" ? "Biographie" : "Bio"}
            </label>
            <textarea
              className="textarea"
              placeholder={
                lang === "fr"
                  ? "Décrivez votre expertise..."
                  : "Describe your expertise..."
              }
            />
          </div>
          <button
            className="btn btn-primary"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? <Spinner /> : t[lang].save}
          </button>
        </div>
        <div className="card">
          <div className="card-title">
            📊 {lang === "fr" ? "Mes statistiques" : "My Statistics"}
          </div>
          {loading ? (
            <Spinner dark />
          ) : (
            [
              { label: t[lang].publishedCourses, value: courses.length },
              { label: t[lang].trainedStudents, value: totalStudents },
              { label: t[lang].avgCompletion, value: `${avgCompletion}%` },
              { label: t[lang].avgRating, value: "—" },
            ].map((s, i) => (
              <div
                key={i}
                className="flex justify-between items-center"
                style={{ padding: 12, borderBottom: "1px solid #F1F5F9" }}
              >
                <span style={{ fontSize: 14, color: "#64748B" }}>
                  {s.label}
                </span>
                <span
                  style={{ fontSize: 16, fontWeight: 700, color: "#1E293B" }}
                >
                  {s.value}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

//semaine3
// les svg sont encore a maitriser
