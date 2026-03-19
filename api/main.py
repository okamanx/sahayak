"""
FastAPI AI Backend for Sahayak — Civic Issue Classifier
Uses Google Gemini Vision API for image classification.
"""
import os, base64, io
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image
import google.generativeai as genai
from models import ClassifyResponse
from classifier import classify_image
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="Sahayak AI API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure Gemini
GEMINI_KEY = os.getenv("GEMINI_API_KEY", "")
if GEMINI_KEY:
    genai.configure(api_key=GEMINI_KEY)


@app.get("/")
@app.head("/")
def root():
    return {"status": "ok", "service": "Sahayak AI Classifier"}


@app.get("/favicon.ico")
def favicon():
    return {}


@app.get("/health")
def health():
    return {"status": "healthy"}


@app.post("/classify", response_model=ClassifyResponse)
async def classify(file: UploadFile = File(...)):
    """
    Classify a civic issue from an uploaded image.
    Returns category, severity, priority, department, isHighRisk, description.
    """
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")
    
    try:
        contents = await file.read()
        image = Image.open(io.BytesIO(contents)).convert("RGB")
        result = await classify_image(image, contents, file.content_type)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
