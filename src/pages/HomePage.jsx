import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { supabase } from '../lib/supabase'
import { ArrowRight, Shield, Zap, MapPin, TrendingUp, ChevronRight, Phone } from 'lucide-react'

const CATEGORIES = [
  { emoji: '🕳️', name: 'Pothole',     color: '#fff7ed', border: '#fed7aa', text: '#c2410c' },
  { emoji: '🗑️', name: 'Garbage',     color: '#fefce8', border: '#fde68a', text: '#a16207' },
  { emoji: '🚿', name: 'Drainage',    color: '#eff6ff', border: '#bfdbfe', text: '#1d4ed8' },
  { emoji: '💡', name: 'Streetlight', color: '#faf5ff', border: '#e9d5ff', text: '#7c3aed' },
  { emoji: '🔧', name: 'Pipeline',    color: '#f0fdf4', border: '#bbf7d0', text: '#15803d' },
]

const FEATURES = [
  { icon: Zap,         title: 'AI-Powered',    desc: 'Gemini classifies issues in seconds',    color: '#eff6ff', ico: '#2563eb' },
  { icon: MapPin,      title: 'GPS Tracking',  desc: 'Pinpoint exact location on live map',    color: '#f0fdf4', ico: '#16a34a' },
  { icon: Shield,      title: 'OTP Verified',  desc: 'Secure identity, no account needed',      color: '#faf5ff', ico: '#7c3aed' },
  { icon: TrendingUp,  title: 'Live Tracking', desc: 'Real-time status & resolution updates',  color: '#fff7ed', ico: '#ea580c' },
]

const STEPS = [
  { n: '01', title: 'Upload Photo',  desc: 'Take or upload a photo of the issue',    emoji: '📸', color: '#eff6ff' },
  { n: '02', title: 'AI Analyzes',   desc: 'Gemini Vision classifies & prioritizes',  emoji: '🧠', color: '#f0fdf4' },
  { n: '03', title: 'Track & Get Fixed', desc: 'Get notified when resolved with proof', emoji: '✅', color: '#faf5ff' },
]

