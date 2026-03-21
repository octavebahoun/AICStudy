# AiC Study — LMS SaaS

Plateforme de formation en ligne complète avec 3 rôles (Admin, Formateur, Étudiant), IA intégrée et interface bilingue FR/EN.

## 🚀 Démarrage rapide

### 1. Installer les dépendances
```bash
npm install
```

### 2. Configurer l'environnement
```bash
cp .env.example .env
```
Éditez `.env` et renseignez vos clés :
```
VITE_SUPABASE_URL=https://xxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...
VITE_AI_API_KEY=votre_cle_api
```

### 3. Lancer le serveur de développement
```bash
npm run dev
```
Ouvrez http://localhost:5173

---

## 🔑 Accès démo (sans Supabase)

Sur la page de connexion, utilisez les boutons de démo rapide :

| Rôle | Email | Mot de passe |
|------|-------|-------------|
| Admin | admin@aicstudy.com | n'importe lequel |
| Formateur | marie@aicstudy.com | n'importe lequel |
| Étudiant | sophie@aicstudy.com | n'importe lequel |

---

## 📁 Structure du projet

```
src/
├── components/       # Composants partagés (Layout, Sidebar, Topbar, UI)
├── context/          # AppContext (état global, auth, langue)
├── data/             # Données mock + traductions
├── pages/
│   ├── admin/        # 7 pages admin
│   ├── teacher/      # 7 pages formateur
│   └── student/      # 8 pages étudiant
├── services/         # Supabase client + service IA
└── App.jsx           # Router principal
```

---

## 🤖 Configuration IA

Le service IA (`src/services/ai.js`) est compatible avec :
- **Claude (Anthropic)** — `VITE_AI_API_URL=https://api.anthropic.com/v1/messages`
- **Votre propre API (modele sur driver ou local)** — changez `VITE_AI_API_URL` dans `.env`

Fonctionnalités IA disponibles :
- Génération de plan de cours
- Génération de quiz
- Description de cours
- Résumé de leçon
- Explication après quiz raté
- Assistant IA par cours
- Analyse admin
- Rapport intelligent

---

## 🗄️ Supabase

1. Créez un projet sur [supabase.com](https://supabase.com)
2. Copiez l'URL et la clé anon dans `.env`
3. Exécutez le script SQL fourni dans `supabase/schema.sql`

---

## 🏗️ Build production

```bash
npm run build
```

---

## 📦 Technologies

- **React 18** + React Router v6
- **Vite** (bundler)
- **Supabase** (Auth + PostgreSQL + Storage)
- **CSS custom** (pas de framework CSS)
- **IA** via API configurable dans `.env`
