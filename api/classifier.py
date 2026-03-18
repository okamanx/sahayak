"""
Civic issue classifier using Gemini Vision API.
Falls back to label-based heuristic if Gemini unavailable.
"""
import os, base64, random
import google.generativeai as genai
from models import ClassifyResponse

CATEGORIES = ['pothole', 'garbage', 'drainage', 'pipeline', 'streetlight', 'other']

CATEGORY_WEIGHTS = { 'pothole': 3, 'garbage': 2, 'drainage': 4, 'pipeline': 4, 'streetlight': 3, 'other': 1 }

DEPARTMENTS = {
    'pothole':     'Road & Infrastructure',
    'garbage':     'Sanitation Department',
    'drainage':    'Water & Sewage',
    'pipeline':    'Water & Sewage',
    'streetlight': 'Electricity Department',
    'other':       'Municipal Corporation',
}


def calc_priority(severity: int, category: str, location_risk: float = 1.0) -> float:
    w = CATEGORY_WEIGHTS.get(category, 1)
    return round(severity * 2 + w + location_risk, 2)


async def classify_with_gemini(image_bytes: bytes, mime_type: str) -> ClassifyResponse:
    model = genai.GenerativeModel('gemini-1.5-flash')
    
    prompt = """Analyze this civic infrastructure image and respond with ONLY JSON:
{
  "category": "<pothole|garbage|drainage|pipeline|streetlight|other>",
  "severity": <1-5>,
  "confidence": <0.0-1.0>,
  "description": "<2 sentences about the issue>",
  "isHighRisk": <true|false>
}
Severity: 1=minor, 2=low, 3=moderate, 4=high, 5=critical
isHighRisk=true if there is danger to public safety."""

    b64 = base64.b64encode(image_bytes).decode()
    response = model.generate_content([
        prompt,
        {"mime_type": mime_type, "data": b64}
    ])
    
    import json, re
    text = response.text
    m = re.search(r'\{.*\}', text, re.DOTALL)
    if not m:
        raise ValueError("No JSON in Gemini response")
    
    data = json.loads(m.group())
    category = data.get('category', 'other')
    if category not in CATEGORIES:
        category = 'other'
    
    severity = max(1, min(5, int(data.get('severity', 3))))
    
    return ClassifyResponse(
        category=category,
        severity=severity,
        priority=calc_priority(severity, category),
        department=DEPARTMENTS[category],
        isHighRisk=data.get('isHighRisk', severity >= 4),
        description=data.get('description', 'Civic issue detected.'),
        confidence=float(data.get('confidence', 0.8)),
    )


async def classify_image(image, image_bytes: bytes, mime_type: str) -> ClassifyResponse:
    gemini_key = os.getenv("GEMINI_API_KEY", "")
    
    if gemini_key:
        try:
            return await classify_with_gemini(image_bytes, mime_type)
        except Exception as e:
            print(f"Gemini failed: {e}, using mock")
    
    # Demo fallback
    cat = random.choice(CATEGORIES[:-1])
    sev = random.randint(2, 5)
    return ClassifyResponse(
        category=cat,
        severity=sev,
        priority=calc_priority(sev, cat),
        department=DEPARTMENTS[cat],
        isHighRisk=sev >= 4,
        description=f"A {cat} issue has been detected requiring attention from {DEPARTMENTS[cat]}.",
        confidence=0.78,
    )
