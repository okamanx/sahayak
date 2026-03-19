import { useLocation, useNavigate } from 'react-router-dom'
import { Home, PlusCircle, Search, AlertTriangle, Sun, Moon, User, LogIn } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'
import { useAuth } from '../context/AuthContext'

const TABS = [
  { path: '/',          icon: Home,          label: 'Home' },
  { path: '/report',    icon: PlusCircle,    label: 'Report' },
  { path: '/track',     icon: Search,        label: 'Track' },
]

export default function BottomNav() {
  const location        = useLocation()
  const navigate        = useNavigate()
  const { dark, toggle } = useTheme()
  const { user }        = useAuth()

  if (location.pathname.startsWith('/admin')) return null

  const active = location.pathname

  return (
    <nav className="bottom-nav">
      {TABS.map(({ path, icon: Icon, label }) => (
        <button
          key={path}
          onClick={() => navigate(path)}
          className={`nav-item ${active === path ? 'active' : ''}`}
        >
          <Icon size={22} strokeWidth={active === path ? 2.5 : 1.8} />
          <span>{label}</span>
        </button>
      ))}

      {/* Profile / Login tab */}
      {user ? (
        <button
          onClick={() => navigate('/profile')}
          className={`nav-item ${active === '/profile' ? 'active' : ''}`}
          style={{ position: 'relative' }}
        >
          <div style={{
            width: 24, height: 24,
            background: active === '/profile' ? '#2563eb' : 'var(--bg-muted)',
            borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, fontWeight: 700, color: active === '/profile' ? 'white' : 'var(--text-secondary)',
          }}>
            {(user.avatar || user.email.charAt(0)).toUpperCase()}
          </div>
          <span>Me</span>
        </button>
      ) : (
        <button onClick={() => navigate('/login')} className="nav-item">
          <LogIn size={22} strokeWidth={1.8} />
          <span>Login</span>
        </button>
      )}
    </nav>
  )
}
