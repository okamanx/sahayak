import { CATEGORY_ICONS, severityLabel, calcPriority } from '../lib/supabase'
import { motion } from 'framer-motion'
import { AlertTriangle, CheckCircle, TrendingUp, Zap } from 'lucide-react'

const SEV_COLORS = ['', '#16a34a', '#a16207', '#d97706', '#ea580c', '#dc2626']
const SEV_BG     = ['', '#f0fdf4', '#fefce8', '#fefce8', '#fff7ed', '#fef2f2']

export default function AIResultCard({ result }) {
  if (!result) return null
  const sevColor = SEV_COLORS[result.severity] || '#6b7280'
  const sevBg    = SEV_BG[result.severity]    || '#f8fafc'
  const confPct  = Math.round((result.confidence || 0) * 100)

  return (
    <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
      className="card" style={{ overflow: 'hidden' }}
    >
      {/* AI badge */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#eff6ff', padding: '4px 10px', borderRadius: 999 }}>
          <Zap size={12} color="#2563eb" />
          <span style={{ fontSize: 11, fontWeight: 700, color: '#2563eb' }}>AI ANALYSIS COMPLETE</span>
        </div>
        <span style={{ fontSize: 12, color: '#16a34a', fontWeight: 600 }}>{confPct}% confident</span>
      </div>

      {/* Category + emoji */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
        <div style={{ width: 52, height: 52, background: '#f0f9ff', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26 }}>
          {CATEGORY_ICONS[result.category] || '⚠️'}
        </div>
        <div>
          <p style={{ fontWeight: 800, fontSize: 18, color: 'var(--text-primary)', margin: '0 0 2px', textTransform: 'capitalize', fontFamily: 'Outfit,sans-serif' }}>{result.category}</p>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0 }}>{result.department}</p>
        </div>
      </div>

      {/* Severity + Priority */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
        <div style={{ background: sevBg, border: `1.5px solid ${sevColor}30`, borderRadius: 12, padding: 12 }}>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '0 0 4px', fontWeight: 600 }}>SEVERITY</p>
          <p style={{ fontSize: 20, fontWeight: 800, color: sevColor, margin: 0, fontFamily: 'Outfit,sans-serif' }}>{result.severity}<span style={{ fontSize: 12, fontWeight: 500 }}>/5</span></p>
          <p style={{ fontSize: 11, color: sevColor, margin: 0 }}>{severityLabel(result.severity)}</p>
        </div>
        <div style={{ background: '#fef2f2', border: '1.5px solid #fca5a580', borderRadius: 12, padding: 12 }}>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '0 0 4px', fontWeight: 600 }}>PRIORITY SCORE</p>
          <p style={{ fontSize: 20, fontWeight: 800, color: '#dc2626', margin: 0, fontFamily: 'Outfit,sans-serif' }}>{result.priority}</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <TrendingUp size={10} color="#dc2626" />
            <p style={{ fontSize: 11, color: '#dc2626', margin: 0 }}>{result.priority > 12 ? 'Critical' : result.priority > 8 ? 'High' : 'Normal'}</p>
          </div>
        </div>
      </div>

      {/* Confidence bar */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
          <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>AI CONFIDENCE</span>
          <span style={{ fontSize: 11, color: '#16a34a', fontWeight: 700 }}>{confPct}%</span>
        </div>
        <div style={{ height: 6, background: 'var(--bg-muted)', borderRadius: 999, overflow: 'hidden' }}>
          <motion.div initial={{ width: 0 }} animate={{ width: `${confPct}%` }} transition={{ duration: 0.8, ease: 'easeOut' }}
            style={{ height: '100%', background: 'linear-gradient(to right,#22c55e,#16a34a)', borderRadius: 999 }} />
        </div>
      </div>

      {/* Description */}
      {result.description && (
        <div style={{ background: 'var(--bg-input)', borderRadius: 10, padding: '10px 12px', marginBottom: 12 }}>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.6 }}>{result.description}</p>
        </div>
      )}

      {/* High risk badge */}
      {result.isHighRisk && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 10, padding: '8px 12px' }}>
          <AlertTriangle size={14} color="#dc2626" />
          <span style={{ fontSize: 12, color: '#dc2626', fontWeight: 700 }}>⚠️ High Risk — Requires Immediate Action</span>
        </div>
      )}
    </motion.div>
  )
}
