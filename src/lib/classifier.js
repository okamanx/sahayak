const GEMINI_KEY = import.meta.env.VITE_GEMINI_API_KEY
const GROQ_KEY   = import.meta.env.VITE_GROQ_API_KEY
const OR_KEY     = import.meta.env.VITE_OPENROUTER_API_KEY
const OR_MODEL   = import.meta.env.VITE_OPENROUTER_MODEL || 'google/gemini-2.0-flash-001'

// Try newest model first, fall back to stable, then specific versions
const GEMINI_MODELS = [
  'gemini-1.5-flash-latest',
  'gemini-1.5-flash',
  'gemini-2.0-flash-exp',
  'gemini-2.5-flash'
]
const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models'
const GROQ_BASE   = 'https://api.groq.com/openai/v1/chat/completions'

const CATEGORIES = ['pothole', 'garbage', 'drainage', 'pipeline', 'streetlight', 'other']
const CATEGORY_WEIGHTS = { pothole: 3, garbage: 2, drainage: 4, pipeline: 4, streetlight: 3, other: 1 }
export const DEPARTMENTS = {
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

Severity levels:
1: Minor (Cosmetic/cracks, small graffiti)
2: Low (Small potholes, single streetlight out, minor litter)
3: Moderate (Large potholes, broken water pipe with slow leak, street-wide litter)
4: High (Major road damage, flooding, exposed electrical wires)
5: Critical (Building collapse, massive gas/water leak, life-threatening situation)
Respond ONLY with valid JSON, no markdown, no extra text.`


function parseAndBuildResult(parsed) {
  if (!parsed.isCivicIssue) {
    const err   = new Error(parsed.reason || 'This image does not appear to show a civic infrastructure issue.')
    err.notCivic = true
    throw err
  }
  const category = CATEGORIES.includes(parsed.category) ? parsed.category : 'other'
  const severity = Math.max(1, Math.min(5, Math.round(parsed.severity || 3)))
  return {
    category,
    severity,
    priority:    calcPriority(severity, category),
    department:  DEPARTMENTS[category],
    isHighRisk:  parsed.isHighRisk || severity >= 4,
    description: parsed.description || 'Civic issue detected.',
    confidence:  parseFloat((parsed.confidence || 0.8).toFixed(2)),
  }
}

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
    console.error(`[Gemini Error] ${model}:`, errText)
    throw new Error(`Gemini ${model} ${res.status}: ${errText.slice(0, 80)}`)
  }

  const result = await res.json()
  const candidate = result.candidates?.[0]
  if (!candidate) throw new Error('Gemini returned no candidates (possibly blocked)')
  if (candidate.finishReason === 'SAFETY') throw new Error('Image was blocked by safety filters')

  const text = candidate.content?.parts?.[0]?.text || ''
  if (!text) throw new Error('Gemini returned empty response')

  const jsonStr = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim()
  const match   = jsonStr.match(/\{[\s\S]*\}/)
  if (!match) throw new Error(`Invalid JSON from Gemini: ${text.slice(0, 60)}`)

  return JSON.parse(match[0])
}

/**
 * Try OpenRouter Vision (Unified API)
 */
async function tryOpenRouter(imageFile) {
  const base64   = await fileToBase64(imageFile)
  const mimeType = imageFile.type || 'image/jpeg'

  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OR_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://sahayak-portal.vercel.app', // Optional for OpenRouter
      'X-Title': 'Sahayak Civic Portal',
    },
    body: JSON.stringify({
      model: OR_MODEL,
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: CIVIC_PROMPT },
          { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64}` } }
        ]
      }],
      temperature: 0.1,
    })
  })

  if (!res.ok) {
    const errText = await res.text().catch(() => res.statusText)
    throw new Error(`OpenRouter ${res.status}: ${errText.slice(0, 100)}`)
  }

  const result = await res.json()
  const text = result.choices?.[0]?.message?.content || ''
  if (!text) throw new Error('OpenRouter returned empty response')

  const jsonStr = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim()
  const match   = jsonStr.match(/\{[\s\S]*\}/)
  if (!match) throw new Error(`Invalid JSON from OpenRouter: ${text.slice(0, 60)}`)

  return JSON.parse(match[0])
}

/**
 * Try Groq Vision API (Llama 3.2 Vision)
 */
async function tryGroq(imageFile) {
  const base64   = await fileToBase64(imageFile)
  const mimeType = imageFile.type || 'image/jpeg'

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${GROQ_KEY}`,
    },
    body: JSON.stringify({
      model: 'llama-3.2-11b-vision-preview',
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: CIVIC_PROMPT },
          { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64}` } }
        ]
      }],
      temperature: 0.1,
      max_tokens: 256,
    }),
  })

  if (!res.ok) {
    const errText = await res.text().catch(() => res.statusText)
    throw new Error(`Groq ${res.status}: ${errText.slice(0, 120)}`)
  }

  const result = await res.json()
  const text   = result.choices?.[0]?.message?.content || ''
  if (!text) throw new Error('Groq returned empty response')

  const jsonStr = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim()
  const match   = jsonStr.match(/\{[\s\S]*\}/)
  if (!match) throw new Error(`Invalid JSON from Groq: ${text.slice(0, 60)}`)

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
      return parseAndBuildResult(parsed)
    } catch (e) {
      if (e.notCivic) throw e   // propagate civic rejection immediately
      lastErr = e
      console.warn(`[Gemini] ${e.message}`)
    }
  }
  throw lastErr
}


/**
 * Main — Grok → Gemini
 * Throws an error if both options fail or no keys are configured.
 */
export async function classifyImage(imageFile) {
  const hasGemini = GEMINI_KEY && GEMINI_KEY !== 'your-gemini-api-key-here' && !GEMINI_KEY.startsWith('your-')
  const hasGroq   = GROQ_KEY   && GROQ_KEY   !== 'your-groq-api-key-here' && !GROQ_KEY.startsWith('your-')
  const hasOR     = OR_KEY     && OR_KEY     !== 'your-openrouter-key-here' && !OR_KEY.startsWith('your-')

  let lastError = new Error('No valid AI API keys found. Please add Gemini, Groq, or OpenRouter keys to .env')

  // 1. Try Gemini first (Best free vision tier)
  if (hasGemini) {
    try {
      return await classifyWithGemini(imageFile)
    } catch (e) {
      if (e.notCivic) throw e
      console.warn(`[Gemini] ${e.message} — falling back to Groq`)
      lastError = e
    }
  }

  // 2. Try Groq (Fastest Llama 3.2 Vision)
  if (hasGroq) {
    try {
      const parsed = await tryGroq(imageFile)
      return parseAndBuildResult(parsed)
    } catch (e) {
      if (e.notCivic) throw e
      console.warn(`[Groq] ${e.message} — falling back to OpenRouter`)
      lastError = e
    }
  }

  // 3. Try OpenRouter (Robust Multi-model Fallback)
  if (hasOR) {
    try {
      const parsed = await tryOpenRouter(imageFile)
      return parseAndBuildResult(parsed)
    } catch (e) {
      if (e.notCivic) throw e
      console.warn(`[OpenRouter] ${e.message} — all cloud providers failed`)
      lastError = e
    }
  }

  // 4. All Cloud APIs failed
  console.error('[AI Chain Failed]', lastError.message)
  
  return {
    category: 'other', 
    severity: 3,
    priority: calcPriority(3, 'other'),
    department: DEPARTMENTS['other'],
    isHighRisk: false,
    description: '',
    confidence: 0,
    aiFailed: true,
    error: `Cloud AI Limit: ${lastError.message.slice(0, 100)}`
  }
}