export default function HomePage() {
  const navigate = useNavigate()
  const [stats, setStats] = useState({ total: 0, resolved: 0, highPriority: 0, inProgress: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const { data } = await supabase.from('issues').select('status, is_high_risk')
        if (data) setStats({
          total:        data.length,
          resolved:     data.filter(i => i.status === 'Resolved').length,
          highPriority: data.filter(i => i.is_high_risk).length,
          inProgress:   data.filter(i => i.status === 'In Progress').length,
        })
      } catch {}
      finally { setLoading(false) }
    }
    load()
  }, [])

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-page)' }}>

      {/* ── Top Bar ────────────────────────────────── */}
      <div style={{ background: 'var(--bg-card)', borderBottom: '1px solid var(--border)', padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, background: 'linear-gradient(135deg,#2563eb,#1d4ed8)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>🏙️</div>
          <div>
            <p style={{ fontFamily: 'Outfit,Inter,sans-serif', fontWeight: 700, fontSize: 15, color: 'var(--text-primary)', margin: 0 }}>SAHAYAK</p>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>Civic Issue Reporter</p>
          </div>
        </div>
        <button onClick={() => navigate('/admin')} style={{ fontSize: 12, color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
          <Shield size={13} /> Admin
        </button>
      </div>

      {/* ── Hero ───────────────────────────────────── */}
      <div style={{ background: 'linear-gradient(135deg,#eff6ff 0%,#f8fafc 50%,#eef2ff 100%)', padding: '40px 20px 32px' }}>
        <div style={{ maxWidth: 440, margin: '0 auto' }}>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#dbeafe', padding: '4px 12px', borderRadius: 999, marginBottom: 16 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#1d4ed8', letterSpacing: '0.05em' }}>🤖 Powered by Gemini AI</span>
            </div>
            <h1 style={{ fontFamily: 'Outfit,Inter,sans-serif', fontSize: 42, fontWeight: 900, color: '#0f172a', lineHeight: 1.1, margin: '0 0 8px' }}>
              Report.<br />Track.<br /><span style={{ background: 'linear-gradient(135deg,#2563eb,#7c3aed)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Resolve.</span>
            </h1>
            <p style={{ color: '#475569', fontSize: 15, lineHeight: 1.6, margin: '0 0 24px', maxWidth: 320 }}>
              AI-powered civic reporting that ensures transparency and accountability in public services.
            </p>
            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={() => navigate('/report')} className="btn-primary" style={{ flex: 1, maxWidth: 220 }}>
                Report Issue <ArrowRight size={16} />
              </button>
              <button onClick={() => navigate('/track')} className="btn-secondary" style={{ padding: '0.75rem 1.25rem' }}>
                Track
              </button>
            </div>
          </motion.div>
        </div>
      </div>

      <div className="page-container">

        {/* ── Stats ──────────────────────────────────── */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, margin: '24px 0' }}>
          {[
            { label: 'Total Reports', value: stats.total,        emoji: '📋', accent: '#2563eb' },
            { label: 'Resolved',      value: stats.resolved,     emoji: '✅', accent: '#16a34a' },
            { label: 'In Progress',   value: stats.inProgress,   emoji: '🔄', accent: '#d97706' },
            { label: 'High Risk',     value: stats.highPriority, emoji: '🚨', accent: '#dc2626' },
          ].map((s, i) => (
            <div key={i} className="card" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px' }}>
              <div style={{ width: 40, height: 40, background: s.accent + '15', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>
                {s.emoji}
              </div>
              <div>
                <p style={{ fontSize: 24, fontWeight: 800, color: s.accent, margin: 0, fontFamily: 'Outfit,sans-serif' }}>
                  {loading ? '—' : s.value}
                </p>
                <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0 }}>{s.label}</p>
              </div>
            </div>
          ))}
        </motion.div>

        {/* ── Categories ─────────────────────────────── */}
        <section style={{ marginBottom: 28 }}>
          <h2 className="section-title">Issue Categories</h2>
          <p className="section-sub">AI auto-detects from your photo</p>
          <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 8 }}>
            {CATEGORIES.map(cat => (
              <button
                key={cat.name}
                onClick={() => navigate('/report')}
                style={{
                  flexShrink: 0, minWidth: 80, padding: '14px 10px',
                  background: cat.color, border: `1.5px solid ${cat.border}`,
                  borderRadius: 16, cursor: 'pointer', textAlign: 'center',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                  transition: 'transform 0.2s, box-shadow 0.2s',
                }}
                onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-3px)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'none'}
              >
                <span style={{ fontSize: 26 }}>{cat.emoji}</span>
                <span style={{ fontSize: 11, fontWeight: 600, color: cat.text, whiteSpace: 'nowrap' }}>{cat.name}</span>
              </button>
            ))}
          </div>
        </section>

        {/* ── Features ───────────────────────────────── */}
        <section style={{ marginBottom: 28 }}>
          <h2 className="section-title">Why Sahayak?</h2>
          <p className="section-sub">Built for citizens, powered by AI</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {FEATURES.map(({ icon: Icon, title, desc, color, ico }, i) => (
              <motion.div key={title} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 * i }}
                className="card" style={{ padding: 16 }}>
                <div style={{ width: 38, height: 38, background: color, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
                  <Icon size={18} color={ico} />
                </div>
                <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 4px' }}>{title}</p>
                <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>{desc}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ── How it works ───────────────────────────── */}
        <section style={{ marginBottom: 28 }}>
          <h2 className="section-title">How It Works</h2>
          <p className="section-sub">3 simple steps to get your issue resolved</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {STEPS.map(step => (
              <div key={step.n} className="card" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: 16 }}>
                <div style={{ width: 50, height: 50, background: step.color, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, flexShrink: 0 }}>
                  {step.emoji}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                    <span style={{ fontSize: 11, fontWeight: 800, color: '#2563eb', background: '#eff6ff', padding: '2px 8px', borderRadius: 999 }}>{step.n}</span>
                    <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{step.title}</span>
                  </div>
                  <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0 }}>{step.desc}</p>
                </div>
                <ChevronRight size={16} color="var(--text-muted)" />
              </div>
            ))}
          </div>
        </section>

        {/* ── Emergency CTA ──────────────────────────── */}
        <section style={{ marginBottom: 24 }}>
          <button
            onClick={() => navigate('/emergency')}
            style={{
              width: '100%', background: 'linear-gradient(135deg,#fef2f2,#fee2e2)', border: '1.5px solid #fca5a5',
              borderRadius: 20, padding: '16px 20px', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 14, textAlign: 'left',
              transition: 'box-shadow 0.2s',
            }}
          >
            <div style={{ width: 48, height: 48, background: '#fee2e2', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Phone size={22} color="#dc2626" />
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontWeight: 700, color: '#991b1b', margin: '0 0 2px', fontSize: 14 }}>Emergency Reporting</p>
              <p style={{ fontSize: 12, color: '#b91c1c', margin: 0 }}>Immediate danger? Report instantly</p>
            </div>
            <ArrowRight size={18} color="#dc2626" />
          </button>
        </section>

      </div>
    </div>
  )
}
