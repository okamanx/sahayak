# 🚀 Deploying Sahayak on Render

Sahayak is a full-stack application (FastAPI + Vite). For the best performance and price on Render, we recommend deploying them as two separate services in one Blueprint.

---

## 🏗️ 1. The Blueprint Approach (Recommended)
You can deploy both parts at once by clicking **"New" → "Blueprint"** on Render and connecting your GitHub repository.

### Create `render.yaml` in your root:
```yaml
services:
  # 🐍 BACKEND (FastAPI)
  - type: web
    name: sahayak-backend
    env: python
    buildCommand: "cd api && pip install -r requirements.txt"
    startCommand: "cd api && uvicorn main:app --host 0.0.0.0 --port $PORT"
    envVars:
      - key: VITE_SUPABASE_URL
        sync: false
      - key: VITE_SUPABASE_ANON_KEY
        sync: false
      - key: VITE_GEMINI_API_KEY
        sync: false

  # ⚛️ FRONTEND (Vite-React)
  - type: static
    name: sahayak-frontend
    env: static
    buildCommand: "npm install && npm run build"
    publishPath: "./dist"
    envVars:
      - key: VITE_API_URL
        fromService:
          name: sahayak-backend
          type: web
          property: host
      - key: VITE_SUPABASE_URL
        sync: false
      - key: VITE_SUPABASE_ANON_KEY
        sync: false
```

---

## 🛠️ 2. Manual Deployment Steps

### Part A: Backend (Web Service)
1.  **New → Web Service** → Connect your Repo.
2.  **Root Directory**: `api`
3.  **Runtime**: `Python 3`
4.  **Build Command**: `pip install -r requirements.txt`
5.  **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
6.  **Environment Variables**: Add your `.env` keys (Supabase, Gemini, etc.).

### Part B: Frontend (Static Site)
1.  **New → Static Site** → Connect your Repo.
2.  **Build Command**: `npm install && npm run build`
3.  **Publish Directory**: `dist`
4.  **Environment Variables**: 
    - `VITE_API_URL`: Use your Render backend URL (e.g., `https://sahayak-backend.onrender.com`).
    - Add Supabase keys as well.

---

## ⚠️ Important Production Notes
1.  **CORS**: Ensure your FastAPI `main.py` allows your Render frontend URL in its CORS configuration.
2.  **Environment Variables**: In Vite, environment variables **must** start with `VITE_` to be bundled into the client code.
3.  **Sleep Mode**: If using the Free Tier, the backend will "sleep" after 15 mins of inactivity. The first request might be slow.
