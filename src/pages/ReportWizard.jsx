import { useState, useCallback, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDropzone } from 'react-dropzone'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import {
  Upload, MapPin, CheckCircle, ArrowLeft, ArrowRight,
  RefreshCw, Navigation, Mail, Phone, Map, Satellite
} from 'lucide-react'
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet'
import L from 'leaflet'
import { supabase, generateReportId, uploadImage } from '../lib/supabase'
import { classifyImage } from '../lib/classifier'
import AIResultCard from '../components/AIResultCard'
import OTPModal from '../components/OTPModal'

// Fix leaflet default icon
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

// Custom GPS marker
function makeGpsIcon() {
  return L.divIcon({
    html: `<div style="
      width:22px;height:22px;border-radius:50%;
      background:#2563eb;border:3px solid white;
      box-shadow:0 0 0 4px rgba(37,99,235,0.35),0 3px 12px rgba(0,0,0,0.3);
    "></div>`,
    iconSize: [22, 22], iconAnchor: [11, 11], className: '',
  })
}

// ── FlyToLocation: flies the map to given coords ───────────────────
function FlyToLocation({ lat, lng }) {
  const map = useMap()
  useEffect(() => {
    if (lat && lng) {
      map.flyTo([lat, lng], 17, { animate: true, duration: 1.5 })
    }
  }, [lat, lng])
  return null
}

// ── MapClickHandler ────────────────────────────────────────────────
function MapClickHandler({ onLocationChange }) {
  useMapEvents({
    click: (e) => onLocationChange(e.latlng.lat, e.latlng.lng),
  })
  return null
}

const MB = import.meta.env.VITE_MAPBOX_TOKEN
const TILE_LAYERS = {
  satellite: {
    url: `https://api.mapbox.com/v4/mapbox.satellite/{z}/{x}/{y}@2x.jpg?access_token=${MB}`,
    attribution: '© <a href="https://www.mapbox.com">Mapbox</a> © <a href="https://www.openstreetmap.org">OSM</a>',
  },
  street: {
    url: `https://api.mapbox.com/styles/v1/mapbox/streets-v12/tiles/{z}/{x}/{y}?access_token=${MB}`,
    attribution: '© <a href="https://www.mapbox.com">Mapbox</a>',
  },
}


// ── Location Picker component ──────────────────────────────────────
function LocationPicker({ onLocationChange, lat, lng, tileMode }) {
  const initialCenter = lat && lng ? [lat, lng] : [20.5937, 78.9629]
  const initialZoom   = lat && lng ? 16 : 5
  const tile = TILE_LAYERS[tileMode] || TILE_LAYERS.satellite

  return (
    <MapContainer
      center={initialCenter}
      zoom={initialZoom}
      style={{ height: 240, width: '100%' }}
      className="rounded-2xl"
    >
      <TileLayer url={tile.url} attribution={tile.attribution} />
      <MapClickHandler onLocationChange={onLocationChange} />
      <FlyToLocation lat={lat} lng={lng} />
      {lat && lng && (
        <Marker position={[lat, lng]} icon={makeGpsIcon()} />
      )}
    </MapContainer>
  )
}

const STEPS = ['Photo', 'AI Analysis', 'Location', 'Verify & Submit']

