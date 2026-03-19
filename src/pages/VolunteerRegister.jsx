import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import { 
  User, Phone, Lock, Mail, ShieldCheck, 
  ChevronRight, ArrowLeft, KeySquare, 
  CheckCircle2, RefreshCw
} from 'lucide-react'
import { supabase, registerVolunteer } from '../lib/supabase'

export default function VolunteerRegister() {
  const [step, setStep] = useState(1) // 1: Info, 2: OTP
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: ''
  })
  const [otp, setOtp] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleNextStep = async (e) => {
    e.preventDefault()
    if (formData.password !== formData.confirmPassword) {
      return toast.error("Passwords do not match")
    }
    if (formData.phone.length < 10) {
       return toast.error("Invalid mobile number")
    }

    setLoading(true)
    // Simulate sending OTP
    setTimeout(() => {
      setLoading(false)
      setStep(2)
      toast.success(`Verification code sent to ${formData.email || formData.phone}`)
    }, 1500)
  }

  const handleVerify = async (e) => {
    e.preventDefault()
    if (otp !== '123456') {
      return toast.error("Invalid OTP. Protocol verification failed.")
    }

    setLoading(true)
    try {
      const { confirmPassword, ...registerData } = formData
      const user = await registerVolunteer(registerData)
      toast.success("Welcome aboard, Executive Volunteer!")
      sessionStorage.setItem('volunteer_auth', JSON.stringify(user))
      setTimeout(() => navigate('/volunteer'), 1000)
    } catch (err) {
      toast.error(err.message || "Registration failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 py-12">
      {/* Background Orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[20%] left-[10%] w-[30%] h-[30%] bg-blue-500/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-[20%] right-[10%] w-[30%] h-[30%] bg-indigo-500/5 rounded-full blur-3xl animate-pulse" />
      </div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md bg-white border border-slate-200 rounded-[48px] p-8 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.05)] relative overflow-hidden z-10"
      >
        {/* Progress Decoration */}
        <div className={`absolute top-0 left-0 h-1.5 bg-indigo-600 transition-all duration-1000 ${step === 1 ? 'w-1/2' : 'w-full'}`} />

        <Link to="/volunteer/login" className="flex items-center gap-2 text-slate-400 hover:text-indigo-600 transition-colors text-[10px] font-black uppercase tracking-[0.2em] mb-8 group">
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> Return to Base
        </Link>

        <div className="mb-10 text-center">
          <div className="w-20 h-20 bg-indigo-50 rounded-3xl flex items-center justify-center mb-6 mx-auto border border-indigo-100">
            {step === 1 ? <ShieldCheck size={40} className="text-indigo-600" /> : <KeySquare size={40} className="text-indigo-600" />}
          </div>
          <h1 className="text-3xl font-display font-extrabold text-slate-900 mb-2">Resource Entry</h1>
          <p className="text-slate-500 text-sm font-medium tracking-tight">
            {step === 1 ? "Initialize your executive volunteer credentials." : "Enter the 6-digit code for identity verification."}
          </p>
        </div>

        <AnimatePresence mode="wait">
          {step === 1 ? (
            <motion.form 
              key="info"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              onSubmit={handleNextStep} 
              className="space-y-4"
            >
              <div className="space-y-4">
                <div className="relative group">
                  <User size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                  <input 
                    type="text" name="name" placeholder="Operational Name" required 
                    value={formData.name} onChange={handleChange}
                    className="w-full bg-slate-50/50 border border-slate-200 rounded-2xl py-4 pl-14 pr-5 text-slate-900 placeholder:text-slate-300 focus:bg-white focus:border-indigo-500/50 transition-all outline-none"
                  />
                </div>

                <div className="relative group">
                  <Mail size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                  <input 
                    type="email" name="email" placeholder="Verification Email" required 
                    value={formData.email} onChange={handleChange}
                    className="w-full bg-slate-50/50 border border-slate-200 rounded-2xl py-4 pl-14 pr-5 text-slate-900 placeholder:text-slate-300 focus:bg-white focus:border-indigo-500/50 transition-all outline-none"
                  />
                </div>

                <div className="relative group">
                  <Phone size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                  <input 
                    type="tel" name="phone" placeholder="Primary Mobile" required 
                    value={formData.phone} onChange={handleChange}
                    className="w-full bg-slate-50/50 border border-slate-200 rounded-2xl py-4 pl-14 pr-5 text-slate-900 placeholder:text-slate-300 focus:bg-white focus:border-indigo-500/50 transition-all outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <div className="relative group">
                    <Lock size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                    <input 
                      type="password" name="password" placeholder="Passcode (Min 6)" required 
                      value={formData.password} onChange={handleChange} minLength={6}
                      className="w-full bg-slate-50/50 border border-slate-200 rounded-2xl py-4 pl-14 pr-5 text-slate-900 placeholder:text-slate-300 focus:bg-white focus:border-indigo-500/50 transition-all outline-none"
                    />
                  </div>
                  <div className="relative group">
                    <Lock size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                    <input 
                      type="password" name="confirmPassword" placeholder="Confirm Passcode" required 
                      value={formData.confirmPassword} onChange={handleChange}
                      className="w-full bg-slate-50/50 border border-slate-200 rounded-2xl py-4 pl-14 pr-5 text-slate-900 placeholder:text-slate-300 focus:bg-white focus:border-indigo-500/50 transition-all outline-none"
                    />
                  </div>
                </div>
              </div>

              <button 
                type="submit" 
                disabled={loading}
                className="w-full h-15 bg-indigo-600 hover:bg-black text-white font-black uppercase tracking-[0.2em] rounded-2xl shadow-[0_15px_30px_-5px_rgba(79,70,229,0.3)] flex items-center justify-center gap-2 transition-all mt-6 disabled:opacity-50 group py-4"
              >
                {loading ? <RefreshCw className="animate-spin" /> : (
                  <>Begin Activation <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" /></>
                )}
              </button>
            </motion.form>
          ) : (
            <motion.form 
              key="otp"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              onSubmit={handleVerify} 
              className="space-y-6"
            >
              <div className="flex justify-center gap-3">
                 <input 
                    type="text" maxLength={6} placeholder="000000"
                    value={otp} onChange={(e) => setOtp(e.target.value)}
                    className="w-full tracking-[1em] text-center text-3xl font-black bg-slate-50 border border-slate-200 rounded-3xl py-6 text-indigo-600 placeholder:text-slate-200 focus:border-indigo-500 outline-none shadow-inner"
                    autoFocus
                 />
              </div>

              <div className="text-center">
                 <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] mb-2">Protocol: Simulated verification</p>
                 <button type="button" onClick={() => setStep(1)} className="text-indigo-600 text-xs font-bold hover:underline">Revise Application Info</button>
              </div>

              <button 
                type="submit" 
                disabled={loading || otp.length < 6}
                className="w-full h-15 bg-indigo-600 hover:bg-black text-white font-black uppercase tracking-[0.2em] rounded-2xl shadow-[0_15px_30px_-5px_rgba(79,70,229,0.3)] flex items-center justify-center gap-2 transition-all disabled:opacity-30 py-4"
              >
                {loading ? <RefreshCw className="animate-spin" /> : (
                  <>Verify Account <CheckCircle2 size={18} /></>
                )}
              </button>
            </motion.form>
          )}
        </AnimatePresence>

        <p className="text-center text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mt-10">
          Already part of the fleet? <Link to="/volunteer/login" className="text-indigo-600 hover:underline">Authenticate</Link>
        </p>
      </motion.div>
    </div>
  )
}
