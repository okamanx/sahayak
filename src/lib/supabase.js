import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// ── Department routing ─────────────────────────────────────────────
export const DEPARTMENTS = {
  pothole:    'Road & Infrastructure',
  garbage:    'Sanitation Department',
  drainage:   'Water & Sewage',
  pipeline:   'Water & Sewage',
  streetlight:'Electricity Department',
  other:      'Municipal Corporation',
}

export const CATEGORY_WEIGHTS = {
  pothole: 3, garbage: 2, drainage: 4, pipeline: 4, streetlight: 3, other: 1,
}

export const CATEGORY_ICONS = {
  pothole:    '🕳️',
  garbage:    '🗑️',
  drainage:   '🚿',
  pipeline:   '🔧',
  streetlight:'💡',
  other:      '⚠️',
}

// ── Generate unique Report ID ──────────────────────────────────────
export function generateReportId() {
  const year = new Date().getFullYear()
  const rand = Math.floor(Math.random() * 900000) + 100000
  return `CIVIC-${year}-${rand}`
}

// ── Priority calculator ────────────────────────────────────────────
export function calcPriority(severity, category, locationRisk = 1) {
  const catWeight = CATEGORY_WEIGHTS[category] || 1
  return parseFloat((severity * 2 + catWeight + locationRisk).toFixed(2))
}

// ── Severity label ─────────────────────────────────────────────────
export function severityLabel(s) {
  return ['', 'Minor', 'Low', 'Moderate', 'High', 'Critical'][s] || 'Unknown'
}

// ── Status color class ─────────────────────────────────────────────
export function statusClass(status) {
  if (status === 'Resolved') return 'badge-resolved'
  if (status === 'In Progress') return 'badge-progress'
  return 'badge-pending'
}

export async function uploadImage(file, bucket = 'issue-images') {
  const ext = file.name.split('.').pop()
  const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
  const { data, error } = await supabase.storage.from(bucket).upload(path, file, {
    cacheControl: '3600', upsert: false,
  })
  if (error) throw error
  const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(path)
  return publicUrl
}

// ── Upload audio to Supabase Storage ──────────────────────────────
export async function uploadAudio(blob, bucket = 'issue-audio') {
  const ext = blob.type && blob.type.includes('mp4') ? 'mp4' : 'webm'
  const path = `voice-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
  const { data, error } = await supabase.storage.from(bucket).upload(path, blob, {
    cacheControl: '3600', upsert: false,
    contentType: blob.type || 'audio/webm'
  })
  if (error) throw error
  const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(path)
  return publicUrl
}


// ── Fetch all issues (admin) ───────────────────────────────────────
export async function fetchAllIssues(filters = {}) {
  let query = supabase.from('issues').select('*').order('priority', { ascending: false })
  if (filters.status)   query = query.eq('status', filters.status)
  if (filters.category) query = query.eq('category', filters.category)
  if (filters.department) query = query.eq('department', filters.department)
  const { data, error } = await query
  if (error) throw error
  return data
}

// ── Fetch issues by phone ──────────────────────────────────────────
export async function fetchIssuesByPhone(phone) {
  const { data, error } = await supabase
    .from('issues').select('*')
    .eq('contact_phone', phone)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

// ── Fetch issues by email ──────────────────────────────────────────
export async function fetchIssuesByEmail(email) {
  const { data, error } = await supabase
    .from('issues').select('*')
    .eq('contact_email', email)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}


// ── Fetch issue by report_id ───────────────────────────────────────
export async function fetchIssueByReportId(reportId) {
  const { data, error } = await supabase
    .from('issues').select('*').eq('report_id', reportId).single()
  if (error) throw error
  return data
}

// ── Send OTP (via Supabase Auth) ───────────────────────────────────
export async function sendOTP(email) {
  const { error } = await supabase.auth.signInWithOtp({ email })
  if (error) throw error
}

// ── Verify OTP ────────────────────────────────────────────────────
export async function verifyOTP(email, token) {
  const { data, error } = await supabase.auth.verifyOtp({ email, token, type: 'email' })
  if (error) throw error
  return data
}

// ── Volunteer Operations ──────────────────────────────────────────────
export async function registerVolunteer(details) {
  // details: { name, phone, password, alt_phone, from_origin, location, age, gender }
  const { data, error } = await supabase
    .from('workers') // Reusing table but with more fields
    .insert([details])
    .select()
    .single()
  if (error) {
    if (error.code === '23505') throw new Error('Phone number already registered')
    throw error
  }
  return data
}

export async function loginVolunteer(phone, password) {
  const { data, error } = await supabase
    .from('workers')
    .select('*')
    .eq('phone', phone).eq('password', password).single()
  if (error) throw new Error('Invalid credentials')
  return data
}

export async function fetchVolunteerIssues(phone) {
  const { data, error } = await supabase
    .from('issues').select('*')
    .eq('worker_phone', phone)
    .order('priority', { ascending: false })
  if (error) throw error
  return data
}

export async function resolveIssue(id, cost, imageUrl, notes) {
  const { data, error } = await supabase
    .from('issues')
    .update({
      status: 'Resolved',
      resolved_at: new Date().toISOString(),
      resolution_cost: cost,
      resolution_image_url: imageUrl,
      resolution_notes: notes
    })
    .eq('id', id)
  if (error) throw error
  return data
}

export async function assignVolunteerToIssue(id, vPhone, vName) {
  const { data, error } = await supabase
    .from('issues')
    .update({ worker_phone: vPhone, worker_name: vName })
    .eq('id', id)
  if (error) throw error
  return data
}

// ── Update Volunteer Profile ──────────────────────────────────────────
export async function updateVolunteerProfile(id, updates) {
  const { data, error } = await supabase
    .from('workers')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw new Error(error.message || 'Failed to update profile')
  return data
}

// ── Utility: Calculate Distance (Location Verification) ──────────
export function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c * 1000; // Multiplied by 1000 to get meters
}