export default function ReportWizard() {
  const navigate = useNavigate()
  const [step, setStep]             = useState(0)
  const [image, setImage]           = useState(null)
  const [imageFile, setImageFile]   = useState(null)
  const [aiResult, setAiResult]     = useState(null)
  const [analyzing, setAnalyzing]   = useState(false)
  const [lat, setLat]               = useState(null)
  const [lng, setLng]               = useState(null)
  const [address, setAddress]       = useState('')
  const [gpsLoading, setGpsLoading] = useState(false)
  const [gpsError, setGpsError]     = useState(null)
  const [tileMode, setTileMode]     = useState('satellite')
  const [description, setDescription] = useState('')
  const [email, setEmail]           = useState('')
  const [phone, setPhone]           = useState('')
  const [otpOpen, setOtpOpen]       = useState(false)
  const [otpType, setOtpType]       = useState('phone')   // 'phone' | 'email'
  const [otpVerified, setOtpVerified] = useState(false)
  const [verifiedVia, setVerifiedVia] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [reportId, setReportId]     = useState(null)

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: useCallback(async (files) => {
      const file = files[0]; if (!file) return
      setImageFile(file); setImage(URL.createObjectURL(file)); setAiResult(null)
    }, []),
    accept: { 'image/*': [] }, maxSize: 15 * 1024 * 1024, maxFiles: 1,
  })

  async function handleAnalyze() {
    if (!imageFile) { toast.error('Please upload a photo first'); return }
    setAnalyzing(true)
    try {
      const result = await classifyImage(imageFile)
      setAiResult(result); setStep(1)
    } catch (e) {
      if (e.notCivic) {
        toast.error(`❌ ${e.message}`, { duration: 6000, style: { maxWidth: 340 } })
        setImage(null); setImageFile(null)
      } else {
        toast.error('AI analysis failed — please try again')
      }
    } finally { setAnalyzing(false) }
  }

  async function reverseGeocode(latitude, longitude) {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`,
        { headers: { 'Accept-Language': 'en' } }
      )
      const data = await res.json()
      return data.display_name?.split(',').slice(0, 4).join(', ') || `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`
    } catch {
      return `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`
    }
  }

  async function handleGPS() {
    setGpsError(null)
    if (!navigator.geolocation) {
      setGpsError('GPS not supported on this device')
      toast.error('GPS not supported on this device')
      return
    }
    setGpsLoading(true)
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude, accuracy } = pos.coords
        setLat(latitude); setLng(longitude)
        toast.success(`📍 Location found! (±${Math.round(accuracy)}m)`)
        const addr = await reverseGeocode(latitude, longitude)
        setAddress(addr)
        setGpsLoading(false)
      },
      (err) => {
        setGpsLoading(false)
        const msgs = {
          1: 'Permission denied. Please allow location access in your browser settings.',
          2: 'Position unavailable. Try again or tap the map.',
          3: 'GPS timed out. Try again.',
        }
        const msg = msgs[err.code] || 'GPS error. Please tap the map manually.'
        setGpsError(msg)
        toast.error(msg, { duration: 5000 })
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    )
  }

  async function handleMapClick(newLat, newLng) {
    setLat(newLat); setLng(newLng)
    const addr = await reverseGeocode(newLat, newLng)
    setAddress(addr)
  }

  async function handleSubmit() {
    if (!otpVerified) { toast.error('Please verify your email first'); return }
    setSubmitting(true)
    try {
      const imageUrl = imageFile ? await uploadImage(imageFile) : null
      const rid = generateReportId()
      const { error } = await supabase.from('issues').insert({
        report_id:    rid,
        category:     aiResult.category,
        severity:     aiResult.severity,
        priority:     aiResult.priority,
        department:   aiResult.department,
        is_high_risk: aiResult.isHighRisk,
        description:  description || aiResult.description,
        latitude: lat, longitude: lng, address,
        image_url:     imageUrl,
        contact_email: email,
        contact_phone: phone,
        status: 'Pending',
      })
      if (error) throw error
      setReportId(rid); setStep(4)
      toast.success('Report submitted! 🎉')
    } catch (e) {
      toast.error(e.message || 'Submission failed. Please try again.')
    } finally { setSubmitting(false) }
  }

  // ── Step 4: Success ────────────────────────────────────
  if (step === 4) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-page)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <motion.div initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        className="card" style={{ maxWidth: 380, width: '100%', textAlign: 'center', padding: 32 }}>
        <div style={{ width: 80, height: 80, background: '#f0fdf4', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: 36 }}>✅</div>
        <h2 style={{ fontFamily: 'Outfit,sans-serif', fontWeight: 800, fontSize: 24, color: 'var(--text-primary)', margin: '0 0 8px' }}>Report Submitted!</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: 20, fontSize: 14 }}>Your issue is logged and assigned to the relevant department.</p>
        <div style={{ background: '#eff6ff', border: '1.5px solid #bfdbfe', borderRadius: 16, padding: '16px', marginBottom: 24 }}>
          <p style={{ fontSize: 11, color: '#64748b', margin: '0 0 4px' }}>Your Report ID</p>
          <p style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: 20, color: '#2563eb', margin: '0 0 4px', letterSpacing: 1 }}>{reportId}</p>
          <p style={{ fontSize: 11, color: '#64748b', margin: 0 }}>Save this to track your report</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => navigate('/track')} className="btn-secondary" style={{ flex: 1, fontSize: 13 }}>Track Issue</button>
          <button onClick={() => navigate('/')} className="btn-primary" style={{ flex: 1, fontSize: 13 }}>Home</button>
        </div>
      </motion.div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-page)' }}>
      {/* Header */}
      <div style={{ background: 'var(--bg-card)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px' }}>
        <button onClick={() => step > 0 ? setStep(s => s - 1) : navigate('/')}
          style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--bg-muted)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <ArrowLeft size={18} color="var(--text-secondary)" />
        </button>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontFamily: 'Outfit,sans-serif', fontWeight: 700, fontSize: 15, color: 'var(--text-primary)', margin: 0 }}>Report Civic Issue</h1>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>Step {step + 1} of {STEPS.length}: {STEPS[step]}</p>
        </div>
      </div>

      {/* Step dots */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 6, padding: '10px 0', background: 'var(--bg-card)', borderBottom: '1px solid var(--border)' }}>
        {STEPS.map((_, i) => (
          <div key={i} style={{
            height: 6, borderRadius: 999, transition: 'all 0.3s',
            width: i === step ? 24 : 6,
            background: i < step ? '#22c55e' : i === step ? '#2563eb' : 'var(--bg-muted)',
          }} />
        ))}
      </div>

      <div className="page-container">
        <AnimatePresence mode="wait">

          {/* ── STEP 0: Photo ──────────────────────── */}
          {step === 0 && (
            <motion.div key="s0" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}>
              <h2 className="section-title">Upload Photo</h2>
              <p className="section-sub">Take or upload a clear photo of the civic issue</p>

              {!image ? (
                <div {...getRootProps()} style={{
                  border: `2px dashed ${isDragActive ? '#2563eb' : 'var(--border)'}`,
                  borderRadius: 20, padding: '40px 20px', textAlign: 'center', cursor: 'pointer',
                  background: isDragActive ? '#eff6ff' : 'var(--bg-card)', transition: 'all 0.2s',
                }}>
                  <input {...getInputProps()} />
                  <div style={{ width: 64, height: 64, background: '#eff6ff', borderRadius: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                    <Upload size={28} color="#2563eb" />
                  </div>
                  <p style={{ fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 6px', fontSize: 15 }}>Drop photo here</p>
                  <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '0 0 16px' }}>or tap to browse / take a photo</p>
                  <div style={{ display: 'inline-block', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 999, padding: '4px 14px', fontSize: 12, color: '#2563eb', fontWeight: 600 }}>
                    📸 Camera or Gallery
                  </div>
                </div>
              ) : (
                <div style={{ position: 'relative', marginBottom: 16 }}>
                  <img src={image} alt="issue" style={{ width: '100%', borderRadius: 16, objectFit: 'cover', maxHeight: 280, display: 'block' }} />
                  <button onClick={() => { setImage(null); setImageFile(null); setAiResult(null) }}
                    style={{ position: 'absolute', top: 10, right: 10, width: 32, height: 32, background: 'rgba(0,0,0,0.6)', color: 'white', border: 'none', borderRadius: '50%', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    ✕
                  </button>
                </div>
              )}

              {image && (
                <motion.button initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  onClick={handleAnalyze} disabled={analyzing} className="btn-primary" style={{ marginTop: 16 }}>
                  {analyzing
                    ? <><RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} /> Analyzing with AI...</>
                    : <>🧠 Analyze with AI <ArrowRight size={16} /></>}
                </motion.button>
              )}
            </motion.div>
          )}

          {/* ── STEP 1: AI Result ──────────────────── */}
          {step === 1 && (
            <motion.div key="s1" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}>
              <h2 className="section-title">AI Analysis Result</h2>
              <p className="section-sub">Review what our AI detected</p>
              <img src={image} alt="issue" style={{ width: '100%', borderRadius: 16, objectFit: 'cover', maxHeight: 180, marginBottom: 14 }} />
              <AIResultCard result={aiResult} />
              <div style={{ marginTop: 14 }}>
                <label style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6, display: 'block', fontWeight: 600 }}>Additional Details (optional)</label>
                <textarea value={description} onChange={e => setDescription(e.target.value)}
                  placeholder="Any additional info about the issue..."
                  rows={3} className="input-field" style={{ resize: 'none' }} />
              </div>
              <button onClick={() => setStep(2)} className="btn-primary" style={{ marginTop: 14 }}>
                Next: Set Location <ArrowRight size={16} />
              </button>
            </motion.div>
          )}

          {/* ── STEP 2: Location ───────────────────── */}
          {step === 2 && (
            <motion.div key="s2" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}>
              <h2 className="section-title">Location</h2>
              <p className="section-sub">Tap the map to pin or use GPS</p>

              {/* GPS Button */}
              <button onClick={handleGPS} disabled={gpsLoading} className="btn-primary" style={{ marginBottom: 10 }}>
                {gpsLoading
                  ? <><RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} /> Getting GPS location...</>
                  : <><Navigation size={16} /> 📍 Use My Current Location</>}
              </button>

              {/* GPS error message */}
              {gpsError && (
                <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 12, padding: '10px 14px', marginBottom: 10, fontSize: 12, color: '#dc2626' }}>
                  ⚠️ {gpsError}
                </div>
              )}

              {/* Map mode toggle */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                {[['satellite','🛰️ Satellite'], ['street','🗺️ Street']].map(([mode, label]) => (
                  <button key={mode} onClick={() => setTileMode(mode)}
                    style={{
                      flex: 1, padding: '8px', borderRadius: 10, border: `1.5px solid ${tileMode === mode ? '#2563eb' : 'var(--border)'}`,
                      background: tileMode === mode ? '#eff6ff' : 'var(--bg-card)',
                      color: tileMode === mode ? '#2563eb' : 'var(--text-secondary)',
                      fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s',
                    }}>
                    {label}
                  </button>
                ))}
              </div>

              {/* Map */}
              <div style={{ borderRadius: 16, overflow: 'hidden', border: '1px solid var(--border)', marginBottom: 12 }}>
                <LocationPicker
                  onLocationChange={handleMapClick}
                  lat={lat} lng={lng}
                  tileMode={tileMode}
                />
              </div>

              {/* Address */}
              {address ? (
                <div className="card" style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 14px', marginBottom: 14 }}>
                  <MapPin size={16} color="#2563eb" style={{ flexShrink: 0, marginTop: 1 }} />
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>{address}</p>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '12px 0', marginBottom: 14 }}>
                  <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>👆 Tap on the map to set location, or use GPS above</p>
                </div>
              )}

              {lat && lng ? (
                <button onClick={() => setStep(3)} className="btn-primary">
                  Next: Verify & Submit <ArrowRight size={16} />
                </button>
              ) : (
                <button disabled className="btn-primary" style={{ opacity: 0.45, cursor: 'not-allowed' }}>
                  Set location to continue
                </button>
              )}
            </motion.div>
          )}

          {/* ── STEP 3: OTP + Submit ───────────────── */}
          {step === 3 && (
            <motion.div key="s3" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}>
              <h2 className="section-title">Verify & Submit</h2>
              <p className="section-sub">Verify your identity before submitting</p>

              {/* OTP type tabs */}
              <div style={{ display: 'flex', background: 'var(--bg-muted)', borderRadius: 12, padding: 4, marginBottom: 14 }}>
                {[{ key: 'phone', label: '📱 Mobile OTP', hint: 'SMS via Twilio' }, { key: 'email', label: '📧 Email OTP', hint: 'via Supabase' }].map(({ key, label }) => (
                  <button key={key} onClick={() => { setOtpType(key); setOtpVerified(false) }}
                    style={{
                      flex: 1, padding: '8px', borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, transition: 'all 0.2s',
                      background: otpType === key ? 'white' : 'transparent',
                      color: otpType === key ? (key === 'phone' ? '#16a34a' : '#2563eb') : 'var(--text-muted)',
                      boxShadow: otpType === key ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
                    }}>{label}</button>
                ))}
              </div>

              {/* Contact input */}
              <div className="card" style={{ marginBottom: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
                {otpType === 'phone' ? (
                  <div>
                    <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Phone size={13} color="#16a34a" /> Mobile Number <span style={{ color: '#dc2626', fontWeight: 700 }}>*</span>
                    </label>
                    <input type="tel" value={phone}
                      onChange={e => { setPhone(e.target.value); setOtpVerified(false) }}
                      placeholder="+91 98765 43210" className="input-field"
                    />
                  </div>
                ) : (
                  <div>
                    <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Mail size={13} color="#2563eb" /> Email Address <span style={{ color: '#dc2626', fontWeight: 700 }}>*</span>
                    </label>
                    <input type="email" value={email}
                      onChange={e => { setEmail(e.target.value); setOtpVerified(false) }}
                      placeholder="your@email.com" className="input-field"
                    />
                  </div>
                )}
                {/* Optional other field */}
                {otpType === 'phone' ? (
                  <div>
                    <label style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4, display: 'block' }}>Email (optional — for report notifications)</label>
                    <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" className="input-field" />
                  </div>
                ) : (
                  <div>
                    <label style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4, display: 'block' }}>Phone (optional — for SMS updates)</label>
                    <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+91 98765 43210" className="input-field" />
                  </div>
                )}
              </div>

              {/* OTP section */}
              {otpVerified ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#f0fdf4', border: '1.5px solid #bbf7d0', borderRadius: 14, padding: '14px 16px', marginBottom: 14 }}>
                  <CheckCircle size={20} color="#16a34a" />
                  <div>
                    <p style={{ fontWeight: 700, color: '#15803d', margin: 0, fontSize: 14 }}>✅ Verified via {verifiedVia === 'phone' ? 'Mobile SMS' : 'Email'}</p>
                    <p style={{ fontSize: 12, color: '#16a34a', margin: 0 }}>Ready to submit your report</p>
                  </div>
                </div>
              ) : (
                <div style={{
                  background: otpType === 'phone' ? '#f0fdf4' : '#eff6ff',
                  border: `1.5px solid ${otpType === 'phone' ? '#bbf7d0' : '#bfdbfe'}`,
                  borderRadius: 14, padding: '14px 16px', marginBottom: 14
                }}>
                  <p style={{ fontWeight: 700, color: otpType === 'phone' ? '#15803d' : '#1d4ed8', margin: '0 0 4px', fontSize: 14 }}>
                    {otpType === 'phone' ? '📱 Mobile OTP via Twilio' : '📧 Email OTP'}
                  </p>
                  <p style={{ fontSize: 12, color: otpType === 'phone' ? '#16a34a' : '#3b82f6', margin: '0 0 12px' }}>
                    {otpType === 'phone'
                      ? 'A 6-digit code will be sent to your mobile number via SMS.'
                      : 'A 6-digit code will be sent to your email address.'}
                  </p>
                  <button
                    onClick={() => {
                      const contact = otpType === 'phone' ? phone : email
                      if (!contact) { toast.error(`Enter your ${otpType === 'phone' ? 'mobile number' : 'email'} first`); return }
                      setOtpOpen(true)
                    }}
                    style={{
                      width: '100%', padding: '10px', borderRadius: 12, border: 'none', cursor: 'pointer',
                      background: otpType === 'phone' ? 'linear-gradient(135deg,#22c55e,#16a34a)' : 'linear-gradient(135deg,#3b82f6,#2563eb)',
                      color: 'white', fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    }}
                  >
                    {otpType === 'phone' ? <><Phone size={15} /> Send SMS OTP</> : <><Mail size={15} /> Send Email OTP</>}
                  </button>
                </div>
              )}

              {/* Summary */}
              <div className="card" style={{ marginBottom: 14 }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Report Summary</p>
                {[
                  ['Category',   aiResult?.category,   true],
                  ['Severity',   `${aiResult?.severity}/5`, false],
                  ['Department', aiResult?.department, false],
                  ['Location',   address || 'Set in step 3', false],
                ].map(([k, v, cap]) => (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                    <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{k}</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', textTransform: cap ? 'capitalize' : 'none', textAlign: 'right', maxWidth: '55%' }}>{v}</span>
                  </div>
                ))}
              </div>

              <button onClick={handleSubmit} disabled={!otpVerified || submitting} className="btn-primary">
                {submitting
                  ? <><RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} /> Submitting...</>
                  : <><CheckCircle size={16} /> Submit Report</>}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <OTPModal
        isOpen={otpOpen}
        onClose={() => setOtpOpen(false)}
        contact={otpType === 'phone' ? phone : email}
        contactType={otpType}
        onVerified={() => { setOtpVerified(true); setVerifiedVia(otpType); setOtpOpen(false) }}
      />
    </div>
  )
}
