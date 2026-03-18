import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { BarChart2, Map, List, LogOut, TrendingUp, AlertTriangle, CheckCircle, Clock } from 'lucide-react'
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { fetchAllIssues, CATEGORY_ICONS } from '../lib/supabase'
import toast from 'react-hot-toast'

const CHART_COLORS = ['#2563eb', '#16a34a', '#d97706', '#dc2626', '#7c3aed', '#0891b2']

// ── Shared Admin Nav ───────────────────────────────────────────────
export function AdminNav({ active }) {
  const navigate = useNavigate()
  const tabs = [
    { path: '/admin/dashboard', icon: BarChart2, label: 'Dashboard' },
    { path: '/admin/issues',    icon: List,      label: 'Issues' },
    { path: '/admin/map',       icon: Map,       label: 'Map' },
  ]
  function logout() {
    sessionStorage.removeItem('sahayak_admin')
    navigate('/admin')
    toast.success('Logged out')
  }
  return (
    <div className="admin-nav" style={{ display: 'flex', alignItems: 'center', padding: '0 16px', height: 56 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginRight: 'auto' }}>
        <span style={{ fontSize: 18 }}>🏙️</span>
        <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)', fontFamily: 'Outfit,sans-serif' }}>Sahayak Admin</span>
      </div>
      {tabs.map(({ path, icon: Icon, label }) => (
        <button key={path} onClick={() => navigate(path)}
          style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
            padding: '6px 10px', borderRadius: 10, border: 'none', cursor: 'pointer',
            background: active === path ? '#eff6ff' : 'transparent',
            color: active === path ? '#2563eb' : 'var(--text-muted)',
            fontSize: 10, fontWeight: 600, transition: 'all 0.2s',
          }}>
          <Icon size={18} />
          {label}
        </button>
      ))}
      <button onClick={logout} style={{ marginLeft: 8, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
        <LogOut size={16} />
      </button>
    </div>
  )
}

export default function AdminDashboard() {
  const [issues, setIssues] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAllIssues().then(data => { setIssues(data || []); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  // ── Computed stats ─────────────────────────────────────────────
  const stats = {
    total:     issues.length,
    resolved:  issues.filter(i => i.status === 'Resolved').length,
    pending:   issues.filter(i => i.status === 'Pending').length,
    highRisk:  issues.filter(i => i.is_high_risk).length,
  }

  // Category distribution
  const catCounts = issues.reduce((a, i) => ({ ...a, [i.category]: (a[i.category] || 0) + 1 }), {})
  const pieData = Object.entries(catCounts).map(([name, val]) => ({ name, value: val }))

  // Status bar
  const statusData = [
    { name: 'Pending',    value: stats.pending },
    { name: 'In Progress', value: issues.filter(i => i.status === 'In Progress').length },
    { name: 'Resolved',   value: stats.resolved },
  ]

  // Last 7 days trend (mock from created_at)
  const trendData = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i))
    const dateStr = d.toISOString().split('T')[0]
    return { day: d.toLocaleDateString('en', { weekday: 'short' }), count: issues.filter(x => x.created_at?.startsWith(dateStr)).length }
  })

  const topIssues = [...issues].sort((a, b) => b.priority - a.priority).slice(0, 5)

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-page)' }}>
      <AdminNav active="/admin/dashboard" />

      <div style={{ maxWidth: 900, margin: '0 auto', padding: 16, paddingBottom: 40 }}>
        {/* Stat cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 12, marginBottom: 20 }}>
          {[
            { label: 'Total Issues',   value: stats.total,    icon: TrendingUp,    color: '#2563eb', bg: '#eff6ff' },
            { label: 'Resolved',       value: stats.resolved, icon: CheckCircle,   color: '#16a34a', bg: '#f0fdf4' },
            { label: 'Pending',        value: stats.pending,  icon: Clock,         color: '#d97706', bg: '#fefce8' },
            { label: 'High Risk',      value: stats.highRisk, icon: AlertTriangle, color: '#dc2626', bg: '#fef2f2' },
          ].map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className="card" style={{ padding: 16 }}>
              <div style={{ width: 36, height: 36, background: bg, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
                <Icon size={18} color={color} />
              </div>
              <p style={{ fontSize: 28, fontWeight: 800, color, margin: 0, fontFamily: 'Outfit,sans-serif' }}>{loading ? '—' : value}</p>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0 }}>{label}</p>
            </div>
          ))}
        </div>

        {/* Trend chart */}
        <div className="card" style={{ marginBottom: 16 }}>
          <p style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12, fontSize: 14 }}>Reports — Last 7 Days</p>
          <ResponsiveContainer width="100%" height={140}>
            <LineChart data={trendData}>
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
              <YAxis hide allowDecimals={false} />
              <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
              <Line type="monotone" dataKey="count" stroke="#2563eb" strokeWidth={2.5} dot={{ fill: '#2563eb', r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
          {/* Status bar chart */}
          <div className="card">
            <p style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12, fontSize: 14 }}>By Status</p>
            <ResponsiveContainer width="100%" height={120}>
              <BarChart data={statusData} barSize={20}>
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                <YAxis hide allowDecimals={false} />
                <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="value" radius={[6,6,0,0]}>
                  {statusData.map((_, i) => <Cell key={i} fill={['#fbbf24','#3b82f6','#22c55e'][i]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Category pie */}
          <div className="card">
            <p style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12, fontSize: 14 }}>By Category</p>
            <ResponsiveContainer width="100%" height={120}>
              <PieChart>
                <Pie data={pieData.length ? pieData : [{ name: 'None', value: 1 }]} dataKey="value" cx="50%" cy="50%" outerRadius={50} innerRadius={28}>
                  {pieData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top priority issues */}
        <div className="card">
          <p style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: 14, fontSize: 14 }}>🔥 Top Priority Issues</p>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[1,2,3].map(i => <div key={i} className="shimmer" style={{ height: 56 }} />)}
            </div>
          ) : topIssues.length === 0 ? (
            <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px 0', fontSize: 14 }}>No issues yet. Start reporting!</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {topIssues.map(issue => (
                <div key={issue.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ fontSize: 22, flexShrink: 0 }}>{CATEGORY_ICONS[issue.category] || '⚠️'}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 2px', fontSize: 13, textTransform: 'capitalize' }}>{issue.category}</p>
                    <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0, fontFamily: 'monospace' }}>{issue.report_id}</p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontSize: 16, fontWeight: 800, color: '#dc2626', margin: 0, fontFamily: 'Outfit,sans-serif' }}>P{issue.priority}</p>
                    <span className={`badge-${issue.status === 'Resolved' ? 'resolved' : issue.status === 'In Progress' ? 'progress' : 'pending'}`}>{issue.status}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
