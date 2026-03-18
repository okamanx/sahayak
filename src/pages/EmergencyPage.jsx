import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Phone, ArrowRight, AlertTriangle, Shield, Heart } from 'lucide-react'

const CONTACTS = [
  { name: 'Police',           number: '100',   color: '#2563eb', bg: '#eff6ff', emoji: '👮' },
  { name: 'Fire Brigade',     number: '101',   color: '#dc2626', bg: '#fef2f2', emoji: '🚒' },
  { name: 'Ambulance',        number: '102',   color: '#16a34a', bg: '#f0fdf4', emoji: '🚑' },
  { name: 'Disaster Mgmt',   number: '108',   color: '#d97706', bg: '#fefce8', emoji: '⛑️' },
  { name: 'Women Helpline',   number: '1091',  color: '#7c3aed', bg: '#faf5ff', emoji: '👩' },
  { name: 'Child Helpline',   number: '1098',  color: '#0891b2', bg: '#ecfeff', emoji: '🧒' },
]

const TIPS = [
  { icon: '⚠️', tip: 'Take photo as evidence before reporting' },
  { icon: '📍', tip: 'Note the exact location and landmarks' },
  { icon: '🚧', tip: 'Warn others by placing visible markers' },
  { icon: '📱', tip: 'Use SOS button for immediate danger' },
]

export default function EmergencyPage() {
  const navigate = useNavigate()

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-page)', paddingBottom: 80 }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg,#fef2f2,#fff7ed)', padding: '24px 20px 20px', borderBottom: '1px solid #fca5a5' }}>
        <div style={{ maxWidth: 440, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <div style={{ width: 40, height: 40, background: '#fee2e2', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🚨</div>
            <div>
              <h1 style={{ fontFamily: 'Outfit,sans-serif', fontWeight: 800, fontSize: 20, color: '#991b1b', margin: 0 }}>Emergency</h1>
              <p style={{ fontSize: 12, color: '#b91c1c', margin: 0 }}>Quick access to emergency services</p>
            </div>
          </div>
          {/* Big SOS button */}
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={() => navigate('/report')}
            style={{
              width: '100%', background: 'linear-gradient(135deg,#dc2626,#b91c1c)',
              color: 'white', border: 'none', borderRadius: 20, padding: '18px 20px',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              boxShadow: '0 8px 24px rgba(220,38,38,0.35)',
            }}
          >
            <div style={{ textAlign: 'left' }}>
              <p style={{ fontWeight: 800, fontSize: 18, margin: 0, fontFamily: 'Outfit,sans-serif' }}>🆘 Report Emergency Issue</p>
              <p style={{ fontSize: 12, opacity: 0.85, margin: 0 }}>Immediate civic danger — priority processing</p>
            </div>
            <ArrowRight size={22} />
          </motion.button>
        </div>
      </div>

      <div style={{ maxWidth: 440, margin: '0 auto', padding: '20px' }}>
        {/* Emergency Contacts */}
        <h2 className="section-title">Emergency Contacts</h2>
        <p className="section-sub">Tap to call immediately</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 28 }}>
          {CONTACTS.map(c => (
            <motion.a
              key={c.number}
              href={`tel:${c.number}`}
              whileTap={{ scale: 0.96 }}
              style={{
                background: c.bg, border: `1.5px solid ${c.color}30`,
                borderRadius: 16, padding: '14px', textDecoration: 'none',
                display: 'flex', flexDirection: 'column', gap: 6,
                boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 22 }}>{c.emoji}</span>
                <Phone size={14} color={c.color} />
              </div>
              <p style={{ fontWeight: 800, fontSize: 22, color: c.color, margin: 0, fontFamily: 'Outfit,sans-serif' }}>{c.number}</p>
              <p style={{ fontSize: 11, color: c.color, fontWeight: 600, margin: 0 }}>{c.name}</p>
            </motion.a>
          ))}
        </div>

        {/* Safety Tips */}
        <h2 className="section-title">Safety Tips</h2>
        <p className="section-sub">Before reporting an emergency</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 28 }}>
          {TIPS.map((t, i) => (
            <div key={i} className="card" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px' }}>
              <span style={{ fontSize: 22, flexShrink: 0 }}>{t.icon}</span>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>{t.tip}</p>
            </div>
          ))}
        </div>

        {/* Info banner */}
        <div style={{ background: '#eff6ff', border: '1.5px solid #bfdbfe', borderRadius: 16, padding: '16px', textAlign: 'center' }}>
          <Shield size={24} color="#2563eb" style={{ margin: '0 auto 8px' }} />
          <p style={{ fontSize: 13, color: '#1e40af', fontWeight: 600, margin: '0 0 4px' }}>Your safety is our priority</p>
          <p style={{ fontSize: 12, color: '#3b82f6', margin: 0 }}>All emergency reports are flagged as high priority and escalated immediately.</p>
        </div>
      </div>
    </div>
  )
}
