import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { Wrench, Eye, EyeOff, ArrowRight } from 'lucide-react'
import { loginWorker } from '../lib/supabase'

export default function WorkerLogin() {
  const [phone, setPhone]       = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw]     = useState(false)
  const [loading, setLoading]   = useState(false)
  const navigate = useNavigate()

  async function handleLogin(e) {
    e.preventDefault()
    setLoading(true)
    try {
      const worker = await loginWorker(phone, password)
      sessionStorage.setItem('sahayak_worker', JSON.stringify(worker))
      toast.success(`Welcome back, ${worker.name}!`)
      navigate('/worker')
    } catch (err) {
      toast.error('Invalid phone number or password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg,#f0fdf4,#dcfce7)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} style={{ width: '100%', maxWidth: 380 }}>
        
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ width: 64, height: 64, background: 'linear-gradient(135deg,#16a34a,#15803d)', borderRadius: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', boxShadow: '0 8px 24px rgba(22,163,74,0.3)' }}>
            <Wrench color="white" size={32} />
          </div>
          <h1 style={{ fontFamily: 'Outfit,sans-serif', fontWeight: 800, fontSize: 24, color: '#0f172a', margin: '0 0 4px' }}>Worker Portal</h1>
          <p style={{ color: '#4bbb6c', fontSize: 14, margin: 0, fontWeight: 600 }}>Sahayak Issue Resolution</p>
        </div>

        {/* Card */}
        <div className="card" style={{ padding: 28 }}>
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6, display: 'block' }}>Phone Number</label>
              <input
                type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                placeholder="+91 98765 43210" required className="input-field"
              />
            </div>
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6, display: 'block' }}>Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPw ? 'text' : 'password'} value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••" required className="input-field"
                  style={{ paddingRight: 44 }}
                />
                <button type="button" onClick={() => setShowPw(v => !v)}
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <button type="submit" className="btn-primary" disabled={loading} style={{ marginTop: 8, background: '#16a34a' }}>
              {loading ? 'Signing in...' : <><span>Sign In</span><ArrowRight size={16} /></>}
            </button>
          </form>
        </div>

      </motion.div>
    </div>
  )
}
