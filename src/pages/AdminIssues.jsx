import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import { RefreshCw, X, CheckCircle, Upload, DollarSign, FileText, AlertTriangle, Filter, Search } from 'lucide-react'
import { supabase, fetchAllIssues, uploadImage, CATEGORY_ICONS, DEPARTMENTS, statusClass } from '../lib/supabase'
import { AdminNav } from './AdminDashboard'

const SEV_COLORS = ['', 'text-green-400', 'text-lime-400', 'text-amber-400', 'text-orange-400', 'text-red-400']
const SEV_LABELS = ['', 'Minor', 'Low', 'Moderate', 'High', 'Critical']

function ResolutionModal({ issue, onClose, onResolved }) {
  const [resImage, setResImage]   = useState(null)
  const [resFile, setResFile]     = useState(null)
  const [cost, setCost]           = useState('')
  const [notes, setNotes]         = useState('')
  const [status, setStatus]       = useState('In Progress')
  const [submitting, setSubmitting] = useState(false)

  async function handleSave() {
    setSubmitting(true)
    try {
      let resImgUrl = null
      if (resFile) resImgUrl = await uploadImage(resFile, 'resolution-images')

      const updates = {
        status,
        ...(status === 'Resolved' && {
          resolved_at: new Date().toISOString(),
          resolution_image_url: resImgUrl,
          resolution_cost: cost ? parseFloat(cost) : null,
          resolution_notes: notes || null,
        }),
      }
      const { error } = await supabase.from('issues').update(updates).eq('id', issue.id)
      if (error) throw error
      toast.success('Issue updated!')
      onResolved()
    } catch (e) {
      toast.error(e.message || 'Update failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-4"
    >
      <motion.div
        initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }}
        transition={{ type: 'spring', damping: 22 }}
        className="w-full max-w-md bg-dark-800 rounded-3xl border border-white/10 shadow-2xl overflow-hidden"
      >
        <div className="flex items-center justify-between p-5 border-b border-white/5">
          <div>
            <h3 className="font-bold text-white">Update Issue Status</h3>
            <p className="text-xs text-gray-400 font-mono mt-0.5">{issue.report_id}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10">
            <X size={16} />
          </button>
        </div>

        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Status selector */}
          <div>
            <label className="text-sm text-gray-400 mb-2 block">New Status</label>
            <div className="grid grid-cols-3 gap-2">
              {['Pending', 'In Progress', 'Resolved'].map(s => (
                <button
                  key={s}
                  onClick={() => setStatus(s)}
                  className={`py-2.5 px-2 rounded-xl text-xs font-semibold border transition-all text-center
                    ${status === s
                      ? s === 'Resolved' ? 'bg-green-500/20 border-green-500/50 text-green-400'
                        : s === 'In Progress' ? 'bg-blue-500/20 border-blue-500/50 text-blue-400'
                        : 'bg-amber-500/20 border-amber-500/50 text-amber-400'
                      : 'bg-dark-900 border-white/10 text-gray-400 hover:bg-white/5'}`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Resolution-only fields */}
          {status === 'Resolved' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              <div>
                <label className="text-sm text-gray-400 mb-2 block flex items-center gap-1"><DollarSign size={12} />Cost of Repair (₹)</label>
                <input
                  type="number"
                  value={cost}
                  onChange={e => setCost(e.target.value)}
                  placeholder="e.g. 15000"
                  className="input-field"
                />
              </div>

              <div>
                <label className="text-sm text-gray-400 mb-2 block flex items-center gap-1"><FileText size={12} />Resolution Notes</label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Describe what was done to resolve the issue..."
                  rows={3}
                  className="input-field resize-none"
                />
              </div>

              <div>
                <label className="text-sm text-gray-400 mb-2 block flex items-center gap-1"><Upload size={12} />Proof of Work (After Image)</label>
                {resImage ? (
                  <div className="relative">
                    <img src={resImage} alt="proof" className="w-full rounded-xl object-cover max-h-40" />
                    <button
                      onClick={() => { setResImage(null); setResFile(null) }}
                      className="absolute top-2 right-2 w-7 h-7 bg-black/60 rounded-full flex items-center justify-center text-xs"
                    >✕</button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center gap-2 p-6 rounded-xl border-2 border-dashed border-white/20 hover:border-civic-500/50 cursor-pointer transition-colors">
                    <Upload size={20} className="text-gray-500" />
                    <span className="text-sm text-gray-500">Upload after-fix image</span>
                    <input type="file" accept="image/*" className="hidden"
                      onChange={e => {
                        const f = e.target.files?.[0]
                        if (f) { setResFile(f); setResImage(URL.createObjectURL(f)) }
                      }}
                    />
                  </label>
                )}
              </div>
            </motion.div>
          )}
        </div>

        <div className="p-5 border-t border-white/5 flex gap-3">
          <button onClick={onClose} className="btn-secondary flex-1 text-sm">Cancel</button>
          <button onClick={handleSave} disabled={submitting} className="btn-primary flex-1 text-sm flex items-center justify-center gap-2">
            {submitting ? <RefreshCw size={14} className="animate-spin" /> : <CheckCircle size={14} />}
            {submitting ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

export default function AdminIssues() {
  const [issues, setIssues]       = useState([])
  const [loading, setLoading]     = useState(true)
  const [selected, setSelected]   = useState(null)
  const [searchQ, setSearchQ]     = useState('')
  const [filterStatus, setFilterStatus]   = useState('')
  const [filterCat, setFilterCat]         = useState('')
  const [filterDept, setFilterDept]       = useState('')
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try { setIssues(await fetchAllIssues()) }
    catch (e) { toast.error('Failed to load') }
    finally { setLoading(false) }
  }

  const filtered = issues.filter(i => {
    const q = searchQ.toLowerCase()
    const matchQ = !q || i.report_id?.toLowerCase().includes(q) || i.category?.includes(q) || i.address?.toLowerCase().includes(q)
    const matchStatus = !filterStatus || i.status === filterStatus
    const matchCat    = !filterCat    || i.category === filterCat
    const matchDept   = !filterDept   || i.department === filterDept
    return matchQ && matchStatus && matchCat && matchDept
  })

  const uniqueDepts = [...new Set(issues.map(i => i.department))]

  return (
    <div className="min-h-screen bg-dark-900">
      <AdminNav active="/admin/issues" />

      <div className="max-w-4xl mx-auto px-4 py-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="font-display font-bold text-xl text-white">All Issues</h1>
            <p className="text-gray-500 text-sm">{filtered.length} of {issues.length} records</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowFilters(v => !v)} className="btn-secondary py-2 px-3 text-sm flex items-center gap-1.5">
              <Filter size={14} /> Filters
            </button>
            <button onClick={load} className="btn-secondary py-2 px-3">
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            value={searchQ}
            onChange={e => setSearchQ(e.target.value)}
            placeholder="Search by Report ID, category, location..."
            className="input-field pl-10"
          />
        </div>

        {/* Filters */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="grid grid-cols-3 gap-2 mb-3">
                {[
                  { label: 'Status', val: filterStatus, set: setFilterStatus, opts: ['Pending', 'In Progress', 'Resolved'] },
                  { label: 'Category', val: filterCat, set: setFilterCat, opts: ['pothole','garbage','drainage','pipeline','streetlight','other'] },
                  { label: 'Department', val: filterDept, set: setFilterDept, opts: uniqueDepts },
                ].map(({ label, val, set, opts }) => (
                  <select key={label} value={val} onChange={e => set(e.target.value)} className="input-field text-sm py-2 text-gray-300">
                    <option value="">All {label}s</option>
                    {opts.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Issue list */}
        {loading ? (
          <div className="space-y-3">
            {[1,2,3,4,5].map(i => <div key={i} className="h-28 shimmer rounded-2xl" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <p className="text-4xl mb-3">📭</p>
            <p>No issues found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(issue => (
              <motion.div
                key={issue.id}
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                className="card overflow-hidden"
              >
                <div className="flex gap-3">
                  {issue.image_url ? (
                    <img src={issue.image_url} alt="" className="w-20 h-20 object-cover rounded-xl flex-shrink-0" />
                  ) : (
                    <div className="w-20 h-20 bg-dark-900 rounded-xl flex items-center justify-center text-3xl flex-shrink-0">
                      {CATEGORY_ICONS[issue.category] || '⚠️'}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="font-semibold text-white capitalize">{issue.category}</span>
                        {issue.is_high_risk && <AlertTriangle size={12} className="inline ml-1 text-red-400" />}
                      </div>
                      <span className={statusClass(issue.status)}>{issue.status}</span>
                    </div>
                    <p className="text-xs text-civic-400 font-mono mb-1">{issue.report_id}</p>
                    <div className="flex gap-3 text-xs">
                      <span className={SEV_COLORS[issue.severity]}>Sev {issue.severity}/5</span>
                      <span className="text-amber-400">P:{issue.priority}</span>
                      <span className="text-gray-500 truncate">{issue.department?.split(' ')[0]}</span>
                    </div>
                    {issue.address && <p className="text-xs text-gray-600 truncate mt-0.5">{issue.address}</p>}
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-white/5 flex justify-between items-center">
                  <span className="text-xs text-gray-500">{new Date(issue.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                  <button
                    onClick={() => setSelected(issue)}
                    className="text-xs btn-secondary py-1.5 px-3"
                  >
                    Update Status
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <AnimatePresence>
        {selected && (
          <ResolutionModal
            issue={selected}
            onClose={() => setSelected(null)}
            onResolved={() => { setSelected(null); load() }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
