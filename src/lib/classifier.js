/**
 * Gemini Vision AI — Civic Issue Classifier
 * Uses gemini-2.0-flash with fallback to gemini-1.5-flash → HuggingFace → demo
 */

const GEMINI_KEY = import.meta.env.VITE_GEMINI_API_KEY
const HF_KEY     = import.meta.env.VITE_HF_API_KEY

// Try newest model first, fall back to stable
const GEMINI_MODELS = [
  'gemini-2.0-flash',
  'gemini-1.5-flash-latest',
  'gemini-1.5-flash',
]
const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models'

const CATEGORIES = ['pothole', 'garbage', 'drainage', 'pipeline', 'streetlight', 'other']
const CATEGORY_WEIGHTS = { pothole: 3, garbage: 2, drainage: 4, pipeline: 4, streetlight: 3, other: 1 }
const DEPARTMENTS = {
  pothole:     'Road & Infrastructure',
  garbage:     'Sanitation Department',
  drainage:    'Water & Sewage',
  pipeline:    'Water & Sewage',
  streetlight: 'Electricity Department',
  other:       'Municipal Corporation',
}

export function calcPriority(severity, category, locationRisk = 1) {
  return parseFloat((severity * 2 + (CATEGORY_WEIGHTS[category] || 1) + locationRisk).toFixed(2))
}

export function severityLabel(s) {
  return ['', 'Minor', 'Low', 'Moderate', 'High', 'Critical'][s] || 'Unknown'
}

async function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result.split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

const CIVIC_PROMPT = `You are a strict civic infrastructure inspector AI.

Determine if this image shows a real civic infrastructure problem (road, drain, garbage, broken pipe, streetlight, public property damage).

If NOT a civic issue (person, food, indoor room, game screenshot, phone screen, animal, selfie, cartoon, landscape without damage), return ONLY:
{"isCivicIssue":false,"reason":"<why not civic>"}

If YES a civic issue, return ONLY:
{"isCivicIssue":true,"category":"<pothole|garbage|drainage|pipeline|streetlight|other>","severity":<1-5>,"confidence":<0.0-1.0>,"description":"<2 sentences about the issue>","isHighRisk":<true|false>}

Severity: 1=minor cosmetic, 2=low, 3=moderate daily impact, 4=high safety, 5=critical/immediate danger.
Respond ONLY with valid JSON, no markdown, no extra text.`

/**
 * Try calling Gemini with given model name
 */
async function tryGemini(imageFile, model) {
  const base64   = await fileToBase64(imageFile)
  const mimeType = imageFile.type || 'image/jpeg'
  const url      = `${GEMINI_BASE}/${model}:generateContent?key=${GEMINI_KEY}`

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: CIVIC_PROMPT }, { inline_data: { mime_type: mimeType, data: base64 } }] }],
      generationConfig: { temperature: 0.1, maxOutputTokens: 256, responseMimeType: 'application/json' },
    }),
  })

  if (!res.ok) {
    const errText = await res.text().catch(() => res.statusText)
    throw new Error(`Gemini ${model} ${res.status}: ${errText.slice(0, 80)}`)
  }

  const result = await res.json()

  // Handle blocked / safety filtered responses
  const candidate = result.candidates?.[0]
  if (!candidate) throw new Error('Gemini returned no candidates (possibly blocked)')
  if (candidate.finishReason === 'SAFETY') throw new Error('Image was blocked by safety filters')

  const text = candidate.content?.parts?.[0]?.text || ''
  if (!text) throw new Error('Gemini returned empty response')

  // Parse JSON — extract from markdown if needed
  const jsonStr = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim()
  const match   = jsonStr.match(/\{[\s\S]*\}/)
  if (!match) throw new Error(`Invalid JSON from Gemini: ${text.slice(0, 60)}`)

  return JSON.parse(match[0])
}

/**
 * Classify using Gemini Vision — tries multiple models
 */
