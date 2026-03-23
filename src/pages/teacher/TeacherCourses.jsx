import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { useApp } from "../../context/AppContext";
import {
  Icon,
  Badge,
  ProgressBar,
  CourseThumb,
  AIPanel,
  Spinner,
} from "../../components/UI";
import {
  getCourses,
  createCourse,
  updateCourse,
  getCourseDetails,
} from "../../services/db";
import { callAI, aiPrompts } from "../../services/ai";
import { supabase } from "../../services/supabase";
import t from "../../data/translations";

export function TeacherCourses() {
  const { state } = useApp();
  const { user, lang } = state;
  const navigate = useNavigate();
  const [myCourses, setMyCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id) fetchCourses();
  }, [user?.id]);

  const fetchCourses = async () => {
    setLoading(true);
    try {
      const data = await getCourses();
      setMyCourses(data.filter((c) => c.teacher_id === user.id));
    } catch (err) {
      console.error("Error fetching teacher courses:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-content fade-in">
      <div className="page-header flex justify-between items-center">
        <div>
          <h1 className="page-title">{t[lang].myCourses}</h1>
          <p className="page-subtitle">
            {loading ? "..." : myCourses.length}{" "}
            {lang === "fr" ? "cours" : "courses"}
          </p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => navigate("/teacher/courses/new")}
        >
          <Icon name="plus" size={15} />
          {t[lang].createCourse}
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center p-12">
          <Spinner dark />
        </div>
      ) : (
        <div className="grid-3">
          {myCourses.map((c) => (
            <div
              key={c.id}
              className="course-card"
              onClick={() => navigate(`/teacher/courses/${c.id}`)}
            >
              <div
                className="course-thumb"
                style={{
                  background: `linear-gradient(135deg, ${c.color || "#3B82F6"}, ${c.color || "#3B82F6"}99)`,
                }}
              >
                {c.thumbnail || "??"}
              </div>
              <div className="course-body">
                <div className="course-title">{c.title}</div>
                <div className="course-desc">{c.description}</div>
                <div className="course-meta">
                  <span>
                    📚 {c.modules?.length || 0} {t[lang].modules}
                  </span>
                  <Badge type={c.status === "active" ? "success" : "warning"}>
                    {c.status === "active"
                      ? t[lang].active
                      : lang === "fr"
                        ? "En attente"
                        : "Pending"}
                  </Badge>
                </div>
                <div className="flex gap-2 mt-3">
                  <button
                    className="btn btn-ghost btn-sm"
                    style={{ flex: 1, justifyContent: "center" }}
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/teacher/courses/${c.id}`);
                    }}
                  >
                    <Icon name="edit" size={13} />
                    {t[lang].edit}
                  </button>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/teacher/quiz/${c.id}`);
                    }}
                  >
                    <Icon name="quiz" size={13} />
                    Quiz
                  </button>
                </div>
              </div>
            </div>
          ))}
          <div
            className="course-card"
            style={{
              border: "2px dashed #E2E8F0",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              minHeight: 180,
              cursor: "pointer",
            }}
            onClick={() => navigate("/teacher/courses/new")}
          >
            <div style={{ textAlign: "center", color: "#94A3B8" }}>
              <Icon name="plus" size={32} color="#94A3B8" />
              <div style={{ marginTop: 8, fontSize: 14 }}>
                {t[lang].createCourse}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function TeacherCourseEditor() {
  const { state } = useApp();
  const { user, lang } = state;
  const navigate = useNavigate();
  const { id } = useParams();
  const isNew = id === "new";

  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "",
    level: "beginner",
    duration: "",
    thumbnail: "",
    color: "#3B82F6",
  });
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [error, setError] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiPlan, setAiPlan] = useState("");
  const [aiDescLoading, setAiDescLoading] = useState(false);
  const [selectedModule, setSelectedModule] = useState(null);
  const [editingLessonId, setEditingLessonId] = useState(null);
  const [showLessonModal, setShowLessonModal] = useState(false);
  const [lessonForm, setLessonForm] = useState({
    title: "",
    content: "",
    type: "text",
  });

  useEffect(() => {
    if (!isNew) fetchCourse();
  }, [id]);

  const fetchCourse = async () => {
    setLoading(true);
    try {
      const data = await getCourseDetails(id);
      setForm({
        title: data.title,
        description: data.description || "",
        category: data.category || "",
        level: data.level || "beginner",
        duration: data.duration || "",
        thumbnail: data.thumbnail || "",
        color: data.color || "#3B82F6",
      });
      setModules(data.modules || []);
    } catch (err) {
      console.error("Error fetching course details:", err);
      setError("Course not found");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e?.preventDefault();
    if (!form.title) return;
    setSaveLoading(true);
    setError("");
    try {
      const payload = {
        ...form,
        teacher_id: user.id,
        thumbnail: form.thumbnail || form.title.substring(0, 2).toUpperCase(),
      };
      if (isNew) {
        const data = await createCourse(payload);
        navigate(`/teacher/courses/${data.id}`);
      } else {
        await updateCourse(id, payload);
        alert(lang === "fr" ? "Modification enregistrée !" : "Changes saved!");
      }
    } catch (err) {
      console.error("Error saving course:", err);
      setError(err.message || "Failed to save course");
    } finally {
      setSaveLoading(false);
    }
  };

  const handleDeleteCourse = async () => {
    if (
      !confirm(
        lang === "fr"
          ? "Supprimer ce cours définitivement ?"
          : "Permanently delete this course?",
      )
    )
      return;
    try {
      const { error } = await supabase.from("courses").delete().eq("id", id);
      if (error) throw error;
      navigate("/teacher/courses");
    } catch (err) {
      alert(err.message);
    }
  };

  const handleAddModule = async () => {
    const title = prompt(lang === "fr" ? "Titre du module :" : "Module title:");
    if (!title) return;

    try {
      const { data, error } = await supabase
        .from("modules")
        .insert({
          course_id: id,
          title: title,
          order: modules.length + 1,
        })
        .select()
        .single();

      if (error) throw error;
      setModules([...modules, { ...data, lessons: [] }]);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleEditModule = async (mId, oldTitle) => {
    const title = prompt(
      lang === "fr" ? "Nouveau titre du module :" : "New module title:",
      oldTitle,
    );
    if (!title || title === oldTitle) return;

    try {
      const { data, error } = await supabase
        .from("modules")
        .update({ title })
        .eq("id", mId)
        .select()
        .single();

      if (error) throw error;
      setModules(
        modules.map((m) => (m.id === mId ? { ...m, title: data.title } : m)),
      );
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeleteModule = async (mId) => {
    if (
      !confirm(
        lang === "fr"
          ? "Supprimer ce module et toutes ses leçons ?"
          : "Delete this module and all its lessons?",
      )
    )
      return;
    try {
      const { error } = await supabase.from("modules").delete().eq("id", mId);
      if (error) throw error;
      setModules(modules.filter((m) => m.id !== mId));
    } catch (err) {
      alert(err.message);
    }
  };

  const handleSaveLesson = async () => {
    if (!lessonForm.title || !selectedModule) return;
    try {
      if (editingLessonId) {
        const { data, error } = await supabase
          .from("lessons")
          .update({
            title: lessonForm.title,
            content: lessonForm.content,
            type: lessonForm.type,
          })
          .eq("id", editingLessonId)
          .select()
          .single();

        if (error) throw error;

        setModules(
          modules.map((m) => {
            if (m.id === selectedModule.id) {
              return {
                ...m,
                lessons: m.lessons.map((l) =>
                  l.id === editingLessonId ? data : l,
                ),
              };
            }
            return m;
          }),
        );
      } else {
        const { data, error } = await supabase
          .from("lessons")
          .insert({
            module_id: selectedModule.id,
            title: lessonForm.title,
            content: lessonForm.content,
            type: lessonForm.type,
            order: (selectedModule.lessons || []).length + 1,
          })
          .select()
          .single();

        if (error) throw error;

        const updatedModules = modules.map((m) => {
          if (m.id === selectedModule.id) {
            return { ...m, lessons: [...(m.lessons || []), data] };
          }
          return m;
        });
        setModules(updatedModules);
      }

      setLessonForm({ title: "", content: "", type: "text" });
      setEditingLessonId(null);
      setShowLessonModal(false);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleEditLesson = (lesson, module) => {
    setSelectedModule(module);
    setEditingLessonId(lesson.id);
    setLessonForm({
      title: lesson.title,
      content: lesson.content || "",
      type: lesson.type || "text",
    });
    setShowLessonModal(true);
  };

  const handleDeleteLesson = async (lId, mId) => {
    if (
      !confirm(
        lang === "fr" ? "Supprimer cette leçon ?" : "Delete this lesson?",
      )
    )
      return;
    try {
      const { error } = await supabase.from("lessons").delete().eq("id", lId);
      if (error) throw error;
      setModules(
        modules.map((m) => {
          if (m.id === mId)
            return { ...m, lessons: m.lessons.filter((l) => l.id !== lId) };
          return m;
        }),
      );
    } catch (err) {
      alert(err.message);
    }
  };

  const handleApplyAIPlan = async () => {
    if (!aiPlan) return;
    const lines = aiPlan
      .split("\n")
      .filter((l) => l.toLowerCase().includes("module"));
    if (lines.length === 0) {
      alert(
        lang === "fr"
          ? "Aucun module détecté dans le plan."
          : "No modules detected in the plan.",
      );
      return;
    }

    if (
      !confirm(
        lang === "fr"
          ? `Créer ${lines.length} modules ?`
          : `Create ${lines.length} modules?`,
      )
    )
      return;

    setAiLoading(true);
    try {
      const newModules = lines.map((l, i) => ({
        course_id: id,
        title: l.replace(/module \d+\s*[:-]?\s*/i, "").trim(),
        order: modules.length + i + 1,
      }));

      const { data, error } = await supabase
        .from("modules")
        .insert(newModules)
        .select();

      if (error) throw error;
      setModules([...modules, ...(data || [])]);
      setAiPlan("");
      alert(lang === "fr" ? "Plan appliqué !" : "Plan applied!");
    } catch (err) {
      alert(err.message);
    } finally {
      setAiLoading(false);
    }
  };

  const generatePlan = async () => {
    if (!form.title) return;
    setAiLoading(true);
    const result = await callAI(
      aiPrompts.generateCoursePlan(form.title, form.level, lang),
      lang,
    );
    setAiPlan(result);
    setAiLoading(false);
  };

  const generateDesc = async () => {
    if (!form.title) return;
    setAiDescLoading(true);
    const result = await callAI(
      aiPrompts.generateCourseDescription(form.title, form.level, lang),
      lang,
    );
    setForm((f) => ({ ...f, description: result }));
    setAiDescLoading(false);
  };

  if (loading)
    return (
      <div className="page-content flex justify-center p-12">
        <Spinner dark />
      </div>
    );

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
          <h1 className="page-title">
            {isNew ? t[lang].createCourse : t[lang].editCourse}
          </h1>
          <p className="page-subtitle">
            {isNew
              ? lang === "fr"
                ? "Créez un nouveau cours"
                : "Create a new course"
              : form.title}
          </p>
        </div>
      </div>

      {error && (
        <div
          className="card mb-4"
          style={{
            color: "#EF4444",
            background: "#FEE2E2",
            border: "1px solid #FCA5A5",
          }}
        >
          {error}
        </div>
      )}

      <div className="grid-2">
        <div className="flex flex-col gap-4">
          <form className="card" onSubmit={handleSave}>
            <div className="card-title">
              <Icon
                name="fileText"
                size={16}
                color="var(--accent)"
                style={{ marginBottom: -3, marginRight: 8 }}
              />
              {lang === "fr" ? "Informations générales" : "General Info"}
            </div>
            <div className="input-group">
              <label className="input-label">{t[lang].title} *</label>
              <input
                className="input"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder={
                  lang === "fr"
                    ? "Ex: Introduction au JavaScript"
                    : "Ex: Introduction to JavaScript"
                }
                required
              />
            </div>
            <div className="input-group">
              <label className="input-label">{t[lang].description}</label>
              <div className="relative">
                <textarea
                  className="textarea"
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                  placeholder={
                    lang === "fr"
                      ? "Décrivez votre cours..."
                      : "Describe your course..."
                  }
                  style={{ minHeight: 120 }}
                />
                <button
                  type="button"
                  className="btn btn-ghost btn-sm mt-1"
                  onClick={generateDesc}
                  disabled={aiDescLoading}
                >
                  {aiDescLoading ? (
                    <Spinner size={12} dark />
                  ) : (
                    <>
                      <Icon name="ai" size={13} />{" "}
                      {lang === "fr" ? "Générer avec IA" : "Generate with AI"}
                    </>
                  )}
                </button>
              </div>
            </div>
            <div className="grid-2">
              <div className="input-group">
                <label className="input-label">{t[lang].category}</label>
                <input
                  className="input"
                  value={form.category}
                  onChange={(e) =>
                    setForm({ ...form, category: e.target.value })
                  }
                  placeholder="Ex: Design"
                />
              </div>
              <div className="input-group">
                <label className="input-label">{t[lang].level}</label>
                <select
                  className="select"
                  value={form.level}
                  onChange={(e) => setForm({ ...form, level: e.target.value })}
                >
                  <option value="beginner">{t[lang].beginner}</option>
                  <option value="intermediate">{t[lang].intermediate}</option>
                  <option value="advanced">{t[lang].advanced}</option>
                </select>
              </div>
            </div>
            <div className="input-group">
              <label className="input-label">{t[lang].duration}</label>
              <input
                className="input"
                value={form.duration}
                onChange={(e) => setForm({ ...form, duration: e.target.value })}
                placeholder="12h"
              />
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                className="btn btn-primary"
                disabled={saveLoading}
              >
                {saveLoading ? (
                  <Spinner />
                ) : (
                  <>
                    <Icon name="save" size={15} />
                    {isNew
                      ? lang === "fr"
                        ? "Créer le cours"
                        : "Create Course"
                      : t[lang].save}
                  </>
                )}
              </button>
              {!isNew && (
                <button
                  type="button"
                  className="btn btn-ghost"
                  style={{ color: "#EF4444" }}
                  onClick={handleDeleteCourse}
                >
                  <Icon name="trash" size={15} />
                  {lang === "fr" ? "Supprimer" : "Delete"}
                </button>
              )}
            </div>
          </form>

          {!isNew && (
            <div className="card">
              <div className="flex justify-between items-center mb-4">
                <div
                  className="card-title"
                  style={{
                    margin: 0,
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <Icon name="settings" size={16} color="var(--primary)" />
                  {lang === "fr" ? "Configuration Quiz" : "Quiz Setup"}
                </div>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => navigate(`/teacher/quiz/${id}`)}
                >
                  {lang === "fr" ? "Gérer le quiz" : "Manage quiz"}
                </button>
              </div>
              <p style={{ fontSize: 13, color: "#64748B" }}>
                {lang === "fr"
                  ? "Définissez les questions et le score minimum pour valider le cours."
                  : "Define questions and passing score to validate the course."}
              </p>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-4">
          {!isNew && (
            <div className="card">
              <div className="flex justify-between items-center mb-4">
                <div
                  className="card-title"
                  style={{
                    margin: 0,
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <Icon name="folders" size={16} color="var(--accent)" />
                  {t[lang].modules}
                </div>
                <button
                  className="btn btn-accent btn-sm"
                  onClick={handleAddModule}
                >
                  <Icon name="plus" size={13} />
                  {t[lang].addModule}
                </button>
              </div>
              {modules.length === 0 ? (
                <p
                  style={{
                    textAlign: "center",
                    color: "#94A3B8",
                    padding: 20,
                    fontSize: 13,
                  }}
                >
                  {lang === "fr"
                    ? "Aucun module. Commencez par en ajouter un !"
                    : "No modules yet. Start by adding one!"}
                </p>
              ) : (
                modules.map((m) => (
                  <div
                    key={m.id}
                    style={{
                      border: "1px solid #E2E8F0",
                      borderRadius: 8,
                      padding: "12px 16px",
                      marginBottom: 12,
                      background: "white",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                    }}
                  >
                    <div className="flex justify-between items-center mb-3">
                      <span
                        style={{
                          fontWeight: 600,
                          fontSize: 14,
                          color: "#1E293B",
                        }}
                      >
                        {m.title}
                      </span>
                      <div className="flex gap-2">
                        <button
                          className="btn-icon"
                          title={
                            lang === "fr" ? "Modifier le titre" : "Edit title"
                          }
                          onClick={() => handleEditModule(m.id, m.title)}
                        >
                          <Icon name="edit" size={14} color="var(--primary)" />
                        </button>
                        <button
                          className="btn btn-ghost btn-sm"
                          style={{ padding: "4px 8px" }}
                          onClick={() => {
                            setSelectedModule(m);
                            setEditingLessonId(null);
                            setLessonForm({
                              title: "",
                              content: "",
                              type: "text",
                            });
                            setShowLessonModal(true);
                          }}
                        >
                          <Icon name="plus" size={12} />
                          {lang === "fr" ? "Leçon" : "Lesson"}
                        </button>
                        <button
                          className="btn-icon"
                          onClick={() => handleDeleteModule(m.id)}
                        >
                          <Icon name="trash" size={14} color="#EF4444" />
                        </button>
                      </div>
                    </div>

                    {/* Liste des leçons */}
                    <div
                      style={{
                        marginLeft: 12,
                        borderLeft: "2px solid #F1F5F9",
                        paddingLeft: 12,
                      }}
                    >
                      {(m.lessons || []).length === 0 ? (
                        <div
                          style={{
                            fontSize: 12,
                            color: "#94A3B8",
                            fontStyle: "italic",
                          }}
                        >
                          {lang === "fr" ? "Aucune leçon" : "No lessons"}
                        </div>
                      ) : (
                        (m.lessons || []).map((l) => (
                          <div
                            key={l.id}
                            className="flex justify-between items-center py-1 group"
                          >
                            <span style={{ fontSize: 13, color: "#475569" }}>
                              {l.type === "video" ? "📹" : "📄"} {l.title}
                            </span>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100">
                              <button
                                className="btn-icon"
                                style={{ padding: 2 }}
                                onClick={() => handleEditLesson(l, m)}
                              >
                                <Icon
                                  name="edit"
                                  size={12}
                                  color="var(--primary)"
                                />
                              </button>
                              <button
                                className="btn-icon"
                                style={{ padding: 2 }}
                                onClick={() => handleDeleteLesson(l.id, m.id)}
                              >
                                <Icon name="trash" size={12} color="#EF4444" />
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                ))
              )}

              {/* Modal Ajout Leçon */}
              {showLessonModal && (
                <div
                  style={{
                    position: "fixed",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: "rgba(0,0,0,0.5)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    zIndex: 1000,
                    padding: 20,
                  }}
                >
                  <div
                    className="card"
                    style={{
                      maxWidth: 500,
                      width: "100%",
                      maxHeight: "90vh",
                      overflow: "auto",
                    }}
                  >
                    <div className="card-title">
                      {editingLessonId
                        ? lang === "fr"
                          ? "Modifier la leçon"
                          : "Edit Lesson"
                        : lang === "fr"
                          ? "Ajouter une leçon"
                          : "Add Lesson"}
                    </div>
                    <div className="input-group">
                      <label className="input-label">{t[lang].title}</label>
                      <input
                        className="input"
                        value={lessonForm.title}
                        onChange={(e) =>
                          setLessonForm({
                            ...lessonForm,
                            title: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="input-group">
                      <label className="input-label">Type</label>
                      <select
                        className="select"
                        value={lessonForm.type}
                        onChange={(e) =>
                          setLessonForm({ ...lessonForm, type: e.target.value })
                        }
                      >
                        <option value="text">
                          {lang === "fr"
                            ? "Texte / Markdown"
                            : "Text / Markdown"}
                        </option>
                        <option value="video">Vidéo</option>
                      </select>
                    </div>
                    <div className="input-group">
                      <label
                        className="input-label"
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                        }}
                      >
                        <span>
                          {lang === "fr"
                            ? "Contenu (Supporte Markdown)"
                            : "Content (Markdown Supported)"}
                        </span>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          style={{
                            padding: "0 4px",
                            fontSize: 11,
                            height: 24,
                            minWidth: "auto",
                          }}
                          onClick={async () => {
                            if (!lessonForm.title)
                              return alert(
                                lang === "fr"
                                  ? "Saisissez un titre d'abord"
                                  : "Enter a title first",
                              );
                            setAiLoading(true);
                            const res = await callAI(
                              aiPrompts.lessonSummary(
                                lessonForm.title,
                                form.title,
                                lang,
                              ),
                              lang,
                            );
                            setLessonForm({ ...lessonForm, content: res });
                            setAiLoading(false);
                          }}
                          disabled={aiLoading}
                        >
                          {aiLoading ? (
                            <Spinner size={10} />
                          ) : (
                            <>
                              <Icon name="ai" size={10} />{" "}
                              {lang === "fr" ? "Générer" : "Generate"}
                            </>
                          )}
                        </button>
                      </label>
                      <textarea
                        className="textarea"
                        style={{ minHeight: 200 }}
                        value={lessonForm.content}
                        onChange={(e) =>
                          setLessonForm({
                            ...lessonForm,
                            content: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="flex gap-2 justify-end mt-4">
                      <button
                        className="btn btn-ghost"
                        onClick={() => setShowLessonModal(false)}
                      >
                        {lang === "fr" ? "Annuler" : "Cancel"}
                      </button>
                      <button
                        className="btn btn-primary"
                        onClick={handleSaveLesson}
                      >
                        {lang === "fr" ? "Enregistrer" : "Save"}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          <AIPanel
            title={t[lang].generatePlan}
            onAction={generatePlan}
            actionLabel={t[lang].generatePlan}
            loading={aiLoading}
          >
            <p style={{ fontSize: 13, color: "#1E40AF" }}>
              {lang === "fr"
                ? "Entrez un titre pour générer un plan structuré."
                : "Enter a title to generate a structured plan."}
            </p>
            {aiPlan && (
              <div
                style={{
                  marginTop: 12,
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                }}
              >
                <div
                  style={{
                    fontSize: 13,
                    lineHeight: 1.7,
                    color: "#374151",
                    background: "white",
                    padding: 12,
                    borderRadius: 8,
                    whiteSpace: "pre-wrap",
                    border: "1px solid #DBEAFE",
                  }}
                >
                  {aiPlan}
                </div>
                {!isNew && (
                  <button
                    className="btn btn-accent btn-full"
                    onClick={handleApplyAIPlan}
                  >
                    <Icon name="ai" size={15} />
                    {lang === "fr"
                      ? "Transformer ce plan en modules"
                      : "Transform plan into modules"}
                  </button>
                )}
              </div>
            )}
          </AIPanel>
        </div>
      </div>
    </div>
  );
}
