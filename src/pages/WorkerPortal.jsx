import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import { 
  LogOut, Image as ImageIcon, Camera, CheckCircle, 
  RefreshCw, User as UserIcon, List as ListIcon, 
  Save, Key, FileText, MapPin, Phone, UserCircle, 
  ChevronRight, ArrowRight, ShieldCheck, Map, 
  Bell, Check, X, Navigation, Calendar, Mail
} from 'lucide-react'
import { 
  fetchVolunteerIssues, resolveIssue, uploadImage, 
  updateVolunteerProfile, CATEGORY_ICONS, getDistance,
  statusClass
} from '../lib/supabase'

const SEV_COLORS = ['', 'text-emerald-500', 'text-lime-500', 'text-amber-500', 'text-orange-500', 'text-red-500']
const SEV_LABELS = ['', 'Minor', 'Low', 'Moderate', 'High', 'Critical']

export default function WorkerPortal() {
  const [volunteer, setVolunteer] = useState(null)
  const [activeTab, setActiveTab] = useState('tasks')
  const [issues, setIssues] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  // Profile States
  const [profileData, setProfileData] = useState({
    name: '',
    email: '',
    phone: '',
    alt_phone: '',
    from_origin: '',
    location: '',
    age: '',
    gender: '',
    password: ''
  })
  const [updatingProfile, setUpdatingProfile] = useState(false)

  // Issue Resolution States
  const [activeIssue, setActiveIssue] = useState(null)
  const [cost, setCost] = useState('')
  const [notes, setNotes] = useState('')
  const [file, setFile] = useState(null)
  const [resImagePreview, setResImagePreview] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [verifyingLocation, setVerifyingLocation] = useState(false)

  useEffect(() => {
    const v = sessionStorage.getItem('volunteer_auth')
    if (!v) {
      navigate('/volunteer/login')
      return
    }
    const parsed = JSON.parse(v)
    setVolunteer(parsed)
    setProfileData({
      ...parsed,
      password: '' // Don't show password
    })
    loadIssues(parsed.phone)
  }, [navigate])

  async function loadIssues(phone) {
    try {
      const data = await fetchVolunteerIssues(phone)
      setIssues(data || [])
    } catch (err) {
      toast.error('Failed to load operational tasks')
    } finally {
      setLoading(false)
    }
  }

  function handleImageSelect(e) {
    const selectedFile = e.target.files[0]
    if (selectedFile) {
      setFile(selectedFile)
      setResImagePreview(URL.createObjectURL(selectedFile))
    }
  }

  async function handleCompleteTask(issue) {
    if (!cost) return toast.error('Please enter the resolution cost')
    if (!file) return toast.error('Please upload verification evidence')
    
    setVerifyingLocation(true)
    const toastId = toast.loading('Verifying GPS Coordinates...')

    try {
      const pos = await new Promise((res, rej) => {
        navigator.geolocation.getCurrentPosition(res, rej, { enableHighAccuracy: true })
      })
      const { latitude: lat, longitude: lon } = pos.coords

      const dist = getDistance(lat, lon, issue.latitude, issue.longitude)
      
      if (dist > 150) {
        toast.error(`Geo-Verifying Failed: You are ${Math.round(dist)}m away from the target.`, { id: toastId })
        setVerifyingLocation(false)
        return
      }

      toast.loading('Uploading evidence & signaling success...', { id: toastId })
      setSubmitting(true)

      const imageUrl = await uploadImage(file, 'resolution-images')
      await resolveIssue(issue.id, parseFloat(cost), imageUrl, notes)

      toast.success('Mission Accomplished! Citizen has been notified.', { id: toastId, duration: 5000 })
      
      setActiveIssue(null); setCost(''); setNotes(''); setFile(null); setResImagePreview(null)
      loadIssues(volunteer.phone)
    } catch (err) {
      toast.error(err.message || 'Operational failure', { id: toastId })
    } finally {
      setSubmitting(false)
      setVerifyingLocation(false)
    }
  }

  async function handleProfileUpdate(e) {
    e.preventDefault()
    setUpdatingProfile(true)
    try {
      const updates = { ...profileData }
      if (!updates.password) delete updates.password
      
      const updated = await updateVolunteerProfile(volunteer.id, updates)
      setVolunteer(updated)
      sessionStorage.setItem('volunteer_auth', JSON.stringify(updated))
      toast.success("Executive profile synchronized")
    } catch (err) {
      toast.error(err.message)
    } finally {
      setUpdatingProfile(false)
    }
  }

  if (loading || !volunteer) return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4">
      <RefreshCw className="animate-spin text-indigo-600" size={32} />
      <p className="text-slate-400 text-xs font-black uppercase tracking-[0.2em]">Initialising Command Centre</p>
    </div>
  )

  const pendingIssues = issues.filter(i => i.status !== 'Resolved')
  const completedIssues = issues.filter(i => i.status === 'Resolved')

  return (
    <div className="min-h-screen bg-slate-50 pb-32">
      {/* Absolute Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-[40%] h-[40%] bg-indigo-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-[40%] h-[40%] bg-blue-500/5 rounded-full blur-3xl" />
      </div>

      {/* Premium Light Header */}
      <div className="bg-white/80 backdrop-blur-xl border-b border-slate-200 p-6 sticky top-0 z-40 shadow-sm">
        <div className="max-w-xl mx-auto flex justify-between items-start">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <ShieldCheck className="text-indigo-600" size={16} />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600">Executive Volunteer</span>
            </div>
            <h1 className="text-3xl font-display font-black text-slate-900 leading-tight">
              {activeTab === 'tasks' ? 'Operations' : 'Command Profile'}
            </h1>
          </div>
          <button onClick={() => { sessionStorage.clear(); navigate('/volunteer/login') }} className="w-11 h-11 rounded-2xl bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all shadow-sm border border-red-100">
            <LogOut size={20} />
          </button>
        </div>
      </div>

      <div className="max-w-xl mx-auto p-4 space-y-6 relative z-10">
        {activeTab === 'tasks' ? (
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="space-y-8 pt-4">
            {/* Stats Overview */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white border border-slate-200 p-6 rounded-[32px] shadow-[0_15px_30px_-10px_rgba(0,0,0,0.05)] relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform text-indigo-900 font-black text-6xl">L</div>
                <p className="text-[10px] font-black uppercase text-slate-400 mb-2 tracking-[0.2em]">Operational</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-4xl font-display font-black text-indigo-600">{pendingIssues.length}</p>
                  <span className="text-xs font-bold text-slate-400">Backlog</span>
                </div>
              </div>
              <div className="bg-white border border-slate-200 p-6 rounded-[32px] shadow-[0_15px_30px_-10px_rgba(0,0,0,0.05)] relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform text-emerald-900 font-black text-6xl">S</div>
                <p className="text-[10px] font-black uppercase text-slate-400 mb-2 tracking-[0.2em]">Resolved</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-4xl font-display font-black text-emerald-600">{completedIssues.length}</p>
                  <span className="text-xs font-bold text-slate-400">Total</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between px-2">
               <h2 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2">
                <Navigation size={14} className="text-indigo-500" /> Sector Assignments
              </h2>
              <span className="bg-indigo-50 text-indigo-600 text-[10px] font-black px-3 py-1 rounded-full border border-indigo-100 uppercase">Live Feed</span>
            </div>

            {pendingIssues.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-[40px] p-16 text-center space-y-6 shadow-sm">
                <div className="w-24 h-24 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto border border-emerald-100 shadow-inner">
                  <Check size={48} strokeWidth={3} />
                </div>
                <div className="space-y-2">
                  <p className="text-xl font-display font-black text-slate-900">Sector Fully Secured</p>
                  <p className="text-slate-400 text-sm font-medium">All assigned resolution protocols are complete.</p>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {pendingIssues.map(issue => (
                  <motion.div key={issue.id} layout className="bg-white border border-slate-200 rounded-[40px] overflow-hidden shadow-[0_20px_40px_-15px_rgba(0,0,0,0.06)] hover:shadow-[0_25px_50px_-12px_rgba(0,0,0,0.08)] transition-all">
                    <div className="p-8">
                      <div className="flex justify-between items-start mb-6">
                        <div className="flex items-center gap-4">
                          <div className="w-14 h-14 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center text-3xl shadow-sm">
                            {CATEGORY_ICONS[issue.category] || '⚠️'}
                          </div>
                          <div>
                            <p className="text-[10px] font-black text-slate-400 flex items-center gap-1.5 uppercase tracking-widest mb-1">
                              <Bell size={12} className="text-indigo-500" /> {issue.report_id}
                            </p>
                            <h3 className="text-slate-900 font-extrabold text-xl capitalize">{issue.category}</h3>
                          </div>
                        </div>
                        <div className={`text-[10px] font-black px-4 py-1.5 rounded-full border ${SEV_COLORS[issue.severity]} bg-slate-50 border-slate-100 uppercase tracking-widest`}>
                          {SEV_LABELS[issue.severity]}
                        </div>
                      </div>

                      <div className="space-y-4 mb-8">
                        <div className="flex gap-4 text-sm text-slate-600 bg-slate-50/50 p-4 rounded-2xl border border-slate-100 shadow-inner group">
                          <MapPin size={20} className="text-indigo-500 shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                          <p className="font-medium leading-relaxed">{issue.address || 'Geo-coordinates restricted'}</p>
                        </div>
                        {issue.description && (
                          <div className="flex gap-4 text-sm text-slate-500 px-4">
                            <FileText size={20} className="shrink-0 opacity-50" />
                            <p className="italic leading-relaxed">"{issue.description}"</p>
                          </div>
                        )}
                      </div>

                      {issue.image_url && (
                        <div className="relative rounded-3xl overflow-hidden mb-8 border border-slate-100 shadow-md">
                          <img src={issue.image_url} alt="Site" className="w-full h-52 object-cover transition-transform hover:scale-105 duration-700" />
                          <div className="absolute top-4 left-4 bg-white/70 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-black text-slate-900 border border-white/50 shadow-lg">VIEW SITE EVIDENCE</div>
                        </div>
                      )}

                      <button 
                        onClick={() => setActiveIssue(activeIssue?.id === issue.id ? null : issue)}
                        className={`w-full py-4 rounded-2xl font-black uppercase tracking-[0.2em] flex items-center justify-center gap-3 transition-all ${activeIssue?.id === issue.id ? 'bg-slate-100 text-slate-400' : 'bg-indigo-600 text-white shadow-[0_15px_30px_-5px_rgba(79,70,229,0.3)] hover:bg-black active:scale-[0.98]'}`}
                      >
                        {activeIssue?.id === issue.id ? (
                          <>Abort Resolution <X size={18} /></>
                        ) : (
                          <>Resolve On-Site <ChevronRight size={18} /></>
                        )}
                      </button>

                      <AnimatePresence>
                        {activeIssue?.id === issue.id && (
                          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                            <div className="pt-8 mt-8 border-t border-slate-100 space-y-8">
                              <div className="flex items-center gap-2 mb-2">
                                <Key size={14} className="text-indigo-500" />
                                <h4 className="text-xs font-black uppercase tracking-[0.2em] text-indigo-600">Resolution Console</h4>
                              </div>
                              
                              <div className="space-y-4">
                                <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-2">Digital Verification Evidence</label>
                                <div className="grid grid-cols-2 gap-4">
                                  <label className="bg-slate-50 border border-slate-200 p-6 rounded-3xl flex flex-col items-center gap-3 cursor-pointer hover:bg-indigo-50 hover:border-indigo-200 transition-all group shadow-sm">
                                    <Camera size={32} className="text-slate-400 group-hover:text-indigo-600 transition-colors" />
                                    <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Capture</span>
                                    <input type="file" accept="image/*" capture="environment" hidden onChange={handleImageSelect} />
                                  </label>
                                  <label className="bg-slate-50 border border-slate-200 p-6 rounded-3xl flex flex-col items-center gap-3 cursor-pointer hover:bg-indigo-50 hover:border-indigo-200 transition-all group shadow-sm">
                                    <ImageIcon size={32} className="text-slate-400 group-hover:text-indigo-600 transition-colors" />
                                    <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Storage</span>
                                    <input type="file" accept="image/*" hidden onChange={handleImageSelect} />
                                  </label>
                                </div>
                                {resImagePreview && <motion.img initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} src={resImagePreview} className="w-full h-60 object-cover rounded-[32px] border-4 border-white shadow-2xl" />}
                              </div>

                              <div className="space-y-6">
                                <div className="space-y-2">
                                  <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-2">Financial Accounting (₹)</label>
                                  <input 
                                    type="number" value={cost} onChange={e => setCost(e.target.value)} 
                                    placeholder="Enter total resolution cost" 
                                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 px-6 text-slate-900 placeholder:text-slate-300 outline-none focus:bg-white focus:border-indigo-500/50 transition-all font-mono font-bold" 
                                  />
                                </div>
                                <div className="space-y-2">
                                  <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-2">Executive Summary Notes</label>
                                  <textarea 
                                    value={notes} onChange={e => setNotes(e.target.value)} 
                                    placeholder="Briefly describe the operational fix..." 
                                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 px-6 text-slate-900 placeholder:text-slate-300 outline-none focus:bg-white focus:border-indigo-500/50 transition-all shrink-0 min-h-[120px] font-medium" 
                                  />
                                </div>
                              </div>

                              <button 
                                onClick={() => handleCompleteTask(issue)}
                                disabled={submitting || verifyingLocation}
                                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase tracking-[0.2em] py-5 rounded-3xl shadow-[0_20px_40px_-10px_rgba(5,150,105,0.3)] flex items-center justify-center gap-3 transition-all disabled:opacity-50"
                              >
                                {submitting || verifyingLocation ? <RefreshCw className="animate-spin" size={20} /> : <CheckCircle2 size={20} />}
                                {verifyingLocation ? 'Securing Geo-Verification...' : submitting ? 'Synchronizing Registry...' : 'Authorize Resolution'}
                              </button>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        ) : (
          /* Profile Section - Premium Light */
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-8 pt-4">
            <div className="bg-white border border-slate-200 rounded-[48px] p-8 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.05)]">
              <div className="flex flex-col items-center text-center mb-10 pb-8 border-b border-slate-100">
                <div className="relative group mb-4">
                  <div className="w-32 h-32 bg-indigo-50 rounded-[40px] flex items-center justify-center text-indigo-600 border border-indigo-100 shadow-inner group-hover:rotate-6 transition-transform duration-500 overflow-hidden">
                    <UserCircle size={80} strokeWidth={1} />
                  </div>
                  <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center text-white border-4 border-white shadow-xl group-hover:scale-110 transition-transform">
                     <Camera size={16} />
                  </div>
                </div>
                <h2 className="text-3xl font-display font-black text-slate-900 leading-tight">{volunteer.name}</h2>
                <div className="flex items-center gap-2 mt-2">
                   <span className="bg-indigo-50 text-indigo-600 text-[10px] font-black px-4 py-1 rounded-full uppercase tracking-widest border border-indigo-100 cursor-default">EXECUTIVE RESOURCE</span>
                   <span className="text-slate-300 text-[10px] font-mono italic">#{volunteer.id.slice(0,8)}</span>
                </div>
              </div>

              <form onSubmit={handleProfileUpdate} className="grid grid-cols-1 gap-6">
                <div className="space-y-2 px-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Display Identity</label>
                  <div className="relative group">
                    <UserIcon size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                    <input type="text" value={profileData.name} onChange={e => setProfileData({...profileData, name: e.target.value})} className="w-full bg-slate-50/50 border border-slate-200 rounded-2xl py-4 pl-14 pr-5 text-slate-900 focus:bg-white focus:border-indigo-500/50 transition-all outline-none font-bold" />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2 px-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Operational Email</label>
                    <div className="relative group">
                       <Mail size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                       <input type="email" value={profileData.email} onChange={e => setProfileData({...profileData, email: e.target.value})} className="w-full bg-slate-50/50 border border-slate-200 rounded-2xl py-4 pl-14 pr-5 text-slate-900 focus:bg-white focus:border-indigo-500/50 transition-all outline-none font-bold" />
                    </div>
                  </div>
                  <div className="space-y-2 px-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Primary Contact</label>
                    <div className="relative group grayscale opacity-60">
                       <Phone size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" />
                       <input type="tel" value={profileData.phone} readOnly className="w-full bg-slate-100 border border-slate-200 rounded-2xl py-4 pl-14 pr-5 text-slate-500 cursor-not-allowed font-mono font-bold" />
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2 px-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Secondary Link (Optional)</label>
                    <div className="relative group">
                       <Phone size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                       <input type="tel" value={profileData.alt_phone} onChange={e => setProfileData({...profileData, alt_phone: e.target.value})} className="w-full bg-slate-50/50 border border-slate-200 rounded-2xl py-4 pl-14 pr-5 text-slate-900 focus:bg-white focus:border-indigo-500/50 transition-all outline-none font-bold" />
                    </div>
                  </div>
                  <div className="space-y-2 px-2">
                     <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Asset Age</label>
                     <div className="relative group">
                       <Calendar size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                       <input type="number" value={profileData.age} onChange={e => setProfileData({...profileData, age: e.target.value})} className="w-full bg-slate-50/50 border border-slate-200 rounded-2xl py-4 pl-14 pr-5 text-slate-900 focus:bg-white focus:border-indigo-500/50 transition-all outline-none font-bold" />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2 px-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Assigned Sector</label>
                    <div className="relative group">
                       <MapPin size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                       <input type="text" value={profileData.location} onChange={e => setProfileData({...profileData, location: e.target.value})} className="w-full bg-slate-50/50 border border-slate-200 rounded-2xl py-4 pl-14 pr-5 text-slate-900 focus:bg-white focus:border-indigo-500/50 transition-all outline-none font-bold" />
                    </div>
                  </div>
                  <div className="space-y-2 px-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Home Origin</label>
                    <div className="relative group">
                       <Map size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                       <input type="text" value={profileData.from_origin} onChange={e => setProfileData({...profileData, from_origin: e.target.value})} className="w-full bg-slate-50/50 border border-slate-200 rounded-2xl py-4 pl-14 pr-5 text-slate-900 focus:bg-white focus:border-indigo-500/50 transition-all outline-none font-bold" />
                    </div>
                  </div>
                </div>

                <div className="space-y-2 px-2 pt-4">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Security Passkey Change</label>
                  <div className="relative group">
                    <Lock size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                    <input type="password" value={profileData.password} onChange={e => setProfileData({...profileData, password: e.target.value})} placeholder="Leave blank to maintain current" className="w-full bg-slate-50/50 border border-slate-200 rounded-2xl py-4 pl-14 pr-5 text-slate-900 focus:bg-white focus:border-indigo-500/50 transition-all outline-none italic font-medium" />
                  </div>
                </div>

                <button type="submit" disabled={updatingProfile} className="w-full bg-indigo-600 hover:bg-black text-white font-black uppercase tracking-[0.2em] py-5 rounded-[24px] shadow-[0_20px_40px_-10px_rgba(79,70,229,0.3)] flex items-center justify-center gap-3 transition-all mt-6 active:scale-[0.98]">
                  {updatingProfile ? <RefreshCw className="animate-spin" size={20} /> : <Save size={20} />}
                  Store Operational Changes
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </div>

      {/* Premium Bottom Nav Dock */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 w-[320px] h-20 bg-white/70 backdrop-blur-2xl border border-white/20 rounded-[40px] flex items-center justify-around px-4 shadow-[0_20px_50px_-15px_rgba(0,0,0,0.1)] z-50 border-t border-indigo-50">
        <button 
          onClick={() => setActiveTab('tasks')}
          className={`flex flex-col items-center gap-1.5 transition-all w-1/2 group ${activeTab === 'tasks' ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
        >
          <div className={`p-2.5 rounded-2xl transition-all duration-500 ${activeTab === 'tasks' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'bg-transparent group-hover:bg-slate-50'}`}>
             <ListIcon size={24} strokeWidth={activeTab === 'tasks' ? 2.5 : 2} />
          </div>
          <span className="text-[9px] font-black uppercase tracking-[0.2em] transition-all">Operations</span>
        </button>
        
        <div className="w-[1px] h-8 bg-slate-100" />
        
        <button 
          onClick={() => setActiveTab('profile')}
          className={`flex flex-col items-center gap-1.5 transition-all w-1/2 group ${activeTab === 'profile' ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
        >
          <div className={`p-2.5 rounded-2xl transition-all duration-500 ${activeTab === 'profile' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'bg-transparent group-hover:bg-slate-50'}`}>
             <UserIcon size={24} strokeWidth={activeTab === 'profile' ? 2.5 : 2} />
          </div>
          <span className="text-[9px] font-black uppercase tracking-[0.2em] transition-all">Identity</span>
        </button>
      </div>

      {/* Floating Check-In Decoration */}
      <div className="fixed top-8 left-1/2 -translate-x-1/2 pointer-events-none z-0 opacity-10 blur-sm">
         <h3 className="text-[120px] font-display font-black text-slate-900 tracking-tighter mix-blend-multiply italic select-none">SAHAYAK</h3>
      </div>
    </div>
  )
}
