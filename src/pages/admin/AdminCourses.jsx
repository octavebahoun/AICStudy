import { useState, useEffect } from "react";
import { useApp } from "../../context/AppContext";
import {
  Icon,
  Badge,
  ProgressBar,
  CourseThumb,
  Spinner,
} from "../../components/UI";
import {
  getCourses,
  updateCourseStatus,
  deleteCourse,
} from "../../services/db";
import t from "../../data/translations";

export default function AdminCourses() {
  const { state } = useApp();
  const { lang } = state;
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    setLoading(true);
    try {
      const data = await getCourses();
      setCourses(data);
    } catch (err) {
      console.error("Error fetching courses:", err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = courses.filter((c) =>
    c.title.toLowerCase().includes(search.toLowerCase()),
  );
  const statusBadge = { active: "success", pending: "warning", draft: "gray" };

  const validate = async (id) => {
    try {
      await updateCourseStatus(id, "active");
      setCourses(
        courses.map((c) => (c.id === id ? { ...c, status: "active" } : c)),
      );
    } catch (err) {
      alert("Erreur lors de la validation");
    }
  };

  const reject = async (id) => {
    try {
      await updateCourseStatus(id, "draft");
      setCourses(
        courses.map((c) => (c.id === id ? { ...c, status: "draft" } : c)),
      );
    } catch (err) {
      alert("Erreur lors du rejet");
    }
  };

  const remove = async (id) => {
    if (
      !confirm(lang === "fr" ? "Supprimer ce cours ?" : "Delete this course?")
    )
      return;
    try {
      await deleteCourse(id);
      setCourses(courses.filter((c) => c.id !== id));
    } catch (err) {
      alert("Erreur lors de la suppression");
    }
  };

  return (
    <div className="page-content fade-in">
      <div className="page-header flex justify-between items-center">
        <div>
          <h1 className="page-title">{t[lang].courses}</h1>
          <p className="page-subtitle">
            {loading ? "..." : filtered.length}{" "}
            {lang === "fr" ? "cours au total" : "courses total"}
          </p>
        </div>
      </div>

      <div className="card">
        <div className="mb-4">
          <input
            className="input"
            style={{ maxWidth: 300 }}
            placeholder={t[lang].search}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {loading ? (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              padding: "40px",
            }}
          >
            <Spinner dark />
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="table">
              <thead>
                <tr>
                  <th>{lang === "fr" ? "Cours" : "Course"}</th>
                  <th>{lang === "fr" ? "Formateur" : "Teacher"}</th>
                  <th>{lang === "fr" ? "Inscrits" : "Enrolled"}</th>
                  <th>{t[lang].completionRate}</th>
                  <th>{lang === "fr" ? "Statut" : "Status"}</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <CourseThumb
                          thumbnail={c.thumbnail || "??"}
                          color={c.color}
                          size={36}
                        />
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 14 }}>
                            {c.title}
                          </div>
                          <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                            {c.category} · {c.level}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td style={{ fontSize: 13 }}>{c.teacherName}</td>
                    <td style={{ fontSize: 13 }}>{c.enrolled_count || 0}</td>
                    <td style={{ minWidth: 130 }}>
                      <div className="flex items-center gap-2">
                        <div style={{ flex: 1 }}>
                          <ProgressBar value={c.completion_rate || 0} />
                        </div>
                        <span
                          style={{
                            fontSize: 12,
                            color: "var(--text-muted)",
                            minWidth: 32,
                          }}
                        >
                          {c.completion_rate || 0}%
                        </span>
                      </div>
                    </td>
                    <td>
                      <Badge type={statusBadge[c.status]}>
                        {c.status === "active"
                          ? t[lang].active
                          : c.status === "pending"
                            ? t[lang].pending
                            : t[lang].draft}
                      </Badge>
                    </td>
                    <td>
                      <div className="flex gap-2">
                        {c.status === "pending" && (
                          <>
                            <button
                              className="btn btn-success btn-sm"
                              onClick={() => validate(c.id)}
                            >
                              <Icon name="check" size={13} />
                            </button>
                            <button
                              className="btn btn-danger btn-sm"
                              onClick={() => reject(c.id)}
                            >
                              <Icon name="close" size={13} />
                            </button>
                          </>
                        )}
                        <button
                          className="btn-icon"
                          onClick={() => remove(c.id)}
                        >
                          <Icon name="trash" size={15} color="var(--danger)" />
                        </button>
                      </div>
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
