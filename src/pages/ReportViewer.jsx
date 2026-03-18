import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { Search, RefreshCw, Hash, Phone, ArrowRight, MapPin, Calendar, Building2, AlertTriangle, CheckCircle, Image } from 'lucide-react'
import { fetchIssueByReportId, fetchIssuesByPhone, CATEGORY_ICONS, DEPARTMENTS } from '../lib/supabase'
import OTPModal from '../components/OTPModal'

const STATUS_STYLE = {
  'Pending':     { bg: '#fefce8', color: '#a16207', border: '#fde68a' },
  'In Progress': { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' },
  'Resolved':    { bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0' },
}

const SEV_COLORS = ['','#16a34a','#a16207','#d97706','#ea580c','#dc2626']
const SEV_LABELS = ['','Minor','Low','Moderate','High','Critical']

function IssueDetail({ issue }) {
  const s = STATUS_STYLE[issue.status] || STATUS_STYLE['Pending']
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      {/* Image */}
      {issue.image_url && (
        <img src={issue.image_url} alt="issue" style={{ width: '100%', borderRadius: 16, objectFit: 'cover', maxHeight: 200, marginBottom: 16 }} />
      )}

      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 44, height: 44, background: '#eff6ff', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>
            {CATEGORY_ICONS[issue.category] || '⚠️'}
          </div>
          <div>
            <p style={{ fontWeight: 700, color: 'var(--text-primary)', margin: 0, textTransform: 'capitalize', fontSize: 16 }}>{issue.category}</p>
            <p style={{ fontSize: 11, color: '#2563eb', margin: 0, fontFamily: 'monospace' }}>{issue.report_id}</p>
          </div>
        </div>
        <span style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}`, padding: '4px 10px', borderRadius: 999, fontSize: 12, fontWeight: 600 }}>
          {issue.status}
        </span>
      </div>

      {/* Details grid */}
      <div className="card" style={{ marginBottom: 12 }}>
        {[
          { label: 'Severity',   value: `${SEV_LABELS[issue.severity]} (${issue.severity}/5)`, color: SEV_COLORS[issue.severity] },
          { label: 'Priority',   value: `Score: ${issue.priority}`,  color: '#dc2626' },
          { label: 'Department', value: issue.department,            color: 'var(--text-primary)' },
          { label: 'Reported',   value: new Date(issue.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }), color: 'var(--text-primary)' },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{label}</span>
            <span style={{ fontSize: 13, fontWeight: 600, color }}>{value}</span>
          </div>
        ))}
      </div>

      {/* Location */}
      {issue.address && (
        <div className="card" style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 12, padding: '12px 16px' }}>
          <MapPin size={16} color="#2563eb" style={{ flexShrink: 0, marginTop: 2 }} />
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>{issue.address}</p>
        </div>
      )}

      {/* High risk warning */}
      {issue.is_high_risk && (
        <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 12, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <AlertTriangle size={16} color="#dc2626" />
          <p style={{ fontSize: 12, color: '#dc2626', margin: 0, fontWeight: 600 }}>High Risk — Immediate attention required</p>
        </div>
      )}

      {/* Resolution */}
      {issue.status === 'Resolved' && (
        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12, padding: '14px', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
            <CheckCircle size={16} color="#16a34a" />
            <span style={{ fontWeight: 700, color: '#15803d', fontSize: 14 }}>Resolved</span>
          </div>
          {issue.resolution_image_url && <img src={issue.resolution_image_url} alt="Resolution proof" style={{ width: '100%', borderRadius: 10, objectFit: 'cover', maxHeight: 160, marginBottom: 8 }} />}
          {issue.resolution_cost && <p style={{ fontSize: 13, color: '#15803d', margin: '0 0 4px' }}>Cost: <strong>₹{issue.resolution_cost.toLocaleString('en-IN')}</strong></p>}
          {issue.resolution_notes && <p style={{ fontSize: 13, color: '#166534', margin: 0, lineHeight: 1.5 }}>{issue.resolution_notes}</p>}
        </div>
      )}
    </motion.div>
  )
}

export default function ReportViewer() {
  const [mode, setMode]        = useState('id')
  const [reportId, setReportId] = useState('')
  const [phone, setPhone]      = useState('')
  const [email, setEmail]      = useState('')
  const [loading, setLoading]  = useState(false)
  const [issues, setIssues]    = useState(null)
  const [otp,    setOtp]       = useState(false)
  const [otpOk,  setOtpOk]    = useState(false)

  async function searchById() {
    if (!reportId.trim()) { toast.error('Enter a Report ID'); return }
    setLoading(true)
    try {
      const data = await fetchIssueByReportId(reportId.trim().toUpperCase())
      setIssues([data])
    } catch { toast.error('Report ID not found') }
    finally { setLoading(false) }
  }

  async function searchByPhone() {
    if (!otpOk) { if (!email) { toast.error('Enter email first'); return } setOtp(true); return }
    if (!phone) { toast.error('Enter phone number'); return }
    setLoading(true)
    try {
      const data = await fetchIssuesByPhone(phone)
      setIssues(data)
      if (!data.length) toast.error('No reports found for this phone number')
    } catch { toast.error('Search failed') }
    finally { setLoading(false) }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-page)' }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg,#eff6ff,#eef2ff)', padding: '20px 20px 16px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ maxWidth: 440, margin: '0 auto' }}>
          <h1 style={{ fontFamily: 'Outfit,sans-serif', fontWeight: 800, fontSize: 22, color: '#0f172a', margin: '0 0 4px' }}>Track Your Report</h1>
          <p style={{ color: '#475569', fontSize: 14, margin: 0 }}>Find and view your submitted issue</p>
        </div>
      </div>

      <div className="page-container">
        {/* Mode tabs */}
        <div style={{ display: 'flex', background: 'var(--bg-muted)', borderRadius: 12, padding: 4, marginBottom: 20 }}>
          {[{ key: 'id', label: '# Report ID', icon: Hash }, { key: 'phone', label: '📱 Phone', icon: Phone }].map(({ key, label }) => (
            <button key={key} onClick={() => { setMode(key); setIssues(null) }}
              style={{
                flex: 1, padding: '8px', borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, transition: 'all 0.2s',
                background: mode === key ? 'white' : 'transparent',
                color: mode === key ? '#2563eb' : 'var(--text-muted)',
                boxShadow: mode === key ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
              }}>{label}</button>
          ))}
        </div>

        {mode === 'id' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
            <input type="text" value={reportId} onChange={e => setReportId(e.target.value.toUpperCase())}
              placeholder="CIVIC-2026-XXXXXX" className="input-field"
              style={{ letterSpacing: '0.05em', fontFamily: 'monospace', fontSize: 16 }}
              onKeyDown={e => e.key === 'Enter' && searchById()}
            />
            <button onClick={searchById} disabled={loading} className="btn-primary">
              {loading ? <><RefreshCw size={15} style={{ animation: 'spin 1s linear infinite' }} /> Searching...</> : <><Search size={15} /> Find Report</>}
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
            <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
              placeholder="+91 98765 43210" className="input-field"
            />
            {!otpOk && (
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="Email for OTP verification" className="input-field"
              />
            )}
            {otpOk && <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#16a34a', fontSize: 13, fontWeight: 600 }}><CheckCircle size={14} /> OTP Verified</div>}
            <button onClick={searchByPhone} disabled={loading} className="btn-primary">
              {!otpOk ? 'Verify OTP & Search' : loading ? 'Searching...' : 'Search Reports'}
            </button>
          </div>
        )}

        {/* Results */}
        {issues === null ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
            <p style={{ fontSize: 48, margin: '0 0 12px' }}>🔍</p>
            <p style={{ fontSize: 14 }}>Enter a report ID or phone to search</p>
          </div>
        ) : issues.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
            <p style={{ fontSize: 48, margin: '0 0 12px' }}>📭</p>
            <p style={{ fontSize: 14 }}>No reports found</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {issues.map(issue => <IssueDetail key={issue.id} issue={issue} />)}
          </div>
        )}
      </div>

      <OTPModal isOpen={otp} onClose={() => setOtp(false)} contact={email} contactType="email"
        onVerified={() => { setOtpOk(true); setOtp(false); searchByPhone() }}
      />
    </div>
  )
}
