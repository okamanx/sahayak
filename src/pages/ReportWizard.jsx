import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import { Camera, Image as ImageIcon, MapPin, Mic, Send, RefreshCw, X, AlertTriangle, CheckCircle, ArrowRight, ArrowLeft } from 'lucide-react'
import { supabase, uploadImage, uploadAudio, generateReportId, CATEGORY_ICONS } from '../lib/supabase'
import { classifyImage, DEPARTMENTS } from '../lib/classifier'
import OTPModal from '../components/OTPModal'
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet'
import L from 'leaflet'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const MB = import.meta.env.VITE_MAPBOX_TOKEN
const MAPBOX_URL = `https://api.mapbox.com/styles/v1/mapbox/streets-v12/tiles/{z}/{x}/{y}?access_token=${MB}`

function LocationMarker({ location, setLocation, setAddress }) {
  const map = useMap()
  
  useEffect(() => {
    if (location.lat && location.lng) {
      map.flyTo([location.lat, location.lng], 16)
    }
  }, [location.lat, location.lng, map])

  useMapEvents({
    click(e) {
      const lat = e.latlng.lat
      const lng = e.latlng.lng
      setLocation({ lat, lng })
      setAddress(`${lat.toFixed(5)}, ${lng.toFixed(5)}`)
      map.flyTo(e.latlng, map.getZoom())
    },
  })

  return location.lat && location.lng ? (
    <Marker position={[location.lat, location.lng]} />
  ) : null
}

