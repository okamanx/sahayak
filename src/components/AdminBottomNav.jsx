import { useNavigate, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { LayoutDashboard, ListTodo, Map, LogOut } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function AdminBottomNav() {
  const location = useLocation()
  const navigate = useNavigate()
  
  const navItems = [
    { name: 'DASHBOARD', path: '/admin/dashboard', icon: LayoutDashboard },
    { name: 'ISSUES',    path: '/admin/issues',    icon: ListTodo },
    { name: 'MAP',       path: '/admin/map',       icon: Map },
  ]

  function handleLogout() {
    sessionStorage.removeItem('sahayak_admin')
    navigate('/admin')
  }

  return (
    <nav style={{
      position: 'fixed', bottom: 30, left: '50%', transform: 'translateX(-50%)',
      width: 'fit-content', background: 'rgba(255, 255, 255, 0.85)',
      backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
      padding: '8px 12px', borderRadius: 24, display: 'flex', alignItems: 'center', gap: 6,
      boxShadow: '0 12px 32px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(255, 255, 255, 0.5)',
      zIndex: 1000, border: '1px solid rgba(255, 255, 255, 0.3)'
    }}>
      {navItems.map((item) => {
        const isActive = location.pathname === item.path
        return (
          <Link
            key={item.path}
            to={item.path}
            style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px',
              borderRadius: 16, textDecoration: 'none', transition: 'all 0.3s ease',
              position: 'relative'
            }}
          >
            {isActive && (
              <motion.div
                layoutId="active-pill"
                style={{
                  position: 'absolute', inset: 0, 
                  background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                  borderRadius: 16, zIndex: 0,
                  boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)'
                }}
              />
            )}
            <item.icon 
              size={18} 
              style={{ 
                position: 'relative', zIndex: 1, 
                color: isActive ? '#fff' : '#64748b' 
              }} 
            />
            <span style={{ 
              fontSize: 12, fontWeight: 700, position: 'relative', zIndex: 1,
              color: isActive ? '#fff' : '#64748b', transition: 'color 0.3s ease'
            }}>
              {item.name}
            </span>
            <div className="nav-hover-overlay" style={{
              position: 'absolute', inset: 0, background: 'rgba(37, 99, 235, 0.05)',
              borderRadius: 16, opacity: 0, transition: 'opacity 0.2s ease', zIndex: 0
            }} />
          </Link>
        )
      })}

      <div style={{ width: 1, height: 24, background: '#e2e8f0', margin: '0 8px' }} />

      <button onClick={handleLogout} style={{
        background: 'transparent', border: 'none', cursor: 'pointer',
        display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px',
        borderRadius: 16, color: '#ef4444', fontWeight: 700, transition: 'all 0.2s'
      }}>
        <LogOut size={18} />
        <span style={{ fontSize: 12 }}>LOGOUT</span>
      </button>

      <style>{`
        a:hover .nav-hover-overlay { opacity: 1; }
        .nav-hover-overlay:hover { opacity: 1 !important; }
      `}</style>
    </nav>
  )
}
