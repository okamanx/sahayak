import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { Shield, Eye, EyeOff, ArrowRight, UserPlus, Lock, Phone } from 'lucide-react'
import { loginVolunteer } from '../lib/supabase'

export default function WorkerLogin() {
  const [phone, setPhone]       = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw]     = useState(false)
  const [loading, setLoading]   = useState(false)
  const navigate = useNavigate()

  async function handleLogin(e) {
    e.preventDefault()
    setLoading(true)
    try {
      const vol = await loginVolunteer(phone, password)
      sessionStorage.setItem('volunteer_auth', JSON.stringify(vol))
      toast.success(`Welcome back, ${vol.name}!`)
      navigate('/volunteer')
    } catch (err) {
      toast.error('Invalid phone number or password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      {/* Absolute Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -right-[5%] w-[40%] h-[40%] bg-indigo-500/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-[10%] -left-[5%] w-[40%] h-[40%] bg-blue-500/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md relative z-10"
      >
        {/* Logo Section */}
        <div className="text-center mb-10">
          <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-[0_20px_40px_-15px_rgba(79,70,229,0.2)] border border-slate-100">
            <Shield size={40} className="text-indigo-600" />
          </div>
          <h1 className="text-4xl font-display font-extrabold text-slate-900 mb-2 tracking-tight">Volunteer Portal</h1>
          <p className="text-slate-500 font-medium">Sahayak Executive Command Centre</p>
        </div>

        {/* Card */}
        <div className="bg-white/70 backdrop-blur-xl border border-slate-200 p-8 rounded-[48px] shadow-[0_25px_50px_-12px_rgba(0,0,0,0.05)]">
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-2">Registered Phone</label>
              <div className="relative group">
                <Phone size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                <input
                  type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                  placeholder="+91 00000 00000" required 
                  className="w-full bg-slate-50/50 border border-slate-200 rounded-2xl py-4 pl-14 pr-5 text-slate-900 placeholder:text-slate-300 focus:bg-white focus:border-indigo-500/50 transition-all outline-none shadow-sm focus:shadow-indigo-500/5"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-2">Secret Passcode</label>
              <div className="relative group">
                <Lock size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                <input
                  type={showPw ? 'text' : 'password'} value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••" required 
                  className="w-full bg-slate-50/50 border border-slate-200 rounded-2xl py-4 pl-14 pr-14 text-slate-900 placeholder:text-slate-300 focus:bg-white focus:border-indigo-500/50 transition-all outline-none shadow-sm focus:shadow-indigo-500/5"
                />
                <button 
                  type="button" onClick={() => setShowPw(v => !v)}
                  className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600 transition-colors"
                >
                  {showPw ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <button 
              type="submit" 
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase tracking-widest py-4 rounded-2xl shadow-[0_15px_30px_-5px_rgba(79,70,229,0.3)] flex items-center justify-center gap-3 transition-all transform active:scale-[0.98] disabled:opacity-50 group mt-4"
              disabled={loading}
            >
              {loading ? 'Authenticating...' : (
                <>
                  <span>Portal Access</span>
                  <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          <div className="mt-10 pt-8 border-t border-slate-100 flex flex-col items-center gap-4">
             <p className="text-sm text-slate-400 font-medium">New to the mission?</p>
             <Link 
              to="/volunteer/register" 
              className="flex items-center gap-2 text-indigo-600 font-bold hover:text-indigo-700 transition-colors bg-indigo-50 px-6 py-2.5 rounded-xl border border-indigo-100/50"
             >
              <UserPlus size={18} /> Apply as Volunteer
             </Link>
          </div>
        </div>

        <p className="text-center mt-8 text-slate-400 text-[10px] uppercase tracking-[0.2em] font-black opacity-50">
          Authorized Personnel Only • Network Logged
        </p>
      </motion.div>
    </div>
  )
}
