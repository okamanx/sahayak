import { CATEGORY_ICONS, DEPARTMENTS } from '../lib/supabase'
import { AlertTriangle, Clock, CheckCircle, Zap, MapPin, Calendar } from 'lucide-react'
import { motion } from 'framer-motion'

const STATUS_CONFIG = {
  'Pending':     { class: 'badge-pending',  icon: Clock },
  'In Progress': { class: 'badge-progress', icon: Zap },
  'Resolved':    { class: 'badge-resolved', icon: CheckCircle },
}

const SEV_COLORS = ['', 'text-green-400', 'text-lime-400', 'text-amber-400', 'text-orange-400', 'text-red-400']
const SEV_BG     = ['', 'bg-green-500/10', 'bg-lime-500/10', 'bg-amber-500/10', 'bg-orange-500/10', 'bg-red-500/10']

export default function IssueCard({ issue, onClick, className = '' }) {
  const { status, category, severity, priority, report_id, address, created_at, image_url, is_high_risk } = issue
  const { class: sc, icon: SI } = STATUS_CONFIG[status] || STATUS_CONFIG['Pending']
  const emoji = CATEGORY_ICONS[category] || '⚠️'
  const date = new Date(created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.01 }}
      onClick={onClick}
      className={`card-hover overflow-hidden ${className}`}
    >
      <div className="flex gap-3">
        {image_url ? (
          <img src={image_url} alt={category} className="w-20 h-20 object-cover rounded-xl flex-shrink-0" />
        ) : (
          <div className={`w-20 h-20 rounded-xl flex-shrink-0 flex items-center justify-center text-3xl ${SEV_BG[severity]}`}>
            {emoji}
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <div>
              <span className="font-display font-bold text-white capitalize">{category}</span>
              {is_high_risk && (
                <span className="ml-2 badge bg-red-500/20 text-red-400 border border-red-500/30">
                  <AlertTriangle size={10} /> HIGH RISK
                </span>
              )}
            </div>
            <span className={sc}><SI size={11} className="inline mr-0.5" />{status}</span>
          </div>

          <p className="text-xs text-gray-400 truncate mb-2">{report_id}</p>

          <div className="flex items-center gap-3 text-xs">
            <span className={`font-semibold ${SEV_COLORS[severity]}`}>
              Sev {severity}/5
            </span>
            <span className="text-gray-500">Priority: {priority}</span>
          </div>

          {address && (
            <div className="flex items-center gap-1 text-xs text-gray-500 mt-1 truncate">
              <MapPin size={10} /> {address}
            </div>
          )}
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between text-xs text-gray-500">
        <span className="flex items-center gap-1"><Calendar size={10} /> {date}</span>
        <span className="capitalize">{DEPARTMENTS[category]?.split(' ')[0]}</span>
      </div>
    </motion.div>
  )
}
