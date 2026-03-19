import { useState, useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet'
import L from 'leaflet'
import { fetchAllIssues, CATEGORY_ICONS } from '../lib/supabase'
import AdminBottomNav from '../components/AdminBottomNav'
import { RefreshCw, AlertTriangle } from 'lucide-react'
import toast from 'react-hot-toast'


delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

function makeIcon(color) {
  return L.divIcon({
    html: `<div style="
      width:28px;height:28px;border-radius:50% 50% 50% 0;
      background:${color};transform:rotate(-45deg);
      border:2px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.5);
    "></div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 28],
    className: '',
  })
}

const STATUS_COLORS = { 'Pending': '#f59e0b', 'In Progress': '#3b82f6', 'Resolved': '#10b981' }
const SEV_LABELS = ['', 'Minor', 'Low', 'Moderate', 'High', 'Critical']
const MB = import.meta.env.VITE_MAPBOX_TOKEN
const TILES = {
  satellite: `https://api.mapbox.com/v4/mapbox.satellite/{z}/{x}/{y}@2x.jpg?access_token=${MB}`,
  street:    `https://api.mapbox.com/styles/v1/mapbox/streets-v12/tiles/{z}/{x}/{y}?access_token=${MB}`,
}

export default function AdminMap() {
  const [issues, setIssues] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [showHeatmap, setShowHeatmap] = useState(false)
  const [tileMode, setTileMode] = useState('satellite')

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try {
      const data = await fetchAllIssues()
      setIssues(data.filter(i => i.latitude && i.longitude))
    } catch { toast.error('Failed to load') }
    finally { setLoading(false) }
  }

  const filtered = issues.filter(i => {
    if (filter === 'all') return true
    if (filter === 'high_risk') return i.is_high_risk
    return i.status === filter
  })

  // Center on first issue or India
  const center = filtered[0] ? [filtered[0].latitude, filtered[0].longitude] : [20.5937, 78.9629]

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-page)', paddingBottom: 0 }}>
      {/* Header */}
      <div className="admin-header" style={{ display: 'flex', alignItems: 'center', padding: '0 20px', height: 60, borderBottom: '1px solid var(--border)', background: 'var(--bg-card)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 24 }}>🏙️</span>
          <span style={{ fontWeight: 800, fontSize: 18, color: 'var(--text-primary)', fontFamily: 'Outfit,sans-serif' }}>Live Map</span>
        </div>
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', borderBottom: '1px solid var(--border)', background: 'var(--bg-card)', flexWrap: 'wrap', flexShrink: 0 }}>
        <div style={{ display: 'flex', gap: 4, flex: 1 }}>
          {[
            { key: 'all',         label: 'All' },
            { key: 'Pending',     label: '🟡 Pending' },
            { key: 'In Progress', label: '🔵 In Progress' },
            { key: 'Resolved',    label: '🟢 Resolved' },
            { key: 'high_risk',   label: '🔴 High Risk' },
          ].map(({ key, label }) => (
            <button key={key} onClick={() => setFilter(key)}
              style={{
                padding: '4px 10px', borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: 'pointer', border: 'none',
                background: filter === key ? '#2563eb' : 'transparent',
                color: filter === key ? 'white' : 'var(--text-muted)',
                transition: 'all 0.2s',
              }}>{label}</button>
          ))}
        </div>
        {/* Satellite/Street toggle */}
        <div style={{ display: 'flex', gap: 4 }}>
          {[['satellite','🛰️'],['street','🗺️']].map(([mode, icon]) => (
            <button key={mode} onClick={() => setTileMode(mode)}
              style={{
                padding: '4px 10px', borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                border: `1px solid ${tileMode === mode ? '#2563eb' : 'var(--border)'}`,
                background: tileMode === mode ? '#eff6ff' : 'transparent',
                color: tileMode === mode ? '#2563eb' : 'var(--text-muted)',
              }}>{icon}</button>
          ))}
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--text-secondary)', cursor: 'pointer' }}>
          <input type="checkbox" checked={showHeatmap} onChange={e => setShowHeatmap(e.target.checked)} />
          Heatmap
        </label>
        <button onClick={load} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
          <RefreshCw size={14} style={loading ? { animation: 'spin 1s linear infinite' } : {}} />
        </button>
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{filtered.length} pins</span>
      </div>

      {/* Map */}
      <div style={{ flex: 1, position: 'relative', zIndex: 0 }}>
        <MapContainer center={center} zoom={filtered.length === 1 ? 15 : 5} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            url={TILES[tileMode]}
            attribution={tileMode === 'satellite' ? '© Esri' : '© OpenStreetMap'}
          />
          {filtered.map(issue => (
            <Marker
              key={issue.id}
              position={[issue.latitude, issue.longitude]}
              icon={makeIcon(issue.is_high_risk ? '#ef4444' : STATUS_COLORS[issue.status] || '#6b7280')}
            >
              <Popup maxWidth={240}>
                <div style={{ fontFamily: 'Inter,sans-serif' }}>
                  {issue.image_url && <img src={issue.image_url} alt="" style={{ width: '100%', borderRadius: 8, marginBottom: 8, maxHeight: 110, objectFit: 'cover' }} />}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontWeight: 700, textTransform: 'capitalize', fontSize: 14 }}>
                      {CATEGORY_ICONS[issue.category]} {issue.category}
                    </span>
                    {issue.is_high_risk && <AlertTriangle size={12} color="#dc2626" />}
                  </div>
                  <p style={{ fontSize: 11, color: '#64748b', fontFamily: 'monospace', marginBottom: 4 }}>{issue.report_id}</p>
                  <div style={{ display: 'flex', gap: 8, fontSize: 12, marginBottom: 4 }}>
                    <span>Sev: <b>{SEV_LABELS[issue.severity]}</b></span>
                    <span>P: <b>{issue.priority}</b></span>
                  </div>
                  <p style={{ fontSize: 12, marginBottom: 2 }}>{issue.status}</p>
                  {issue.address && <p style={{ fontSize: 11, color: '#64748b', margin: 0 }}>{issue.address.slice(0,60)}</p>}
                </div>
              </Popup>
            </Marker>
          ))}
          {showHeatmap && filtered.map(issue => (
            <Circle
              key={`heat-${issue.id}`}
              center={[issue.latitude, issue.longitude]}
              radius={200 + issue.severity * 100}
              pathOptions={{ fillColor: issue.is_high_risk ? '#ef4444' : '#3b82f6', fillOpacity: 0.15, color: 'transparent' }}
            />
          ))}
        </MapContainer>
      </div>

      <AdminBottomNav />
    </div>
  )
}
