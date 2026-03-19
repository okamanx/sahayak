import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useLocation } from 'react-router-dom'
import toast from 'react-hot-toast'
import { 
  RefreshCw, X, CheckCircle, Upload, DollarSign, FileText, 
  AlertTriangle, Filter, Search, Play, Trash2, MapPin, 
  Phone, Mail, Calendar, ShieldAlert, ChevronRight, Edit3, UserPlus
} from 'lucide-react'
import { supabase, fetchAllIssues, uploadImage, CATEGORY_ICONS, statusClass } from '../lib/supabase'
import AdminBottomNav from '../components/AdminBottomNav'

const SEV_COLORS = ['', 'text-green-400', 'text-lime-400', 'text-amber-400', 'text-orange-400', 'text-red-400']
const SEV_LABELS = ['', 'Minor', 'Low', 'Moderate', 'High', 'Critical']

function IssueDetailModal({ issue, onClose, onUpdate, onDelete }) {
  const [status, setStatus] = useState(issue.status)
  const [assigning, setAssigning] = useState(false)
  const [volunteers, setVolunteers] = useState([])
  const [loadingVolunteers, setLoadingVolunteers] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const isCritical = issue.severity === 5

  useEffect(() => {
    if (assigning) fetchVolunteers()
  }, [assigning])

  async function fetchVolunteers() {
    setLoadingVolunteers(true)
    try {
      const { data, error } = await supabase.from('workers').select('*')
      if (error) throw error
      setVolunteers(data || [])
    } finally {
      setLoadingVolunteers(false)
    }
  }

  async function handleAssign(volunteer) {
    setUpdating(true)
    try {
      const { error } = await supabase
        .from('issues')
        .update({ worker_phone: volunteer.phone, worker_name: volunteer.name, status: 'In Progress' })
        .eq('id', issue.id)
      if (error) throw error
      toast.success(`Assigned to ${volunteer.name}`)
      setAssigning(false)
      onUpdate()
    } catch (e) { toast.error('Assignment failed') }
    finally { setUpdating(false) }
  }

  async function handleStatusChange(newStatus) {
    setUpdating(true)
    try {
      const { error } = await supabase.from('issues').update({ status: newStatus }).eq('id', issue.id)
      if (error) throw error
      setStatus(newStatus)
      toast.success('Status updated')
      onUpdate()
    } catch (e) { toast.error('Update failed') }
    finally { setUpdating(false) }
  }

  async function handleDelete() {
    if (!window.confirm('Erase this record from registry?')) return
    setDeleting(true)
    try {
      const { error } = await supabase.from('issues').delete().eq('id', issue.id)
      if (error) throw error
      toast.success('Record deleted')
      onClose()
      onDelete()
    } catch (e) { toast.error('Delete failed') }
    finally { setDeleting(false) }
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-dark-950/60 backdrop-blur-sm">
      <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="bg-dark-900 border border-white/10 w-full max-w-2xl max-h-[90vh] rounded-[40px] shadow-2xl flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="p-6 border-b border-white/5 flex justify-between items-center bg-dark-800/50">
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-2xl ${isCritical ? 'bg-red-500' : 'bg-blue-600'} text-white shadow-xl`}>
              {CATEGORY_ICONS[issue.category] || '⚠️'}
            </div>
            <div>
              <h3 className="text-white font-bold text-lg capitalize">{issue.category}</h3>
              <p className="text-[10px] text-gray-500 font-mono tracking-tighter uppercase">{issue.report_id}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-gray-500 hover:text-white transition-colors bg-white/5 rounded-xl">
             <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
          {/* Main Visual/Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {issue.image_url && (
              <div className="relative group rounded-3xl overflow-hidden border border-white/10 shadow-lg h-64 md:h-auto">
                <img src={issue.image_url} alt="Evidence" className="w-full h-full object-cover transition-transform group-hover:scale-110 duration-700" />
                <div className="absolute top-4 left-4">
                   <span className="bg-black/50 backdrop-blur-md text-white text-[10px] px-3 py-1.5 rounded-full font-bold">FIELD EVIDENCE</span>
                </div>
              </div>
            )}
            
            <div className="space-y-6">
               <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Occurrence Context</label>
                  <p className="text-gray-300 text-sm leading-relaxed bg-white/2 p-4 rounded-2xl border border-white/5">{issue.description || 'No contextual data provided by reporter.'}</p>
               </div>

               <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white/2 p-3 rounded-2xl border border-white/5">
                    <label className="text-[10px] font-black uppercase text-gray-600 block mb-1">Impact Level</label>
                    <span className={`text-xs font-bold ${SEV_COLORS[issue.severity]}`}>{SEV_LABELS[issue.severity]} (Sev {issue.severity})</span>
                  </div>
                  <div className="bg-white/2 p-3 rounded-2xl border border-white/5">
                    <label className="text-[10px] font-black uppercase text-gray-600 block mb-1">Strategic Prio</label>
                    <span className="text-xs font-bold text-amber-500">Priority P{issue.priority}</span>
                  </div>
               </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Geo and Reporter Details */}
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <MapPin className="text-blue-500 mt-1" size={20} />
                <div>
                  <h4 className="text-white font-bold text-sm">Deployment Location</h4>
                  <p className="text-gray-500 text-xs mt-1 mb-3">{issue.address || 'Geo-coordinates restricted'}</p>
                  <a href={`https://www.google.com/maps?q=${issue.latitude},${issue.longitude}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-[10px] font-black text-blue-500 uppercase hover:underline">
                    Visualise on Map <ChevronRight size={12} />
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 bg-white/2 rounded-3xl border border-white/5">
                <div className="w-10 h-10 bg-dark-800 rounded-xl flex items-center justify-center text-gray-400">
                  <ShieldAlert size={18} />
                </div>
                <div>
                  <h4 className="text-white font-bold text-sm">Reporter Identity</h4>
                  <p className="text-gray-500 text-xs mt-0.5">{issue.user_name || 'Anonymous citizen'}</p>
                  <p className="text-gray-600 text-[10px] font-mono mt-1">{issue.user_phone || 'Contact masked'}</p>
                </div>
              </div>
            </div>

            {/* Assignment Hub */}
            <div className="space-y-4">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Resource Assignment</label>
              <div className="relative">
                {issue.worker_phone ? (
                  <div className="flex items-center justify-between p-4 bg-blue-600/10 border border-blue-500/20 rounded-3xl group">
                    <div className="flex items-center gap-3">
                       <ShieldCheck className="text-blue-500" />
                       <div>
                         <p className="text-white font-bold text-sm">{issue.worker_name}</p>
                         <p className="text-[10px] text-gray-500">{issue.worker_phone}</p>
                       </div>
                    </div>
                    <button onClick={() => setAssigning(true)} className="p-2 opacity-0 group-hover:opacity-100 transition-opacity"><Edit3 size={14} className="text-gray-400" /></button>
                  </div>
                ) : (
                  <button onClick={() => setAssigning(true)} className="w-full py-4 border-2 border-dashed border-white/10 rounded-3xl text-gray-500 font-bold hover:border-blue-500/50 hover:text-blue-500 transition-all">
                    Assign Executive Volunteer
                  </button>
                )}

                <AnimatePresence>
                  {assigning && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="absolute bottom-full mb-2 left-0 right-0 bg-dark-800 border border-white/10 rounded-3xl shadow-2xl p-4 z-10">
                      <div className="flex justify-between items-center mb-4">
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Select Available Resource</span>
                        <button onClick={() => setAssigning(false)} className="text-gray-500 hover:text-white"><X size={14} /></button>
                      </div>
                      <div className="max-h-40 overflow-y-auto space-y-2 custom-scrollbar pr-2">
                        {loadingVolunteers ? <RefreshCw className="animate-spin text-blue-500 mx-auto" /> : volunteers.length === 0 ? <p className="text-[10px] text-gray-600 text-center">No active volunteers</p> : (
                          volunteers.map(v => (
                            <button key={v.id} onClick={() => handleAssign(v)} className="w-full text-left p-2 rounded-xl hover:bg-white/5 transition-colors border border-transparent hover:border-white/5">
                              <p className="text-white font-bold text-[12px]">{v.name}</p>
                              <p className="text-[10px] text-gray-500">{v.location || 'Fleet Reserve'} • {v.phone}</p>
                            </button>
                          ))
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

          {/* Status Controls */}
          <div className="pt-6 border-t border-white/5 grid grid-cols-2 md:grid-cols-4 gap-3">
             {['Pending', 'In Progress', 'Resolved'].map(s => (
               <button key={s} onClick={() => handleStatusChange(s)} disabled={updating} className={`py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${status === s ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'bg-white/5 text-gray-500 hover:bg-white/10 border border-white/5'}`}>
                 {s}
               </button>
             ))}
             <button onClick={handleDelete} disabled={deleting} className="py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500 hover:text-white transition-all">
               Purge Record
             </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ── Main Page Component ─────────────────────────────────────────────
export default function AdminIssues() {
  const [issues, setIssues]       = useState([])
  const [loading, setLoading]     = useState(true)
  const [selected, setSelected]   = useState(null)
  const [searchQ, setSearchQ]     = useState('')
  const [filterStatus, setFilterStatus]   = useState('')
  const [filterCat, setFilterCat]         = useState('')
  const [filterDept, setFilterDept]       = useState('')
  const [showFilters, setShowFilters] = useState(false)
  
  const location = useLocation()

  useEffect(() => { 
    load().then(data => {
      // Handle query params for deep linking
      const params = new URLSearchParams(location.search)
      const s = params.get('status')
      const c = params.get('category')
      const r = params.get('risk')
      const id = params.get('id')

      if (s) setFilterStatus(s)
      if (c) setFilterCat(c)
      if (r === 'high') {
         // Custom logic for risk if needed, or just let users filter status/cat
      }
      
      if (id && data) {
        const found = data.find(i => i.report_id === id)
        if (found) setSelected(found)
      }
      
      if (s || c || r) setShowFilters(true)
    })
  }, [location.search])

  async function load() {
    setLoading(true)
    try { 
      const data = await fetchAllIssues()
      setIssues(data || [])
      return data
    }
    catch (e) { toast.error('Failed to load') }
    finally { setLoading(false) }
  }

  const filtered = issues.filter(i => {
    const q = searchQ.toLowerCase()
    const matchQ = !q || i.report_id?.toLowerCase().includes(q) || i.category?.includes(q) || i.address?.toLowerCase().includes(q)
    const matchStatus = !filterStatus || i.status === filterStatus
    const matchCat    = !filterCat    || i.category === filterCat
    const matchDept   = !filterDept   || i.department === filterDept
    
    // Risk filter special case
    const params = new URLSearchParams(location.search)
    const matchRisk = params.get('risk') === 'high' ? i.is_high_risk : true

    return matchQ && matchStatus && matchCat && matchDept && matchRisk
  })

  const uniqueDepts = [...new Set(issues.map(i => i.department))]

  return (
    <div className="min-h-screen bg-dark-950 pb-32">
      {/* Header */}
      <div className="admin-header fixed top-0 left-0 right-0 z-40 p-4 border-b border-white/5 bg-dark-950/80 backdrop-blur-xl flex items-center justify-between">
        <div>
          <h1 className="font-display font-bold text-xl text-white">Central Registry</h1>
          <p className="text-gray-500 text-[10px] font-bold tracking-tighter uppercase">{filtered.length} Reports Found</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowFilters(v => !v)} className={`w-10 h-10 flex items-center justify-center rounded-xl transition-colors ${showFilters ? 'bg-blue-500 text-white' : 'bg-white/5 text-gray-400'}`}>
            <Filter size={18} />
          </button>
          <button onClick={load} className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 text-gray-400">
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 pt-24">
        {/* Search */}
        <div className="relative mb-6">
          <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            value={searchQ}
            onChange={e => setSearchQ(e.target.value)}
            placeholder="Search Registry..."
            className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-gray-600 focus:border-blue-500/50 transition-colors shadow-2xl"
          />
        </div>

        {/* Filters */}
        <AnimatePresence>
          {showFilters && (
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="grid grid-cols-3 gap-2 mb-6">
              {[
                { label: 'Status', val: filterStatus, set: setFilterStatus, opts: ['Pending', 'In Progress', 'Resolved'] },
                { label: 'Category', val: filterCat, set: setFilterCat, opts: ['pothole','garbage','drainage','pipeline','streetlight','other'] },
                { label: 'Dept', val: filterDept, set: setFilterDept, opts: uniqueDepts },
              ].map(({ label, val, set, opts }) => (
                <div key={label} className="flex flex-col gap-1">
                  <select value={val} onChange={e => set(e.target.value)} className="bg-white/5 border border-white/10 rounded-xl py-2 px-3 text-xs text-white focus:outline-none">
                    <option value="">All {label}</option>
                    {opts.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Issue list */}
        {loading ? (
          <div className="space-y-4">
            {[1,2,3,4].map(i => <div key={i} className="h-40 shimmer rounded-3xl" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 bg-white/2 rounded-3xl border border-dashed border-white/10">
            <p className="text-6xl mb-6 grayscale opacity-30">📂</p>
            <p className="text-gray-500 font-bold uppercase tracking-widest text-xs">No Records Located</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map(issue => {
              const isCritical = issue.severity === 5
              return (
                <motion.div
                  key={issue.id}
                  layoutId={issue.id}
                  onClick={() => setSelected(issue)}
                  className={`card relative overflow-hidden group cursor-pointer transition-all duration-300 hover:scale-[1.01] hover:shadow-2xl active:scale-[0.99] border ${isCritical ? 'border-red-500/50 bg-red-500/5' : 'border-white/5 hover:border-blue-500/30'}`}
                >
                  {isCritical && <div className="absolute top-0 right-0 p-2"><AlertTriangle size={16} className="text-red-500 animate-pulse" /></div>}
                  
                  <div className="flex gap-4 p-4">
                    {issue.image_url ? (
                      <div className="relative flex-shrink-0">
                        <img src={issue.image_url} alt="" className="w-24 h-24 object-cover rounded-2xl shadow-lg" />
                        <div className={`absolute -top-2 -left-2 w-8 h-8 rounded-xl flex items-center justify-center text-lg shadow-xl ${isCritical ? 'bg-red-500' : 'bg-dark-900 border border-white/10'}`}>
                          {CATEGORY_ICONS[issue.category] || '⚠️'}
                        </div>
                      </div>
                    ) : (
                      <div className={`w-24 h-24 rounded-2xl flex items-center justify-center text-4xl flex-shrink-0 shadow-inner ${isCritical ? 'bg-red-500/20' : 'bg-dark-900 border border-white/5'}`}>
                        {CATEGORY_ICONS[issue.category] || '⚠️'}
                      </div>
                    )}

                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <h3 className={`font-bold text-lg capitalize truncate ${isCritical ? 'text-red-400' : 'text-white'}`}>{issue.category}</h3>
                          <span className={`${statusClass(issue.status)} text-[10px] py-0.5 px-2`}>{issue.status}</span>
                        </div>
                        <p className="text-[10px] text-gray-600 font-mono mb-2 tracking-tighter uppercase">{issue.report_id}</p>
                        
                        <div className="flex flex-wrap gap-2 text-[10px] font-black uppercase tracking-tight">
                          <span className={`px-2 py-0.5 rounded-md ${isCritical ? 'bg-red-500 text-white' : 'bg-white/5 text-gray-400 border border-white/10'}`}>
                            {isCritical ? 'CRITICAL SEV' : `SEV ${issue.severity}`}
                          </span>
                          <span className="bg-amber-500/20 text-amber-500 border border-amber-500/20 px-2 py-0.5 rounded-md">P{issue.priority}</span>
                          {issue.is_high_risk && !isCritical && <span className="bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded-md">Risk</span>}
                        </div>
                      </div>

                      <div className="flex items-center justify-between mt-3">
                        <div className="flex items-center gap-1.5 text-gray-500 text-[10px] font-medium truncate max-w-[150px]">
                          <MapPin size={10} /> {issue.address || 'Location Hidden'}
                        </div>
                        <div className="text-[10px] text-gray-600 font-bold flex items-center gap-1">
                          <Calendar size={10} /> {new Date(issue.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}
      </div>

      <AnimatePresence>
        {selected && (
          <IssueDetailModal
            issue={selected}
            onClose={() => setSelected(null)}
            onUpdate={() => { load() }}
            onDelete={() => { load() }}
          />
        )}
      </AnimatePresence>

      <AdminBottomNav />
    </div>
  )
}
