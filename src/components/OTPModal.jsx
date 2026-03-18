import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, RefreshCw, CheckCircle, Mail, Phone, Info } from 'lucide-react'
import { sendOTP, verifyOTP, normalizePhone } from '../lib/otp'
import toast from 'react-hot-toast'

export default function OTPModal({ isOpen, onClose, contact, contactType = 'email', onVerified }) {
  const [otp, setOtp]             = useState(['', '', '', '', '', ''])
  const [sending, setSending]     = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [sent, setSent]           = useState(false)
  const [countdown, setCountdown] = useState(0)
  const [isDemo, setIsDemo]       = useState(false)
  const refs = useRef([])

  const isPhone = contactType === 'phone'
  const displayContact = isPhone && contact ? normalizePhone(contact) : contact

  useEffect(() => {
    if (isOpen && contact) { setOtp(['','','','','','']); setSent(false); setIsDemo(false); doSend() }
  }, [isOpen, contact])

  useEffect(() => {
    if (countdown <= 0) return
    const t = setTimeout(() => setCountdown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [countdown])

  async function doSend() {
    if (!contact) return
    setSending(true)
    try {
      const result = await sendOTP(contact, contactType)
      setSent(true); setCountdown(60)
      if (result.demo) {
        setIsDemo(true)
        // Auto-fill boxes
        setOtp(result.code.split(''))
        toast(`🔑 Demo OTP: ${result.code}`, {
          duration: 30000, icon: '🧪',
          style: { background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', fontWeight: 700, fontSize: 20, letterSpacing: '6px' },
        })
      } else {
        toast.success(isPhone ? `SMS sent to ${displayContact}` : `OTP sent to ${contact}`)
      }
    } catch (e) {
      toast.error(e.message || 'Failed to send OTP')
    } finally { setSending(false) }
  }

  async function doVerify() {
    const token = otp.join('')
    if (token.length < 6) { toast.error('Enter all 6 digits'); return }
    setVerifying(true)
    try {
      const user = await verifyOTP(contact, token, contactType)
      toast.success('Verified! ✅')
      onVerified(user)
    } catch (e) {
      toast.error(e.message)
      setOtp(['','','','','',''])
      refs.current[0]?.focus()
    } finally { setVerifying(false) }
  }

  function handleInput(i, val) {
    if (!/^\d*$/.test(val)) return
    const next = [...otp]; next[i] = val.slice(-1)
    setOtp(next)
    if (val && i < 5) refs.current[i + 1]?.focus()
    if (!val && i > 0) refs.current[i - 1]?.focus()
  }
  function handleKeyDown(i, e) {
    if (e.key === 'Backspace' && !otp[i] && i > 0) refs.current[i - 1]?.focus()
    if (e.key === 'Enter') doVerify()
  }
  function handlePaste(e) {
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (text) { setOtp(text.split('').concat(['','','','','','']).slice(0,6)); refs.current[Math.min(text.length-1,5)]?.focus() }
  }

  const headerBg = isDemo ? 'linear-gradient(135deg,#fefce8,#fef9c3)' : isPhone ? 'linear-gradient(135deg,#f0fdf4,#dcfce7)' : 'linear-gradient(135deg,#eff6ff,#eef2ff)'
  const iconBg   = isDemo ? '#fde68a' : isPhone ? '#bbf7d0' : '#dbeafe'
  const iconColor = isDemo ? '#a16207' : isPhone ? '#16a34a' : '#2563eb'

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={e => e.target === e.currentTarget && onClose()}
          style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(8px)', padding: 16 }}
        >
          <motion.div
            initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }}
            transition={{ type: 'spring', damping: 24 }}
            style={{ width: '100%', maxWidth: 420, background: 'var(--bg-card)', borderRadius: 24, overflow: 'hidden', boxShadow: '0 24px 64px rgba(0,0,0,0.2)' }}
          >
            {/* Header */}
            <div style={{ background: headerBg, padding: '18px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 38, height: 38, background: iconBg, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {isDemo ? <Info size={18} color={iconColor} /> : isPhone ? <Phone size={18} color={iconColor} /> : <Mail size={18} color={iconColor} />}
                </div>
                <div>
                  <p style={{ fontWeight: 700, color: 'var(--text-primary)', margin: 0, fontSize: 15 }}>
                    {isDemo ? '🧪 Demo OTP' : isPhone ? '📱 SMS Verification' : '📧 Email Verification'}
                  </p>
                  <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0 }}>
                    {isDemo
                      ? 'Demo mode — OTP shown in toast'
                      : isPhone
                        ? `Code sent via SMS to ${displayContact}`
                        : `Code sent to ${contact}`}
                  </p>
                </div>
              </div>
              <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(0,0,0,0.06)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <X size={15} color="#64748b" />
              </button>
            </div>

            <div style={{ padding: 20 }}>
              {isDemo && (
                <div style={{ background: '#fefce8', border: '1px solid #fde68a', borderRadius: 12, padding: '10px 14px', marginBottom: 14, display: 'flex', gap: 8 }}>
                  <span>💡</span>
                  <p style={{ fontSize: 12, color: '#a16207', margin: 0, lineHeight: 1.5 }}>
                    <strong>Demo mode:</strong> Configure Supabase in <code>.env</code> for real SMS/email OTPs. The code is shown in the toast above.
                  </p>
                </div>
              )}

              <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 14 }}>Enter the 6-digit verification code:</p>

              {/* OTP inputs */}
              <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 20 }}>
                {otp.map((digit, i) => (
                  <input
                    key={i} ref={el => refs.current[i] = el}
                    type="tel" inputMode="numeric" maxLength={1} value={digit}
                    onChange={e => handleInput(i, e.target.value)}
                    onKeyDown={e => handleKeyDown(i, e)}
                    onPaste={i === 0 ? handlePaste : undefined}
                    style={{
                      width: 44, height: 52, textAlign: 'center', fontSize: 22, fontWeight: 700, fontFamily: 'monospace',
                      background: digit ? (isPhone ? '#f0fdf4' : '#eff6ff') : 'var(--bg-input)',
                      border: `2px solid ${digit ? (isPhone ? '#22c55e' : '#2563eb') : 'var(--border)'}`,
                      borderRadius: 12, color: 'var(--text-primary)', outline: 'none', transition: 'all 0.15s',
                    }}
                  />
                ))}
              </div>

              <button onClick={doVerify} disabled={verifying || otp.join('').length < 6}
                className="btn-primary" style={{ marginBottom: 12, background: isPhone ? 'linear-gradient(135deg,#22c55e,#16a34a)' : undefined }}>
                {verifying
                  ? <><RefreshCw size={15} style={{ animation: 'spin 1s linear infinite' }} /> Verifying...</>
                  : <><CheckCircle size={15} /> Verify {isPhone ? 'Mobile' : 'Email'}</>}
              </button>

              <div style={{ textAlign: 'center' }}>
                {countdown > 0 ? (
                  <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Resend in {countdown}s</p>
                ) : (
                  <button onClick={doSend} disabled={sending}
                    style={{ background: 'none', border: 'none', color: isPhone ? '#16a34a' : '#2563eb', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                    {sending ? 'Sending...' : `↩ Resend ${isPhone ? 'SMS' : 'Email'}`}
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