export async function classifyWithGemini(imageFile) {
  let lastErr
  for (const model of GEMINI_MODELS) {
    try {
      const parsed = await tryGemini(imageFile, model)

      if (!parsed.isCivicIssue) {
        const err   = new Error(parsed.reason || 'This image does not appear to show a civic infrastructure issue.')
        err.notCivic = true
        throw err
      }

      const category   = CATEGORIES.includes(parsed.category) ? parsed.category : 'other'
      const severity   = Math.max(1, Math.min(5, Math.round(parsed.severity || 3)))
      const priority   = calcPriority(severity, category)
      return {
        category,
        severity,
        priority,
        department:  DEPARTMENTS[category],
        isHighRisk:  parsed.isHighRisk || severity >= 4,
        description: parsed.description || 'Civic issue detected.',
        confidence:  parseFloat((parsed.confidence || 0.8).toFixed(2)),
      }
    } catch (e) {
      if (e.notCivic) throw e   // propagate civic rejection immediately
      lastErr = e
      console.warn(`[Gemini] ${e.message}`)
    }
  }
  throw lastErr
}

/**
 * HuggingFace fallback
 */
export async function classifyWithHuggingFace(imageFile) {
  const res = await fetch(
    'https://api-inference.huggingface.co/models/google/vit-base-patch16-224',
    { method: 'POST', headers: { Authorization: `Bearer ${HF_KEY}` }, body: imageFile }
  )
  if (!res.ok) throw new Error('HuggingFace API error')
  const results = await res.json()

  const topLabel   = (results[0]?.label || '').toLowerCase()
  const confidence = results[0]?.score || 0

  const civicKeywords = ['road', 'traffic', 'pavement', 'garbage', 'waste', 'water', 'flood', 'pipe', 'leak', 'light', 'lamp', 'drain']
  const isCivicRelated = civicKeywords.some(k => topLabel.includes(k))

  if (!isCivicRelated && confidence < 0.5) {
    const err = new Error('This image does not look like a civic issue. Please upload a clear photo of the problem.')
    err.notCivic = true
    throw err
  }

  let category = 'other'
  if (topLabel.includes('road') || topLabel.includes('traffic')) category = 'pothole'
  else if (topLabel.includes('garbage') || topLabel.includes('waste')) category = 'garbage'
  else if (topLabel.includes('water') || topLabel.includes('flood') || topLabel.includes('drain')) category = 'drainage'
  else if (topLabel.includes('pipe') || topLabel.includes('leak')) category = 'pipeline'
  else if (topLabel.includes('light') || topLabel.includes('lamp')) category = 'streetlight'

  const severity = 3
  return {
    category, severity,
    priority:    calcPriority(severity, category),
    department:  DEPARTMENTS[category],
    isHighRisk:  false,
    description: `Issue detected: ${results[0]?.label || 'unknown'}. Requires inspection.`,
    confidence:  parseFloat(confidence.toFixed(2)),
  }
}

/**
 * Main — Gemini → HuggingFace → Demo
 */
export async function classifyImage(imageFile) {
  const hasGemini = GEMINI_KEY && GEMINI_KEY !== 'your-gemini-api-key-here'
  const hasHF     = HF_KEY     && HF_KEY !== 'your-huggingface-token-here'

  if (hasGemini) {
    try { return await classifyWithGemini(imageFile) }
    catch (e) {
      if (e.notCivic) throw e
      console.warn('All Gemini models failed, trying HuggingFace:', e.message)
    }
  }

  if (hasHF) {
    try { return await classifyWithHuggingFace(imageFile) }
    catch (e) {
      if (e.notCivic) throw e
      console.warn('HuggingFace failed:', e.message)
    }
  }

  // Demo / no-key mode
  const demos = ['pothole', 'garbage', 'drainage', 'pipeline', 'streetlight']
  const cat   = demos[Math.floor(Math.random() * demos.length)]
  const sev   = 3
  return {
    category: cat, severity: sev,
    priority:    calcPriority(sev, cat),
    department:  DEPARTMENTS[cat],
    isHighRisk:  false,
    description: '⚠️ Demo mode: Add Gemini API key in .env for real AI analysis.',
    confidence:  0.5,
  }
}
