import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { supabase } from "../services/supabase";
import { Spinner } from "../components/UI";
import t from "../data/translations";

const roleHome = { admin: "/admin", teacher: "/teacher", student: "/student" };

export default function Login() {
  const { state, dispatch } = useApp();
  const lang = state.lang;
  const navigate = useNavigate();
  const [isRegister, setIsRegister] = useState(false);
  const [form, setForm] = useState({
    email: "",
    password: "",
    name: "",
    role: "student",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e?.preventDefault();
    setLoading(true);
    setError("");

    try {
      if (isRegister) {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: form.email,
          password: form.password,
          options: {
            data: {
              name: form.name,
              role: form.role,
              avatar: (form.name || "U").substring(0, 2).toUpperCase(),
            },
          },
        });
        if (signUpError) throw signUpError;

        if (data.user) {
          const { error: profileError } = await supabase.from("users").upsert({
            id: data.user.id,
            email: form.email,
            full_name: form.name,
            role: form.role,
            status: "active",
            avatar_url: (form.name || "U").substring(0, 2).toUpperCase(),
          });

          if (profileError) console.error("Erreur profil:", profileError);

          if (data.session) {
            navigate(roleHome[form.role]);
          } else {
            setIsRegister(false);
            setError(
              lang === "fr"
                ? "Inscription réussie ! Connectez-vous maintenant."
                : "Registration successful! You can now login.",
            );
          }
        }
      } else {
        const { data, error: signInError } =
          await supabase.auth.signInWithPassword({
            email: form.email,
            password: form.password,
          });
        if (signInError) throw signInError;
        if (data.user) {
          const role = data.user.user_metadata?.role || "student";
          navigate(roleHome[role]);
        }
      }
    } catch (err) {
      console.error("Auth error:", err);
      let msg =
        err.message ||
        (lang === "fr" ? "Erreur de connexion" : "Connection error");

      if (err.message?.includes("Email not confirmed")) {
        msg =
          lang === "fr"
            ? "confirmation d'email."
            : "confirme your email'.";
      } else if (err.message?.includes("rate limit")) {
        msg =
          lang === "fr"
            ? "Trop de tentatives. Réessayez dans quelques minutes."
            : "Too many requests. Please try again later.";
      }

      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-left">
        <div style={{ maxWidth: 420 }}>
          <div
            className="logo-pill"
            style={{ display: "inline-flex", marginBottom: 28, fontSize: 20 }}
          >
            AiC
            <span className="logo-s" style={{ fontSize: 24 }}>
              S
            </span>
            tudy
          </div>
          <h1
            style={{
              fontFamily: "Fraunces, serif",
              fontSize: 44,
              fontWeight: 600,
              lineHeight: 1.15,
              marginBottom: 20,
              color: "white",
            }}
          >
            {t[lang].appTagline.split(". ").map((line, i) => (
              <span key={i}>
                {line}.<br />
              </span>
            ))}
          </h1>
          <p
            style={{
              color: "rgba(203,213,225,0.8)",
              fontSize: 15,
              lineHeight: 1.7,
            }}
          >
            {lang === "fr"
              ? "La plateforme de formation en ligne pour les organisations qui veulent former leurs équipes efficacement."
              : "The online learning platform for organizations that want to train their teams effectively."}
          </p>
          <div
            style={{
              marginTop: 36,
              display: "flex",
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            {[
              "Des cours interractifs",
              "Pour tout type d'ages ",
              "Certificats gratuit",
            ].map((s) => (
              <div
                key={s}
                style={{
                  background: "rgba(255,255,255,0.1)",
                  padding: "7px 14px",
                  borderRadius: 20,
                  fontSize: 13,
                  color: "white",
                }}
              >
                {s}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="login-right">
        <div className="login-form">
          <h2 className="login-title">
            {isRegister ? t[lang].register : t[lang].login}
          </h2>
          <p className="login-subtitle">
            {isRegister
              ? "Créez votre compte AiC Study"
              : "Connectez-vous à votre espace"}
          </p>

          {error && (
            <div
              style={{
                background: "var(--surface-red-100)",
                color: "var(--token-color-foreground-critical-high-contrast)",
                padding: "10px 14px",
                borderRadius: 8,
                fontSize: 13,
                marginBottom: 16,
              }}
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {isRegister && (
              <div className="input-group">
                <label className="input-label">{t[lang].fullName}</label>
                <input
                  className="input"
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Sophie Bernard"
                  required
                />
              </div>
            )}
            <div className="input-group">
              <label className="input-label">{t[lang].email}</label>
              <input
                className="input"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="vous@exemple.com"
                required
              />
            </div>
            <div className="input-group">
              <label className="input-label">{t[lang].password}</label>
              <input
                className="input"
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="••••••••"
                required
              />
            </div>
            {isRegister && (
              <div className="input-group">
                <label className="input-label">{t[lang].role}</label>
                <select
                  className="select"
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                >
                  <option value="student">{t[lang].student}</option>
                  <option value="teacher">{t[lang].teacher}</option>
                </select>
              </div>
            )}
            <button
              type="submit"
              className="btn btn-primary btn-full btn-lg"
              disabled={loading}
            >
              {loading ? (
                <Spinner />
              ) : isRegister ? (
                t[lang].register
              ) : (
                t[lang].login
              )}
            </button>
          </form>

          <div
            style={{
              textAlign: "center",
              marginTop: 16,
              fontSize: 14,
              color: "var(--text-muted)",
            }}
          >
            {isRegister ? t[lang].alreadyAccount : t[lang].noAccount}{" "}
            <button
              style={{
                color: "var(--accent)",
                background: "none",
                border: "none",
                cursor: "pointer",
                fontWeight: 600,
                fontFamily: "DM Sans, sans-serif",
              }}
              onClick={() => {
                setIsRegister(!isRegister);
                setError("");
              }}
            >
              {isRegister ? t[lang].login : t[lang].register}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
