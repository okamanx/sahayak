import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { Mail, ArrowRight, User, Lock } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { sendOTP, verifyOTP } from '../lib/otp'
import OTPModal from '../components/OTPModal'

export default function UserLogin() {
  const [email, setEmail]     = useState('')
  const [name, setName]       = useState('')
  const [step, setStep]       = useState('email')  // 'email' | 'otp'
  const [sending, setSending] = useState(false)
  const [otpOpen, setOtpOpen] = useState(false)
  const { loginDemo }         = useAuth()
  const navigate              = useNavigate()

  async function handleSendOTP(e) {
    e.preventDefault()
    if (!email.trim()) { toast.error('Enter your email'); return }
    if (!/\S+@\S+\.\S+/.test(email)) { toast.error('Enter a valid email'); return }
    setSending(true)
    try {
      const result = await sendOTP(email.trim().toLowerCase())
      setStep('otp')
      setOtpOpen(true)
      if (result.demo) {
        toast(`🔑 Your Demo OTP: ${result.code}`, {
          duration: 30000, icon: '🧪',
          style: { background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', fontWeight: 700, fontSize: 18, letterSpacing: '6px' },
        })
        // Pre-fill for convenience
      }
    } catch (e) {
      toast.error(e.message)
    } finally { setSending(false) }
  }

  function handleVerified() {
    const displayName = name.trim() || email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
    loginDemo(email, displayName)
    setOtpOpen(false)
    toast.success(`Welcome, ${displayName}! 👋`)
    navigate('/profile')
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg,#eff6ff 0%,#f8fafc 50%,#eef2ff 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} style={{ width: '100%', maxWidth: 380 }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ width: 72, height: 72, background: 'linear-gradient(135deg,#2563eb,#7c3aed)', borderRadius: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36, margin: '0 auto 14px', boxShadow: '0 10px 30px rgba(37,99,235,0.35)' }}>🏙️</div>
          <h1 style={{ fontFamily: 'Outfit,sans-serif', fontWeight: 800, fontSize: 26, color: '#0f172a', margin: '0 0 6px' }}>Welcome to Sahayak</h1>
          <p style={{ color: '#64748b', fontSize: 14, margin: 0 }}>Sign in to track & manage your reports</p>
        </div>

        {/* Card */}
        <div className="card" style={{ padding: 28 }}>
          {/* Features list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
            {[
              { emoji: '📋', text: 'View all your submitted reports' },
              { emoji: '🔔', text: 'Track real-time status updates' },
              { emoji: '👤', text: 'Personal profile & report history' },
            ].map(({ emoji, text }) => (
              <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 18 }}>{emoji}</span>
                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{text}</span>
              </div>
            ))}
          </div>

          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 20 }}>
            <form onSubmit={handleSendOTP} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {/* Name field */}
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <User size={13} /> Your Name <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span>
                </label>
                <input type="text" value={name} onChange={e => setName(e.target.value)}
                  placeholder="e.g. Rahul Sharma" className="input-field" />
              </div>

              {/* Email field */}
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Mail size={13} /> Email Address
                </label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="your@email.com" className="input-field" required />
              </div>

              <button type="submit" className="btn-primary" disabled={sending} style={{ marginTop: 4 }}>
                {sending
                  ? 'Sending OTP...'
                  : <><Lock size={15} /> Continue with Email OTP <ArrowRight size={15} /></>}
              </button>
            </form>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', marginTop: 12 }}>
              No password needed — we verify with a one-time code
            </p>
          </div>
        </div>

        {/* Skip for now */}
        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <button onClick={() => navigate('/')} style={{ background: 'none', border: 'none', color: '#64748b', fontSize: 13, cursor: 'pointer' }}>
            Skip for now → Browse as guest
          </button>
        </div>
      </motion.div>

      <OTPModal
        isOpen={otpOpen}
        onClose={() => { setOtpOpen(false); setStep('email') }}
        contact={email}
        contactType="email"
        onVerified={handleVerified}
      />
    </div>
  )
}
