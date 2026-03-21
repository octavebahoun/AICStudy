import { useState, useEffect } from "react";
import { useApp } from "../../context/AppContext";
import { Icon, Avatar, Badge, Modal, Spinner } from "../../components/UI";
import {
  getUsers,
  updateUserStatus,
  deleteUser as removeUser,
} from "../../services/db";
import t from "../../data/translations";

export default function AdminUsers() {
  const { state } = useApp();
  const { lang } = state;
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", role: "student" });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const data = await getUsers();
      setUsers(data);
    } catch (err) {
      console.error("Error fetching users:", err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = users.filter(
    (u) =>
      (filter === "all" || u.role === filter) &&
      ((u.full_name || "").toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase())),
  );

  const roleColor = { admin: "info", teacher: "warning", student: "success" };
  const statusColor = {
    active: "success",
    suspended: "danger",
    inactive: "gray",
  };
  const roleBg = { admin: "#1E3A5F", teacher: "#8B5CF6", student: "#10B981" };

  const addUser = async () => {
    // In real Supabase, we should use auth.admin.createUser if we have a service role
    // or just direct the admin to a "register" flow.
    // For now, we'll suggest using registration.
    alert(
      lang === "fr"
        ? "Utilisez la page d'inscription pour ajouter un utilisateur avec un mot de passe."
        : "Use the registration page to add a new user with a password.",
    );
    setModal(false);
  };

  const toggleUserStatus = async (id, currentStatus) => {
    const nextStatus = currentStatus === "active" ? "suspended" : "active";
    try {
      await updateUserStatus(id, nextStatus);
      setUsers(
        users.map((u) => (u.id === id ? { ...u, status: nextStatus } : u)),
      );
    } catch (err) {
      alert(
        lang === "fr"
          ? "Erreur lors du changement de statut"
          : "Error updating status",
      );
    }
  };

  const handleDelete = async (id) => {
    if (
      !confirm(
        lang === "fr" ? "Supprimer cet utilisateur ?" : "Delete this user?",
      )
    )
      return;
    try {
      await removeUser(id);
      setUsers(users.filter((u) => u.id !== id));
    } catch (err) {
      alert(
        lang === "fr" ? "Erreur lors de la suppression" : "Error deleting user",
      );
    }
  };

  return (
    <div className="page-content fade-in">
      <div className="page-header flex justify-between items-center">
        <div>
          <h1 className="page-title">{t[lang].users}</h1>
          <p className="page-subtitle">
            {loading ? "..." : filtered.length}{" "}
            {lang === "fr" ? "utilisateurs" : "users"}
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setModal(true)}>
          <Icon name="plus" size={15} />
          {lang === "fr" ? "Ajouter" : "Add"}
        </button>
      </div>

      <div className="card">
        <div className="flex gap-3 mb-4 flex-wrap">
          <input
            className="input"
            style={{ maxWidth: 260 }}
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
              {lang === "fr" ? "Tous les rôles" : "All roles"}
            </option>
            <option value="admin">{t[lang].admin}</option>
            <option value="teacher">{t[lang].teacher}</option>
            <option value="student">{t[lang].student}</option>
          </select>
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
                  <th>{lang === "fr" ? "Utilisateur" : "User"}</th>
                  <th>{t[lang].role}</th>
                  <th>{lang === "fr" ? "Statut" : "Status"}</th>
                  <th>{lang === "fr" ? "Inscrit le" : "Joined"}</th>
                  <th>{lang === "fr" ? "Actions" : "Actions"}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <Avatar
                          initials={u.avatar_url || "?"}
                          size={32}
                          bg={roleBg[u.role]}
                        />
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 14 }}>
                            {u.full_name}
                          </div>
                          <div style={{ fontSize: 12, color: "#64748B" }}>
                            {u.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <Badge type={roleColor[u.role]}>
                        {u.role === "admin"
                          ? t[lang].admin
                          : u.role === "teacher"
                            ? t[lang].teacher
                            : t[lang].student}
                      </Badge>
                    </td>
                    <td>
                      <Badge type={statusColor[u.status]}>
                        {u.status === "active"
                          ? t[lang].active
                          : u.status === "suspended"
                            ? t[lang].suspended
                            : t[lang].inactive}
                      </Badge>
                    </td>
                    <td style={{ fontSize: 13, color: "#64748B" }}>
                      {new Date(u.created_at).toLocaleDateString()}
                    </td>
                    <td>
                      <div className="flex gap-2">
                        <button
                          className="btn-icon"
                          title={
                            u.status === "active"
                              ? t[lang].suspended
                              : t[lang].active
                          }
                          onClick={() => toggleUserStatus(u.id, u.status)}
                        >
                          <Icon
                            name={u.status === "active" ? "eye" : "check"}
                            size={15}
                          />
                        </button>
                        <button
                          className="btn-icon"
                          title={t[lang].delete}
                          onClick={() => handleDelete(u.id)}
                        >
                          <Icon name="trash" size={15} color="#EF4444" />
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

      <Modal
        open={modal}
        onClose={() => setModal(false)}
        title={lang === "fr" ? "Ajouter un utilisateur" : "Add User"}
      >
        <div style={{ marginBottom: 15, fontSize: 13, color: "#64748B" }}>
          {" "}
          {lang === "fr"
            ? "Note : Le système utilise Supabase Auth. Les utilisateurs doivent être enregistrés via un formulaire d'inscription pour avoir un mot de passe."
            : "Note: The system uses Supabase Auth. Users must be registered via a registration form to have a password."}{" "}
        </div>
        <div className="flex gap-3 justify-end">
          <button className="btn btn-ghost" onClick={() => setModal(false)}>
            {t[lang].cancel}
          </button>
          <button className="btn btn-primary" onClick={addUser}>
            {lang === "fr" ? "Continuer" : "Continue"}
          </button>
        </div>
      </Modal>
    </div>
  );
}
