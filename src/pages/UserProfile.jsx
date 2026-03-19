import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { LogOut, RefreshCw, MapPin, Calendar, AlertTriangle, CheckCircle, Clock, ChevronRight } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { fetchIssuesByEmail } from '../lib/supabase'
import { CATEGORY_ICONS } from '../lib/supabase'

const SEV_COLORS = ['','#16a34a','#a16207','#d97706','#ea580c','#dc2626']

function statusStyle(status) {
  if (status === 'Resolved')    return { bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0' }
  if (status === 'In Progress') return { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' }
  return { bg: '#fefce8', color: '#a16207', border: '#fde68a' }
}

export default function UserProfile() {
  const { user, logout, updateProfileName } = useAuth()
  const navigate            = useNavigate()
  const [issues, setIssues] = useState([])
  const [loading, setLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [editName, setEditName] = useState('')

  useEffect(() => {
    if (!user) { navigate('/login'); return }
    loadIssues()
  }, [user])

  async function loadIssues() {
    setLoading(true)
    try {
      const data = await fetchIssuesByEmail(user.email)
      setIssues(data || [])
    } catch { setIssues([]) }
    finally { setLoading(false) }
  }

  function handleLogout() {
    logout()
    toast.success('Logged out')
    navigate('/')
  }

  function handleSaveProfile() {
    if (!editName.trim()) {
      toast.error('Name cannot be empty')
      return
    }
    updateProfileName(editName)
    setIsEditing(false)
    toast.success('Profile updated!')
  }

  if (!user) return null

  const stats = {
    total:    issues.length,
    resolved: issues.filter(i => i.status === 'Resolved').length,
    pending:  issues.filter(i => i.status === 'Pending').length,
  }

  // Avatar color
  const avatarColors = ['#2563eb','#7c3aed','#16a34a','#dc2626','#d97706','#0891b2']
  const avatarColor  = avatarColors[user.email.charCodeAt(0) % avatarColors.length]

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-page)', paddingBottom: 80 }}>
      {/* Profile header */}
      <div style={{ background: `linear-gradient(135deg, ${avatarColor}15 0%, #f8fafc 100%)`, borderBottom: '1px solid var(--border)', padding: '28px 20px 20px' }}>
        <div style={{ maxWidth: 440, margin: '0 auto', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            {/* Avatar */}
            <div style={{ width: 64, height: 64, background: `linear-gradient(135deg,${avatarColor},${avatarColor}cc)`, borderRadius: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 26, fontWeight: 800, fontFamily: 'Outfit,sans-serif', boxShadow: `0 6px 20px ${avatarColor}40` }}>
              {user.avatar || user.email.charAt(0).toUpperCase()}
            </div>
            <div>
              {isEditing ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <input 
                    type="text" 
                    value={editName} 
                    onChange={e => setEditName(e.target.value)} 
                    className="input-field" 
                    style={{ padding: '4px 8px', fontSize: 16, width: 140, height: 'auto' }}
                  />
                  <button onClick={handleSaveProfile} style={{ background: '#16a34a', color: 'white', border: 'none', borderRadius: 6, padding: '4px 8px', fontSize: 12, fontWeight: 600 }}>Save</button>
                  <button onClick={() => setIsEditing(false)} style={{ background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: 6, padding: '4px 8px', fontSize: 12, fontWeight: 600 }}>Cancel</button>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                  <h1 style={{ fontFamily: 'Outfit,sans-serif', fontWeight: 800, fontSize: 20, color: '#0f172a', margin: 0 }}>{user.name || user.email.split('@')[0]}</h1>
                  <button onClick={() => { setEditName(user.name || user.email.split('@')[0]); setIsEditing(true); }} style={{ fontSize: 11, background: '#e2e8f0', color: '#475569', border: 'none', borderRadius: 4, padding: '2px 6px', fontWeight: 600, cursor: 'pointer' }}>Edit</button>
                </div>
              )}
              <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>{user.email}</p>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#dbeafe', padding: '2px 8px', borderRadius: 999, margin: '4px 0 0 0' }}>
                <span style={{ fontSize: 10, color: '#1d4ed8', fontWeight: 700 }}>VERIFIED CITIZEN</span>
              </div>
            </div>
          </div>
          <button onClick={handleLogout} style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#fef2f2', border: '1px solid #fca5a5', color: '#dc2626', borderRadius: 10, padding: '6px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
            <LogOut size={14} /> Sign out
          </button>
        </div>

        {/* Mini stats */}
        <div style={{ maxWidth: 440, margin: '16px auto 0', display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
          {[
            { label: 'Reports',  value: stats.total,    color: '#2563eb' },
            { label: 'Resolved', value: stats.resolved,  color: '#16a34a' },
            { label: 'Pending',  value: stats.pending,   color: '#d97706' },
          ].map(({ label, value, color }) => (
            <div key={label} className="card" style={{ textAlign: 'center', padding: '12px 8px' }}>
              <p style={{ fontSize: 22, fontWeight: 800, color, margin: 0, fontFamily: 'Outfit,sans-serif' }}>{loading ? '—' : value}</p>
              <p style={{ fontSize: 11, color: 'var(--text-secondary)', margin: 0 }}>{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Reports list */}
      <div style={{ maxWidth: 440, margin: '0 auto', padding: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h2 className="section-title" style={{ margin: 0 }}>Your Reports</h2>
          <button onClick={loadIssues} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[1,2,3].map(i => <div key={i} className="shimmer" style={{ height: 80 }} />)}
          </div>
        ) : issues.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ textAlign: 'center', padding: '48px 20px' }}>
            <p style={{ fontSize: 56, margin: '0 0 12px' }}>📭</p>
            <p style={{ fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 6px' }}>No reports yet</p>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '0 0 20px' }}>Report your first civic issue</p>
            <button onClick={() => navigate('/report')} className="btn-primary" style={{ maxWidth: 200, margin: '0 auto' }}>
              Report an Issue
            </button>
          </motion.div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {issues.map(issue => {
              const s = statusStyle(issue.status)
              return (
                <motion.div key={issue.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  className="card-hover" style={{ display: 'flex', gap: 12, padding: 14 }}
                >
                  {issue.image_url ? (
                    <img src={issue.image_url} alt="" style={{ width: 60, height: 60, borderRadius: 12, objectFit: 'cover', flexShrink: 0 }} />
                  ) : (
                    <div style={{ width: 60, height: 60, background: '#eff6ff', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, flexShrink: 0 }}>
                      {CATEGORY_ICONS[issue.category] || '⚠️'}
                    </div>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                      <p style={{ fontWeight: 700, color: 'var(--text-primary)', margin: 0, textTransform: 'capitalize', fontSize: 14 }}>{issue.category}</p>
                      <span style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}`, padding: '2px 8px', borderRadius: 999, fontSize: 10, fontWeight: 700, flexShrink: 0 }}>
                        {issue.status}
                      </span>
                    </div>
                    <p style={{ fontSize: 10, color: '#2563eb', fontFamily: 'monospace', margin: '0 0 4px' }}>{issue.report_id}</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 11, color: SEV_COLORS[issue.severity] || '#6b7280', fontWeight: 600 }}>Sev {issue.severity}/5</span>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        {new Date(issue.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                      </span>
                    </div>
                  </div>
                  
                  {/* Inline Details for Voice & Text */}
                  {(issue.description || issue.audio_url || issue.transcription) && (
                    <div style={{ padding: '12px 14px', borderTop: '1px solid var(--border)', background: '#f8fafc', borderBottomLeftRadius: 14, borderBottomRightRadius: 14 }}>
                      {issue.description && (
                        <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '0 0 10px', lineHeight: 1.4 }}>{issue.description}</p>
                      )}
                      {issue.audio_url && (
                        <audio controls src={issue.audio_url} style={{ width: '100%', height: 32, marginBottom: issue.transcription ? 8 : 0 }} />
                      )}
                      {issue.transcription && (
                        <div style={{ background: '#f0fdf4', padding: '8px 10px', borderRadius: 8, border: '1px solid #bbf7d0' }}>
                          <p style={{ fontSize: 10, fontWeight: 800, color: '#16a34a', margin: '0 0 2px', textTransform: 'uppercase' }}>AI Transcript</p>
                          <p style={{ fontSize: 12, color: '#15803d', margin: 0, fontStyle: 'italic', lineHeight: 1.4 }}>"{issue.transcription}"</p>
                        </div>
                      )}
                    </div>
                  )}
                </motion.div>
              )
            })}
          </div>
        )}

        {/* Report more CTA */}
        {issues.length > 0 && (
          <button onClick={() => navigate('/report')} className="btn-primary" style={{ marginTop: 16 }}>
            + Report Another Issue
          </button>
        )}
      </div>
    </div>
  )
}
