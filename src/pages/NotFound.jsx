import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import t from '../data/translations'

export default function NotFound() {
  const { state } = useApp()
  const { user, lang } = state
  const navigate = useNavigate()

  const home = user?.role === 'admin' ? '/admin' : user?.role === 'teacher' ? '/teacher' : user ? '/student' : '/login'

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F0F4F8' }}>
      <div style={{ textAlign: 'center', padding: 48 }}>
        <div style={{ fontSize: 80, marginBottom: 16 }}>🔍</div>
        <h1 style={{ fontFamily: 'Fraunces, serif', fontSize: 32, color: '#1E293B', marginBottom: 8 }}>404</h1>
        <p style={{ fontSize: 18, color: '#64748B', marginBottom: 24 }}>{t[lang].notFound}</p>
        <button className="btn btn-primary" onClick={() => navigate(home)}>{t[lang].goHome}</button>
      </div>
    </div>
  )
}
