import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { TrendingUp, AlertTriangle, CheckCircle, Clock, X, Maximize2, ChevronRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { fetchAllIssues, CATEGORY_ICONS } from '../lib/supabase'
import AdminBottomNav from '../components/AdminBottomNav'

const CHART_COLORS = ['#2563eb', '#16a34a', '#d97706', '#dc2626', '#7c3aed', '#0891b2']

export default function AdminDashboard() {
  const [issues, setIssues] = useState([])
  const [loading, setLoading] = useState(true)
  const [expandedChart, setExpandedChart] = useState(null)
  const navigate = useNavigate()

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
  const pieData = Object.entries(catCounts).map(([name, value]) => ({ name, value }))

  // Status bar
  const statusData = [
    { name: 'Pending',     value: stats.pending, color: '#fbbf24' },
    { name: 'In Progress', value: issues.filter(i => i.status === 'In Progress').length, color: '#3b82f6' },
    { name: 'Resolved',    value: stats.resolved, color: '#22c55e' },
  ]

  // Trend data
  const trendData = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i))
    const dateStr = d.toISOString().split('T')[0]
    return { 
      day: d.toLocaleDateString('en', { weekday: 'short' }), 
      count: issues.filter(x => x.created_at?.startsWith(dateStr)).length,
      fullDate: d.toLocaleDateString()
    }
  })

  const topIssues = [...issues].sort((a, b) => b.priority - a.priority).slice(0, 5)

  const handleStatClick = (filter) => {
    if (filter === 'total') navigate('/admin/issues')
    else if (filter === 'highRisk') navigate('/admin/issues?risk=high')
    else navigate(`/admin/issues?status=${filter}`)
  }

  const ChartModal = ({ type, data, title, onClose }) => (
    <motion.div 
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
      onClick={onClose}
    >
      <motion.div 
        initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
        style={{ background: '#fff', borderRadius: 24, width: '100%', maxWidth: 700, padding: 32, position: 'relative', boxShadow: '0 20px 50px rgba(0,0,0,0.2)' }}
        onClick={e => e.stopPropagation()}
      >
        <button onClick={onClose} style={{ position: 'absolute', right: 20, top: 20, background: '#f1f5f9', border: 'none', borderRadius: '50%', padding: 8, cursor: 'pointer', color: '#64748b' }}>
          <X size={20} />
        </button>
        <h3 style={{ fontSize: 20, fontWeight: 800, margin: '0 0 24px', color: '#0f172a', fontFamily: 'Outfit,sans-serif' }}>{title}</h3>
        
        <div style={{ height: 350, width: '100%' }}>
          <ResponsiveContainer>
            {type === 'line' ? (
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="#2563eb" strokeWidth={4} dot={{ r: 6, fill: '#2563eb', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 8 }} />
              </LineChart>
            ) : type === 'bar' ? (
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                <Tooltip cursor={{ fill: 'rgba(0,0,0,0.02)' }} />
                <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                  {data.map((entry, i) => <Cell key={i} fill={entry.color || CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Bar>
              </BarChart>
            ) : (
              <PieChart>
                <Pie data={data} dataKey="value" nameKey="name" outerRadius={120} innerRadius={80} paddingAngle={5}>
                  {data.map((entry, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            )}
          </ResponsiveContainer>
        </div>
      </motion.div>
    </motion.div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', paddingBottom: 120 }}>
      {/* Premium Header */}
      <div style={{ background: '#fff', padding: '24px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontFamily: 'Outfit,sans-serif', fontWeight: 800, fontSize: 24, color: '#0f172a', margin: 0 }}>Executive Overview</h1>
          <p style={{ color: '#64748b', fontSize: 14, margin: '4px 0 0' }}>Real-time civic management insights</p>
        </div>
        <div style={{ width: 44, height: 44, background: 'linear-gradient(135deg, #2563eb, #1d4ed8)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🏙️</div>
      </div>

      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '24px 16px' }}>
        
        {/* Clickable Stat Summary */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
          {[
            { id: 'total',    label: 'Total Reports',  value: stats.total,    icon: TrendingUp,    color: '#3b82f6', bg: '#eff6ff' },
            { id: 'Resolved', label: 'Fixed Issues',   value: stats.resolved, icon: CheckCircle,   color: '#10b981', bg: '#ecfdf5' },
            { id: 'Pending',  label: 'Active Cases',   value: stats.pending,  icon: Clock,         color: '#f59e0b', bg: '#fffbeb' },
            { id: 'highRisk', label: 'Critical Risk',  value: stats.highRisk, icon: AlertTriangle, color: '#ef4444', bg: '#fef2f2' },
          ].map((s) => (
            <motion.button 
              whileHover={{ y: -4, boxShadow: '0 12px 24px rgba(0,0,0,0.05)' }}
              whileTap={{ scale: 0.98 }}
              key={s.id} 
              onClick={() => handleStatClick(s.id)}
              style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 20, padding: 20, textAlign: 'left', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 12 }}
            >
              <div style={{ width: 40, height: 40, background: s.bg, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <s.icon size={20} color={s.color} />
              </div>
              <div>
                <p style={{ fontSize: 28, fontWeight: 800, color: '#1e293b', margin: 0, fontFamily: 'Outfit,sans-serif' }}>{loading ? '—' : s.value}</p>
                <p style={{ fontSize: 13, fontWeight: 600, color: '#64748b', margin: 0 }}>{s.label}</p>
              </div>
            </motion.button>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1fr', gap: 16, marginBottom: 16 }}>
          {/* Main Trend Chart */}
          <div className="card" style={{ padding: 24, position: 'relative' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h3 style={{ fontSize: 16, fontWeight: 800, color: '#1e293b', margin: 0 }}>Reporting Velocity (7 Days)</h3>
              <button onClick={() => setExpandedChart({ type: 'line', data: trendData, title: 'Submission Trend' })} style={{ color: '#2563eb', padding: 8, borderRadius: 8, background: '#eff6ff', border: 'none', cursor: 'pointer' }}>
                <Maximize2 size={16} />
              </button>
            </div>
            <div style={{ height: 180 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData}>
                  <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                  <YAxis hide domain={['auto', 'auto']} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 8px 24px rgba(0,0,0,0.1)' }} />
                  <Line type="monotone" dataKey="count" stroke="#2563eb" strokeWidth={3} dot={{ fill: '#2563eb', r: 4 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Status Distribution */}
          <div className="card" style={{ padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h3 style={{ fontSize: 16, fontWeight: 800, color: '#1e293b', margin: 0 }}>Workflow Stage</h3>
              <button onClick={() => setExpandedChart({ type: 'bar', data: statusData, title: 'Workflow Distribution' })} style={{ color: '#2563eb', padding: 8, borderRadius: 8, background: '#eff6ff', border: 'none', cursor: 'pointer' }}>
                <Maximize2 size={16} />
              </button>
            </div>
            <div style={{ height: 180 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={statusData}>
                  <XAxis dataKey="name" hide />
                  <Tooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 8px 24px rgba(0,0,0,0.1)' }} cursor={{ fill: 'transparent' }} />
                  <Bar dataKey="value" radius={[6, 6, 6, 6]} barSize={32}>
                    {statusData.map((entry, index) => <Cell key={index} fill={entry.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12 }}>
               {statusData.map(s => (
                 <div key={s.name} style={{ textAlign: 'center' }}>
                    <p style={{ fontSize: 11, fontWeight: 700, color: '#64748b', margin: 0, textTransform: 'uppercase' }}>{s.name.split(' ')[0]}</p>
                    <p style={{ fontSize: 14, fontWeight: 800, color: s.color, margin: 0 }}>{s.value}</p>
                 </div>
               ))}
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.8fr', gap: 16 }}>
          {/* Category Breakdown */}
          <div className="card" style={{ padding: 24 }}>
             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
               <h3 style={{ fontSize: 16, fontWeight: 800, color: '#1e293b', margin: 0 }}>By Category</h3>
               <button onClick={() => setExpandedChart({ type: 'pie', data: pieData, title: 'Category Breakdown' })} style={{ color: '#2563eb', padding: 8, borderRadius: 8, background: '#eff6ff', border: 'none', cursor: 'pointer' }}>
                 <Maximize2 size={16} />
               </button>
             </div>
             <div style={{ height: 160 }}>
                <ResponsiveContainer width="100%" height="100%">
                   <PieChart>
                      <Pie data={pieData.length ? pieData : [{name: 'None', value: 1}]} dataKey="value" cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={4}>
                        {pieData.map((entry, index) => (
                          <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} onClick={() => navigate(`/admin/issues?category=${entry.name}`)} style={{ cursor: 'pointer' }} />
                        ))}
                      </Pie>
                      <Tooltip />
                   </PieChart>
                </ResponsiveContainer>
             </div>
             <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 16 }}>
                {pieData.map((c, i) => (
                  <button key={c.name} onClick={() => navigate(`/admin/issues?category=${c.name}`)} style={{ background: '#f1f5f9', border: 'none', padding: '4px 10px', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                     <span style={{ width: 8, height: 8, borderRadius: '50%', background: CHART_COLORS[i % CHART_COLORS.length] }} />
                     <span style={{ fontSize: 11, fontWeight: 600, color: '#475569', textTransform: 'capitalize' }}>{c.name}</span>
                  </button>
                ))}
             </div>
          </div>

          {/* Top Issues List */}
          <div className="card" style={{ padding: 24 }}>
             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
               <h3 style={{ fontSize: 16, fontWeight: 800, color: '#1e293b', margin: 0 }}>🔥 Priority Backlog</h3>
               <button onClick={() => navigate('/admin/issues')} style={{ color: '#2563eb', fontSize: 12, fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                 VIEW ALL <ChevronRight size={14} />
               </button>
             </div>

             <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {loading ? [1,2,3].map(i => <div key={i} className="shimmer" style={{ height: 50 }} />) : 
                 topIssues.length === 0 ? <p style={{ textAlign: 'center', color: '#94a3b8', padding: '20px 0' }}>No issues found</p> :
                 topIssues.map(issue => (
                   <motion.div 
                    whileHover={{ x: 4, background: '#f8fafc' }}
                    onClick={() => navigate(`/admin/issues?id=${issue.report_id}`)}
                    key={issue.id} 
                    style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px', border: '1px solid #f1f5f9', borderRadius: 16, cursor: 'pointer' }}
                  >
                     <div style={{ width: 44, height: 44, background: '#f8fafc', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>
                        {CATEGORY_ICONS[issue.category] || '⚠️'}
                     </div>
                     <div style={{ flex: 1 }}>
                        <p style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', margin: '0 0 2px', textTransform: 'capitalize' }}>{issue.category}</p>
                        <p style={{ fontSize: 11, color: '#94a3b8', margin: 0, fontFamily: 'monospace' }}>{issue.report_id}</p>
                     </div>
                     <div style={{ textAlign: 'right' }}>
                        <p style={{ fontSize: 15, fontWeight: 800, color: '#ef4444', margin: 0 }}>P{issue.priority}</p>
                        <span style={{ fontSize: 10, fontWeight: 800, color: issue.status === 'Resolved' ? '#10b981' : '#f59e0b', textTransform: 'uppercase' }}>{issue.status}</span>
                     </div>
                   </motion.div>
                 ))
                }
             </div>
          </div>
        </div>

      </div>

      <AnimatePresence>
        {expandedChart && (
          <ChartModal 
            type={expandedChart.type} 
            data={expandedChart.data} 
            title={expandedChart.title} 
            onClose={() => setExpandedChart(null)} 
          />
        )}
      </AnimatePresence>

      <AdminBottomNav />
      <style>{`
        .card { background: #fff; border: 1px solid #e2e8f0; border-radius: 20px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.02); }
        .shimmer { animation: shimmer 1.5s infinite linear; background: linear-gradient(90deg, #f1f5f9 0%, #e2e8f0 50%, #f1f5f9 100%); background-size: 200% 100%; border-radius: 12px; }
        @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
      `}</style>
    </div>
  )
}
