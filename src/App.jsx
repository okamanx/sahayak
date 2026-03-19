import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ThemeProvider } from './context/ThemeContext'
import { AuthProvider } from './context/AuthContext'
import BottomNav from './components/BottomNav'
import HomePage from './pages/HomePage'
import ReportWizard from './pages/ReportWizard'
import ReportViewer from './pages/ReportViewer'
import EmergencyPage from './pages/EmergencyPage'
import UserLogin from './pages/UserLogin'
import UserProfile from './pages/UserProfile'
import WorkerLogin from './pages/WorkerLogin'
import WorkerPortal from './pages/WorkerPortal'
import AdminLogin from './pages/AdminLogin'
import AdminDashboard from './pages/AdminDashboard'
import AdminIssues from './pages/AdminIssues'
import AdminMap from './pages/AdminMap'
import { Download, X } from 'lucide-react'

function AdminRoute({ children }) {
  const isAdmin = sessionStorage.getItem('sahayak_admin') === 'true'
  return isAdmin ? children : <Navigate to="/admin" replace />
}

// ── PWA Install Banner ─────────────────────────────────────────────
function PWAInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [show, setShow] = useState(false)

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
      if (!localStorage.getItem('pwa-dismissed')) setShow(true)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  async function handleInstall() {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    setShow(false); setDeferredPrompt(null)
  }

  function handleDismiss() { setShow(false); localStorage.setItem('pwa-dismissed', '1') }

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }}
          transition={{ type: 'spring', damping: 20 }}
          className="install-banner"
        >
          <div style={{ width: 40, height: 40, background: 'rgba(255,255,255,0.2)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 20 }}>🏙️</div>
          <div style={{ flex: 1 }}>
            <p style={{ fontWeight: 700, fontSize: 14, margin: 0, color: 'white' }}>Install Sahayak</p>
            <p style={{ fontSize: 12, margin: 0, color: 'rgba(255,255,255,0.75)' }}>Add to home screen</p>
          </div>
          <button onClick={handleInstall} style={{ background: 'white', color: '#2563eb', fontWeight: 700, fontSize: 12, padding: '6px 12px', borderRadius: 10, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
            <Download size={13} /> Install
          </button>
          <button onClick={handleDismiss} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.7)' }}>
            <X size={18} />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ── User routes wrapper (with BottomNav) ───────────────────────────
function UserRoute({ children }) {
  return <>{children}<BottomNav /></>
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Toaster
            position="top-center"
            toastOptions={{
              style: {
                background: 'var(--bg-card)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border)',
                borderRadius: '12px',
                boxShadow: 'var(--shadow)',
              },
              duration: 3500,
            }}
          />
          <PWAInstallBanner />
          <Routes>
            {/* User routes */}
            <Route path="/"          element={<UserRoute><HomePage /></UserRoute>} />
            <Route path="/report"    element={<UserRoute><ReportWizard /></UserRoute>} />
            <Route path="/track"     element={<UserRoute><ReportViewer /></UserRoute>} />
            <Route path="/emergency" element={<UserRoute><EmergencyPage /></UserRoute>} />
            <Route path="/login"     element={<UserLogin />} />
            <Route path="/profile"   element={<UserRoute><UserProfile /></UserRoute>} />

            {/* Worker routes */}
            <Route path="/worker/login"  element={<WorkerLogin />} />
            <Route path="/worker"        element={<WorkerPortal />} />

            {/* Admin routes */}
            <Route path="/admin"           element={<AdminLogin />} />
            <Route path="/admin/dashboard" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
            <Route path="/admin/issues"    element={<AdminRoute><AdminIssues /></AdminRoute>} />
            <Route path="/admin/map"       element={<AdminRoute><AdminMap /></AdminRoute>} />

            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  )
}