export default function ReportWizard() {
  const [step, setStep] = useState(1)
  const navigate = useNavigate()

  // ── Step 1: Image Capture ────────
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [classifying, setClassifying] = useState(false)
  
  // Camera specific
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const [showCamera, setShowCamera] = useState(false)
  const [stream, setStream] = useState(null)
  
  // ── Step 2: AI Details & Audio ───
  const [aiResult, setAiResult] = useState(null)
  const [description, setDescription] = useState('')
  const [audioBlob, setAudioBlob] = useState(null)
  const [isRecording, setIsRecording] = useState(false)
  const [transcribing, setTranscribing] = useState(false)
  const mediaRecorderRef = useRef(null)
  const audioChunksRef = useRef([])
  
  // ── Step 3: Location ─────────────
  const [location, setLocation] = useState({ lat: null, lng: null })
  const [address, setAddress] = useState('')
  const [locating, setLocating] = useState(false)
  
  // ── Step 4: Contact & Submit ─────
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [otpOpen, setOtpOpen] = useState(false)

  // ── Handlers ──────────────────────

  async function processImage(file) {
    if (!file) return
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
    setClassifying(true)
    try {
      const res = await classifyImage(file)
      setAiResult(res)
      setDescription(res.description || '')
      setStep(2)
      toast.success('AI Classification Complete!')
    } catch (err) {
      toast.error(err.message || 'Image classification failed.')
      setImageFile(null)
      setImagePreview(null)
    } finally {
      setClassifying(false)
    }
  }

  function handleImageSelect(e) {
    processImage(e.target.files?.[0])
  }

  async function startCamera() {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      })
      setStream(mediaStream)
      setShowCamera(true)
    } catch (err) {
      toast.error('Camera access denied or unavailable')
      console.error(err)
    }
  }

  useEffect(() => {
    if (showCamera && stream && videoRef.current) {
      videoRef.current.srcObject = stream
    }
  }, [showCamera, stream])

  function stopCamera() {
    if (stream) stream.getTracks().forEach(t => t.stop())
    setStream(null)
    setShowCamera(false)
  }

  useEffect(() => {
    return () => {
      if (stream) stream.getTracks().forEach(t => t.stop())
    }
  }, [stream])

  function capturePhoto() {
    if (!videoRef.current || !canvasRef.current) return
    const video = videoRef.current
    const canvas = canvasRef.current
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    ctx.drawImage(video, 0, 0)
    canvas.toBlob(blob => {
      if (!blob) return
      const file = new File([blob], "camera_capture.jpg", { type: "image/jpeg" })
      stopCamera()
      processImage(file)
    }, 'image/jpeg', 0.8)
  }

  function handleGetLocation() {
    if (!navigator.geolocation) return toast.error('Geolocation not supported')
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords
        setLocation({ lat: latitude, lng: longitude })
        setAddress(`${latitude.toFixed(5)}, ${longitude.toFixed(5)}`)
        toast.success('Location captured!')
        setLocating(false)
      },
      (err) => {
        toast.error('Failed to get location. ' + err.message)
        setLocating(false)
      },
      { enableHighAccuracy: true }
    )
  }

  // ── Voice Recording & STT ──────────
  
  async function toggleRecording() {
    if (isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        const mediaRecorder = new MediaRecorder(stream)
        mediaRecorderRef.current = mediaRecorder
        audioChunksRef.current = []

        mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) audioChunksRef.current.push(e.data)
        }

        mediaRecorder.onstop = async () => {
          const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
          setAudioBlob(blob)
          await transcribeAudio(blob)
          stream.getTracks().forEach(track => track.stop())
        }

        mediaRecorder.start()
        setIsRecording(true)
        toast('Recording... speak now', { icon: '🎙️' })
      } catch (err) {
        toast.error('Microphone access denied')
      }
    }
  }

  async function transcribeAudio(blob) {
    setTranscribing(true)
    const GROQ_KEY = import.meta.env.VITE_GROQ_API_KEY
    if (!GROQ_KEY || GROQ_KEY.startsWith('your-')) {
      toast.error('Groq API Key missing for transcription')
      setTranscribing(false)
      return
    }

    try {
      const formData = new FormData()
      formData.append('file', new File([blob], 'recording.webm', { type: 'audio/webm' }))
      formData.append('model', 'whisper-large-v3')
      formData.append('response_format', 'json')

      const res = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${GROQ_KEY}` },
        body: formData
      })

      if (!res.ok) throw new Error('Transcription failed')
      const data = await res.json()
      if (data.text) {
        setDescription(prev => prev ? `${prev}\n${data.text}` : data.text)
        toast.success('Voice transcribed!')
      }
    } catch (err) {
      console.error(err)
      toast.error('Could not transcribe audio')
    } finally {
      setTranscribing(false)
    }
  }

  async function handleSubmit() {
    if (!phone) return toast.error('Please enter your phone number')
    setOtpOpen(true)
  }

  async function finalizeSubmission() {
    setSubmitting(true)
    try {
      const reportId = generateReportId()
      
      const [imgUrl, audUrl] = await Promise.all([
        imageFile ? uploadImage(imageFile, 'issue-images') : Promise.resolve(null),
        audioBlob ? uploadAudio(audioBlob, 'issue-audio') : Promise.resolve(null)
      ])

      const { data, error } = await supabase.from('issues').insert([{
        report_id: reportId,
        category: aiResult.category || 'other',
        severity: aiResult.severity || 3,
        priority: aiResult.priority || 5.0,
        is_high_risk: aiResult.isHighRisk || false,
        department: aiResult.department || 'Municipal Corporation',
        status: 'Pending',
        description: description,
        latitude: location.lat,
        longitude: location.lng,
        address,
        image_url: imgUrl,
        audio_url: audUrl,
        contact_phone: phone,
        contact_email: email || null
      }]).select().single()

      if (error) throw error

      toast.success('Report submitted successfully!')
      // Reset or redirect. Let's redirect to track
      navigate('/track')
      
    } catch (err) {
      console.error(err)
      toast.error(err.message || 'Submission failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-page)', paddingBottom: 80 }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg,#eff6ff,#eef2ff)', padding: '24px 20px', borderBottom: '1px solid var(--border)' }}>
        <h1 style={{ fontFamily: 'Outfit,sans-serif', fontWeight: 800, fontSize: 24, color: '#0f172a', margin: '0 0 8px' }}>Report an Issue</h1>
        
        {/* Progress Bar */}
        <div style={{ display: 'flex', gap: 6 }}>
          {[1, 2, 3, 4].map(s => (
            <div key={s} style={{ 
              height: 4, flex: 1, borderRadius: 4, transition: 'all 0.3s',
              background: s <= step ? '#2563eb' : 'var(--border)'
            }} />
          ))}
        </div>
      </div>

      <div className="page-container" style={{ marginTop: 24 }}>
        <AnimatePresence mode="wait">
          
          {/* STEP 1: Image Capture */}
          {step === 1 && (
            <motion.div key="1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <div className="card" style={{ padding: 24, textAlign: 'center' }}>
                {showCamera ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div style={{ position: 'relative', width: '100%', borderRadius: 12, overflow: 'hidden', background: '#000' }}>
                      <video ref={videoRef} autoPlay playsInline style={{ width: '100%', display: 'block' }} />
                      <canvas ref={canvasRef} style={{ display: 'none' }} />
                    </div>
                    <div style={{ display: 'flex', gap: 12 }}>
                      <button onClick={stopCamera} className="btn-secondary" style={{ flex: 1, color: '#dc2626', borderColor: '#fca5a5' }}>Cancel</button>
                      <button onClick={capturePhoto} className="btn-primary" style={{ flex: 2, background: '#2563eb' }}>
                        <Camera size={18} style={{ marginRight: 8, display: 'inline' }} /> Snap Photo
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div style={{ width: 64, height: 64, background: 'var(--bg-muted, #eff6ff)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                      <ImageIcon size={32} color="#2563eb" />
                    </div>
                    <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 8px', color: 'var(--text-primary)' }}>Capture the Issue</h2>
                    <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 24px' }}>Take a clear picture of the pothole, garbage, or damage so our AI can analyze it.</p>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <button onClick={startCamera} disabled={classifying} className="btn-primary" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%' }}>
                        {classifying ? <RefreshCw className="spin" size={18} /> : <Camera size={18} />}
                        {classifying ? 'Analyzing...' : 'Open Camera'}
                      </button>
                      
                      <label className="btn-secondary" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%' }}>
                        <ImageIcon size={18} /> Choose from Gallery
                        <input type="file" accept="image/*" hidden onChange={handleImageSelect} disabled={classifying} />
                      </label>
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          )}

          {/* STEP 2: Review AI Details */}
          {step === 2 && (
            <motion.div key="2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <div className="card" style={{ padding: 20 }}>
                {imagePreview && <img src={imagePreview} alt="Preview" style={{ width: '100%', borderRadius: 12, height: 160, objectFit: 'cover', marginBottom: 16 }} />}
                
                {/* AI SUCCESS BANNER */}
                {aiResult && !aiResult.aiFailed && (
                  <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', padding: 12, borderRadius: 12, marginBottom: 16 }}>
                    <h3 style={{ fontSize: 11, fontWeight: 800, color: '#16a34a', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 6px' }}>AI Match Found</h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 24 }}>{CATEGORY_ICONS[aiResult.category] || '⚠️'}</span>
                      <div>
                        <p style={{ margin: 0, fontWeight: 700, fontSize: 16, textTransform: 'capitalize', color: '#15803d' }}>{aiResult.category}</p>
                        <p style={{ margin: 0, fontSize: 11, color: '#166534' }}>Severity: {aiResult.severity}/5 | Dept: {aiResult.department}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* AI FAILURE / MANUAL SELECTION */}
                {(!aiResult || aiResult.aiFailed) && (
                  <div style={{ marginBottom: 16 }}>
                    <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8, display: 'block' }}>Select Issue Category</label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                      {['pothole', 'garbage', 'drainage', 'pipeline', 'streetlight', 'other'].map(cat => (
                        <button
                          key={cat}
                          onClick={() => setAiResult({ ...aiResult, category: cat, department: DEPARTMENTS[cat] })}
                          style={{
                            padding: '10px 4px', borderRadius: 8, border: '1px solid',
                            borderColor: aiResult?.category === cat ? '#2563eb' : 'var(--border)',
                            background: aiResult?.category === cat ? '#eff6ff' : '#fff',
                            color: aiResult?.category === cat ? '#1e40af' : '#475569',
                            fontSize: 11, fontWeight: 600, cursor: 'pointer', textAlign: 'center'
                          }}
                        >
                          <div style={{ fontSize: 18, marginBottom: 4 }}>{CATEGORY_ICONS[cat]}</div>
                          <div style={{ textTransform: 'capitalize' }}>{cat}</div>
                        </button>
                      ))}
                    </div>
                    {aiResult?.error && <p style={{ fontSize: 10, color: '#94a3b8', marginTop: 8 }}>ℹ️ AI skipped: {aiResult.error}</p>}
                  </div>
                )}

                <div style={{ marginBottom: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>Description & Voice Note</label>
                    <button 
                      onClick={toggleRecording} 
                      disabled={transcribing}
                      className={isRecording ? 'pulse' : ''}
                      style={{ 
                        background: isRecording ? '#ef4444' : '#f1f5f9', 
                        border: 'none', padding: '6px 12px', borderRadius: 20, 
                        display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700,
                        color: isRecording ? '#fff' : '#475569', cursor: 'pointer'
                      }}
                    >
                      {transcribing ? <RefreshCw size={14} className="spin" /> : <Mic size={14} />}
                      {isRecording ? 'Stop Recording' : (transcribing ? 'Transcribing...' : 'Record Voice')}
                    </button>
                  </div>
                  <textarea 
                    value={description} 
                    onChange={e => setDescription(e.target.value)} 
                    placeholder="Describe the issue here, or use the mic to speak..."
                    className="input-field" 
                    style={{ minHeight: 100, resize: 'none' }} 
                  />
                </div>

                <div style={{ display: 'flex', gap: 12 }}>
                  <button onClick={() => setStep(1)} className="btn-secondary" style={{ padding: 12, flex: 1 }}><ArrowLeft size={18}/></button>
                  <button onClick={() => setStep(3)} className="btn-primary" style={{ flex: 3 }}>Next <ArrowRight size={18}/></button>
                </div>
              </div>
            </motion.div>
          )}

          {/* STEP 3: Location */}
          {step === 3 && (
            <motion.div key="3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <div className="card" style={{ padding: 20 }}>
                <div style={{ textAlign: 'center', marginBottom: 20 }}>
                  <MapPin size={32} color="#dc2626" style={{ margin: '0 auto 12px' }} />
                  <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 4px' }}>Where is it?</h2>
                  <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>Help authorities locate the issue faster.</p>
                </div>

                <button onClick={handleGetLocation} disabled={locating} className="btn-primary" style={{ marginBottom: 16, background: '#ef4444', border: 'none' }}>
                  {locating ? <RefreshCw className="spin" size={18} /> : <MapPin size={18} />}
                  {locating ? 'Locating...' : 'Use Current GPS Location'}
                </button>

                <div style={{ height: 220, width: '100%', borderRadius: 12, overflow: 'hidden', marginBottom: 20, zIndex: 0, border: '1px solid var(--border)' }}>
                  <MapContainer center={[20.5937, 78.9629]} zoom={4} style={{ height: '100%', width: '100%' }}>
                    <TileLayer url={MAPBOX_URL} attribution="© Mapbox" />
                    <LocationMarker location={location} setLocation={setLocation} setAddress={setAddress} />
                  </MapContainer>
                </div>

                <div style={{ marginBottom: 20 }}>
                  <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6, display: 'block' }}>Landmark or full address (Optional)</label>
                  <input type="text" value={address} onChange={e => setAddress(e.target.value)} placeholder="e.g. Near Central Park station" className="input-field" />
                </div>

                <div style={{ display: 'flex', gap: 12 }}>
                  <button onClick={() => setStep(2)} className="btn-secondary" style={{ padding: 12, flex: 1 }}><ArrowLeft size={18}/></button>
                  <button onClick={() => {
                    if (!location.lat && !address) toast.error('Please provide a location or address')
                    else setStep(4)
                  }} className="btn-primary" style={{ flex: 3 }}>Next <ArrowRight size={18}/></button>
                </div>
              </div>
            </motion.div>
          )}

          {/* STEP 4: Contact & Submit */}
          {step === 4 && (
            <motion.div key="4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <div className="card" style={{ padding: 20 }}>
                <div style={{ textAlign: 'center', marginBottom: 20 }}>
                  <Send size={32} color="#16a34a" style={{ margin: '0 auto 12px' }} />
                  <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 4px' }}>Almost Done!</h2>
                  <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>Provide contact details to track updates.</p>
                </div>

                <div style={{ marginBottom: 16 }}>
                  <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6, display: 'block' }}>Phone Number (Required)</label>
                  <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+91 98765 43210" className="input-field" />
                </div>
                
                <div style={{ marginBottom: 24 }}>
                  <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6, display: 'block' }}>Email (Optional - for OTP login fallback)</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="email@example.com" className="input-field" />
                </div>

                <div style={{ display: 'flex', gap: 12 }}>
                  <button onClick={() => setStep(3)} className="btn-secondary" style={{ padding: 12, flex: 1 }}><ArrowLeft size={18}/></button>
                  <button onClick={handleSubmit} disabled={submitting} className="btn-primary" style={{ flex: 3, background: '#16a34a' }}>
                    {submitting ? <RefreshCw className="spin" size={18} /> : <CheckCircle size={18} />}
                    {submitting ? 'Submitting...' : 'Submit Report'}
                  </button>
                </div>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      <OTPModal 
        isOpen={otpOpen} 
        onClose={() => { setOtpOpen(false); setSubmitting(false); }} 
        contact={email || phone} 
        contactType={email ? 'email' : 'phone'}
        onVerified={() => { setOtpOpen(false); finalizeSubmission(); }}
      />
      
      <style>{`
        .spin { animation: spin 1s linear infinite; }
        .pulse { animation: pulse 1.5s ease-in-out infinite; }
        @keyframes spin { 100% { transform: rotate(360deg); } }
        @keyframes pulse { 0% { opacity: 1; transform: scale(1); } 50% { opacity: 0.7; transform: scale(1.05); } 100% { opacity: 1; transform: scale(1); } }
      `}</style>
    </div>
  )
}
