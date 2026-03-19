import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import { 
  LogOut, Image as ImageIcon, Camera, CheckCircle, 
  RefreshCw, User as UserIcon, List as ListIcon, 
  Save, Key, FileText 
} from 'lucide-react'
import { fetchWorkerIssues, resolveIssue, uploadImage, updateWorkerProfile, CATEGORY_ICONS } from '../lib/supabase'

const SEV_COLORS = ['', 'text-green-400', 'text-lime-400', 'text-amber-400', 'text-orange-400', 'text-red-400']
const SEV_LABELS = ['', 'Minor', 'Low', 'Moderate', 'High', 'Critical']

export default function WorkerPortal() {
  const [worker, setWorker] = useState(null)
  const [activeTab, setActiveTab] = useState('tasks')
  const [issues, setIssues] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  // Edit Profile States
  const [editName, setEditName] = useState('')
  const [editPassword, setEditPassword] = useState('')
  const [updatingProfile, setUpdatingProfile] = useState(false)

  // Issue Resolution States
  const [activeIssue, setActiveIssue] = useState(null)
  const [cost, setCost] = useState('')
  const [notes, setNotes] = useState('')
  const [file, setFile] = useState(null)
  const [resImagePreview, setResImagePreview] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    let w = sessionStorage.getItem('worker_auth')
    if (!w) {
      w = sessionStorage.getItem('sahayak_worker') // Support old key
    }
    if (!w) {
      navigate('/worker/login')
      return
    }
    const parsedWorker = JSON.parse(w)
    setWorker(parsedWorker)
    setEditName(parsedWorker.name)
    loadIssues(parsedWorker.phone)
  }, [navigate])

  async function loadIssues(phone) {
    try {
      const data = await fetchWorkerIssues(phone)
      setIssues(data || [])
    } catch (err) {
      toast.error('Failed to load tasks')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  function handleImageSelect(e) {
    const selectedFile = e.target.files[0]
    if (selectedFile) {
      setFile(selectedFile)
      setResImagePreview(URL.createObjectURL(selectedFile))
    } else {
      setFile(null)
      setResImagePreview(null)
    }
  }

  async function submitResolution(issueId) {
    if (!cost) return toast.error('Please enter the repair cost')
    if (!file) return toast.error('Please upload a photo of the completed work')
    
    setSubmitting(true)
    try {
      const imageUrl = await uploadImage(file, 'resolution-images')
      await resolveIssue(issueId, parseFloat(cost), imageUrl, notes)
      toast.success('Issue marked as resolved!')
      setActiveIssue(null)
      setCost('')
      setNotes('')
      setFile(null)
      setResImagePreview(null)
      loadIssues(worker.phone)
    } catch (err) {
      toast.error(err.message || 'Failed to resolve issue')
      console.error(err)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleProfileUpdate(e) {
    if (e) e.preventDefault()
    setUpdatingProfile(true)
    try {
      if (!editName.trim()) throw new Error("Name cannot be empty")
      const updates = { name: editName }
      if (editPassword) updates.password = editPassword
      
      const updatedUser = await updateWorkerProfile(worker.id, updates)
      
      setWorker(updatedUser)
      sessionStorage.setItem('worker_auth', JSON.stringify(updatedUser))
      setEditPassword('')
      toast.success("Profile updated successfully!")
    } catch (err) {
      toast.error(err.message || "Failed to update profile")
    } finally {
      setUpdatingProfile(false)
    }
  }

  function handleLogout() {
    sessionStorage.removeItem('worker_auth')
    sessionStorage.removeItem('sahayak_worker')
    navigate('/worker/login')
  }

  if (loading || !worker) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-page)' }}>
        <RefreshCw className="spin" size={32} color="#2563eb" />
        <style>{`.spin { animation: spin 1s linear infinite; } @keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  const pendingIssues = issues.filter(i => i.status !== 'Resolved')
  const completedIssues = issues.filter(i => i.status === 'Resolved')

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-page)', paddingBottom: 80 }}>
      {/* Header */}
      <div style={{ background: '#0f172a', padding: '24px 20px', borderBottom: '1px solid #1e293b', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontFamily: 'Outfit,sans-serif', fontWeight: 800, fontSize: 22, color: '#fff', margin: '0 0 4px' }}>
            {activeTab === 'tasks' ? 'Worker Tasks' : 'Your Profile'}
          </h1>
          <p style={{ fontSize: 13, color: '#94a3b8', margin: 0 }}>
            {activeTab === 'tasks' ? `Hello, ${worker.name}` : 'Manage your personal details'}
          </p>
        </div>
      </div>

      <div className="page-container" style={{ marginTop: 24 }}>
        {activeTab === 'tasks' && (
          <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
              <div className="card" style={{ padding: 16, background: 'linear-gradient(135deg, #1e3a8a, #1e40af)', borderColor: '#1d4ed8', color: '#fff' }}>
                <p style={{ fontSize: 13, color: '#bfdbfe', margin: '0 0 4px' }}>Pending Tasks</p>
                <h3 style={{ fontSize: 28, fontWeight: 800, margin: 0 }}>{pendingIssues.length}</h3>
              </div>
              <div className="card" style={{ padding: 16, background: 'linear-gradient(135deg, #166534, #15803d)', borderColor: '#16a34a', color: '#fff' }}>
                <p style={{ fontSize: 13, color: '#bbf7d0', margin: '0 0 4px' }}>Resolved</p>
                <h3 style={{ fontSize: 28, fontWeight: 800, margin: 0 }}>{completedIssues.length}</h3>
              </div>
            </div>

            <h2 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 16px', color: 'var(--text-primary)' }}>Assigned to You</h2>
            
            {pendingIssues.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', background: 'var(--bg-card)', borderRadius: 16, border: '1px solid var(--border)' }}>
                <CheckCircle size={48} color="#10b981" style={{ margin: '0 auto 16px', opacity: 0.5 }} />
                <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 8px', color: 'var(--text-primary)' }}>You're all caught up!</h3>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>There are no pending tasks assigned to you right now.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {pendingIssues.map(issue => (
                  <div key={issue.id} className="card" style={{ padding: 16, borderLeft: '4px solid #2563eb', borderRadius: 12 }}>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                      <div>
                        <span style={{ display: 'inline-block', padding: '4px 8px', background: '#f1f5f9', borderRadius: 4, fontSize: 11, fontWeight: 700, color: '#475569', marginBottom: 8, letterSpacing: '0.05em' }}>
                          REPORT ID: {issue.report_id}
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 20 }}>{CATEGORY_ICONS[issue.category] || '⚠️'}</span>
                          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, textTransform: 'capitalize', color: 'var(--text-primary)' }}>{issue.category}</h3>
                        </div>
                      </div>
                      <span className={SEV_COLORS[issue.severity] || 'text-gray-400'} style={{ fontSize: 12, fontWeight: 600 }}>
                        {SEV_LABELS[issue.severity] || 'Unknown'} (Sev: {issue.severity}/5)
                      </span>
                    </div>

                    <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 16px', lineHeight: 1.5 }}>
                      <FileText size={14} style={{ display: 'inline', marginRight: 4, verticalAlign: -2 }} />
                      {issue.description || 'No description provided.'}
                    </p>

                    {issue.image_url && (
                      <img src={issue.image_url} alt="Issue" style={{ width: '100%', height: 160, objectFit: 'cover', borderRadius: 8, marginBottom: 16, border: '1px solid var(--border)' }} />
                    )}

                    <button 
                      onClick={() => setActiveIssue(activeIssue?.id === issue.id ? null : issue)}
                      className="btn-primary" 
                      style={{ width: '100%', background: activeIssue?.id === issue.id ? 'var(--bg-card)' : '#2563eb', color: activeIssue?.id === issue.id ? 'var(--text-primary)' : '#fff', border: activeIssue?.id === issue.id ? '1px solid var(--border)' : 'none' }}
                    >
                      {activeIssue?.id === issue.id ? 'Close Resolution Panel' : 'Fix & Resolve Issue'}
                    </button>

                    <AnimatePresence>
                      {activeIssue?.id === issue.id && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} style={{ overflow: 'hidden' }}>
                          <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
                            <h4 style={{ fontSize: 14, fontWeight: 700, margin: '0 0 12px', color: 'var(--text-primary)' }}>Resolution Details</h4>
                            
                            <div style={{ marginBottom: 16 }}>
                              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6, display: 'block' }}>Proof of Work (Photo Update)</label>
                              <div style={{ display: 'flex', gap: 12 }}>
                                <label className="btn-secondary" style={{ flex: 1, cursor: 'pointer', display: 'flex', justifyContent: 'center', padding: '10px' }}>
                                  <Camera size={16} style={{ marginRight: 6 }} /> Take Photo
                                  <input type="file" accept="image/*" capture="environment" hidden onChange={handleImageSelect} />
                                </label>
                                <label className="btn-secondary" style={{ flex: 1, cursor: 'pointer', display: 'flex', justifyContent: 'center', padding: '10px' }}>
                                  <ImageIcon size={16} style={{ marginRight: 6 }} /> Gallery
                                  <input type="file" accept="image/*" hidden onChange={handleImageSelect} />
                                </label>
                              </div>
                              {resImagePreview && (
                                <img src={resImagePreview} alt="Proof" style={{ width: '100%', height: 140, objectFit: 'cover', borderRadius: 8, marginTop: 12 }} />
                              )}
                            </div>

                            <div style={{ marginBottom: 16 }}>
                              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6, display: 'block' }}>Repair Cost (₹)</label>
                              <input type="number" value={cost} onChange={e => setCost(e.target.value)} placeholder="0.00" className="input-field" />
                            </div>

                            <div style={{ marginBottom: 20 }}>
                              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6, display: 'block' }}>Notes (Optional)</label>
                              <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="What was fixed?" className="input-field" style={{ minHeight: 60, resize: 'none' }} />
                            </div>

                            <button onClick={() => submitResolution(issue.id)} disabled={submitting} className="btn-primary" style={{ width: '100%', background: '#16a34a' }}>
                              {submitting ? <RefreshCw className="spin" size={18} /> : <CheckCircle size={18} />}
                              {submitting ? 'Submitting...' : 'Mark as Resolved'}
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}>
            <div className="card" style={{ padding: 24, marginBottom: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24, paddingBottom: 24, borderBottom: '1px solid var(--border)' }}>
                <div style={{ width: 64, height: 64, background: '#2563eb', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                  <UserIcon size={32} />
                </div>
                <div>
                  <h2 style={{ fontSize: 20, fontWeight: 800, margin: '0 0 4px', color: 'var(--text-primary)' }}>{worker.name}</h2>
                  <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: 0, fontFamily: 'monospace' }}>+91 {worker.phone}</p>
                </div>
              </div>

              <form onSubmit={handleProfileUpdate}>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8, display: 'block' }}>Full Name</label>
                  <div style={{ position: 'relative' }}>
                    <UserIcon size={18} color="#94a3b8" style={{ position: 'absolute', left: 12, top: 12 }} />
                    <input 
                      type="text" 
                      value={editName} 
                      onChange={e => setEditName(e.target.value)} 
                      className="input-field" 
                      style={{ paddingLeft: 40 }}
                      placeholder="Your Name" 
                      required
                    />
                  </div>
                </div>

                <div style={{ marginBottom: 24 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8, display: 'block' }}>Change Password</label>
                  <div style={{ position: 'relative' }}>
                    <Key size={18} color="#94a3b8" style={{ position: 'absolute', left: 12, top: 12 }} />
                    <input 
                      type="password" 
                      value={editPassword} 
                      onChange={e => setEditPassword(e.target.value)} 
                      className="input-field" 
                      style={{ paddingLeft: 40 }}
                      placeholder="Leave blank to keep current" 
                    />
                  </div>
                </div>

                <button type="submit" disabled={updatingProfile} className="btn-primary" style={{ width: '100%' }}>
                  {updatingProfile ? <RefreshCw className="spin" size={18} /> : <Save size={18} />}
                  {updatingProfile ? 'Saving...' : 'Save Profile Changes'}
                </button>
              </form>
            </div>

            <button onClick={handleLogout} className="btn-secondary" style={{ width: '100%', color: '#dc2626', borderColor: '#fca5a5', background: '#fef2f2' }}>
              <LogOut size={18} /> Log Out from Portal
            </button>
          </motion.div>
        )}
      </div>

      {/* Worker Bottom Nav */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, height: 60, background: 'var(--bg-card)', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-around', alignItems: 'center', zIndex: 50 }}>
        <button 
          onClick={() => setActiveTab('tasks')}
          style={{ flex: 1, height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, background: 'none', border: 'none', color: activeTab === 'tasks' ? '#2563eb' : 'var(--text-secondary)' }}
        >
          <ListIcon size={20} />
          <span style={{ fontSize: 11, fontWeight: 600 }}>Tasks</span>
        </button>
        <button 
          onClick={() => setActiveTab('profile')}
          style={{ flex: 1, height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, background: 'none', border: 'none', color: activeTab === 'profile' ? '#2563eb' : 'var(--text-secondary)' }}
        >
          <UserIcon size={20} />
          <span style={{ fontSize: 11, fontWeight: 600 }}>Profile</span>
        </button>
      </div>

      <style>{`
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
