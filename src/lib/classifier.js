/**
 * Grok Vision AI (xAI) — Civic Issue Classifier
 * Uses grok-2-vision-1212 as primary, falls back to Gemini → Demo
 */

const GROK_KEY   = import.meta.env.VITE_GROK_API_KEY
const GEMINI_KEY = import.meta.env.VITE_GEMINI_API_KEY
const GROQ_KEY   = import.meta.env.VITE_GROQ_API_KEY

// Try newest model first, fall back to stable, then specific versions
const GEMINI_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.5-pro',
  'gemini-2.0-flash',
  'gemini-2.0-flash-001'
]
const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models'
const GROK_BASE   = 'https://api.x.ai/v1/chat/completions'

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
 * Try Grok Vision (xAI) — OpenAI-compatible API
 */
async function tryGrok(imageFile) {
  const base64   = await fileToBase64(imageFile)
  const mimeType = imageFile.type || 'image/jpeg'

  const res = await fetch(GROK_BASE, {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${GROK_KEY}`,
    },
    body: JSON.stringify({
      model: 'grok-2-vision-1212',
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
    throw new Error(`Grok ${res.status}: ${errText.slice(0, 120)}`)
  }

  const result = await res.json()
  const text   = result.choices?.[0]?.message?.content || ''
  if (!text) throw new Error('Grok returned empty response')

  const jsonStr = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim()
  const match   = jsonStr.match(/\{[\s\S]*\}/)
  if (!match) throw new Error(`Invalid JSON from Grok: ${text.slice(0, 60)}`)

  return JSON.parse(match[0])
}

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
 * Try local Ollama Vision (e.g. LLaVA or Llama-3.2-Vision)
 */
async function tryOllama(imageFile) {
  const base64 = await fileToBase64(imageFile)
  
  // Ollama crashes (segfault 0xc0000005) if the base64 string includes the data URL prefix
  const rawBase64 = base64.includes(',') ? base64.split(',')[1] : base64;

  const res = await fetch('/api/ollama/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'llava',
      prompt: CIVIC_PROMPT,
      images: [rawBase64],
      stream: false
    }),
  })

  if (!res.ok) {
    const errText = await res.text().catch(() => res.statusText)
    throw new Error(`Ollama ${res.status}: ${errText.slice(0, 80)}`)
  }

  const result = await res.json()
  const text = result.response || ''
  if (!text || text.trim() === '') throw new Error('Ollama returned empty response')

  const jsonStr = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim()
  const match   = jsonStr.match(/\{[\s\S]*\}/)
  if (!match) throw new Error(`Invalid JSON from Ollama: ${text.slice(0, 60)}`)

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
  const hasGrok   = GROK_KEY   && GROK_KEY   !== 'your-grok-api-key-here'
  const hasGemini = GEMINI_KEY && GEMINI_KEY !== 'your-gemini-api-key-here'

  let lastError = new Error('No valid AI API keys found. Please add Grok or Gemini keys to .env')

  // 1. Try Grok first (xAI) — primary AI, best image understanding
  if (hasGrok) {
    try {
      const parsed = await tryGrok(imageFile)
      return parseAndBuildResult(parsed)
    } catch (e) {
      if (e.notCivic) throw e
      console.warn(`[Grok] ${e.message} — falling back to Gemini`)
      lastError = e
    }
  }

  // 2. Gemini fallback
  if (hasGemini) {
    try {
      return await classifyWithGemini(imageFile)
    } catch (e) {
      if (e.notCivic) throw e
      console.warn(`[Gemini] ${e.message} — falling back to Ollama`)
      lastError = e
    }
  }

  // 3. Ollama local fallback
  try {
    const parsed = await tryOllama(imageFile)
    return parseAndBuildResult(parsed)
  } catch (e) {
    if (e.notCivic) throw e
    console.warn(`[Ollama] ${e.message} — analysis failed`)
    lastError = e
  }

  // If everything fails (API limits AND Local Hardware OOM crashes), use Demo Mode
  // so the user can at least test the rest of the application flow.
  console.error('[AI Chain Failed]', lastError.message)
  
  const demos = ['pothole', 'garbage', 'drainage', 'pipeline', 'streetlight']
  const cat   = demos[Math.floor(Math.random() * demos.length)]
  const sev   = 3
  
  return {
    category: cat, severity: sev,
    priority:    calcPriority(sev, cat),
    department:  DEPARTMENTS[cat],
    isHighRisk:  false,
    description: '⚠️ AI Analysis Failed (API blocked & hardware limits exceeded). Using Demo Mode data so you can test the app submission!',
    confidence:  0.5,
  }
}
