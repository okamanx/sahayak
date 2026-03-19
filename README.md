# 🏛️ Sahayak — Civic Issue Reporter

**Sahayak** (meaning *Helper*) is a high-performance, AI-powered civic engagement platform designed to bridge the gap between citizens, volunteers, and municipal administrators. Using advanced image classification and geo-spatial verification, Sahayak simplifies reporting and resolving urban issues like potholes, garbage, and drainage.

---

## ✨ Core Pillars

### 📱 Citizen Reporting
- **AI-Powered Wizard**: High-speed image classification (Gemini/Grok) automatically identifies issues and assigns severity.
- **Voice Reports**: Support for voice-recorded complaints for maximum accessibility.
- **PWA Ready**: Works offline and can be installed as a native app on iOS and Android.

### 🛡️ Volunteer Executive System
- **Premium Dashboard**: A sophisticated, light-themed "Command Center" for ground volunteers.
- **Location Guard**: GPS-verified resolution—volunteers must be within 150m of a site to mark it as resolved.
- **Identity Registry**: Comprehensive volunteer profiles tracking operational sectors and status.

### 📊 Admin Command Centre
- **Interactive Analytics**: Dynamic charts visualizing issue categories and growth.
- **Priority Backlog**: Smart prioritization that highlights "Critical" issues for immediate action.
- **Geo-Spatial Map**: Real-time view of all reported issues across the city using Mapbox.

---

## 🚀 Tech Stack

- **Frontend**: Vite + React + Tailwind CSS
- **Backend**: FastAPI (Python)
- **Database/Auth**: Supabase
- **Visual AI**: Google Gemini Pro Vision / xAI Grok
- **Maps**: Mapbox GL JS / Leaflet
- **Animations**: Framer Motion

---

## 🛠️ Quick Start

### 1. Prerequisites
- Node.js (v18+)
- Python (v3.10+)
- Supabase Project

### 2. Installation
```bash
# Clone the repository
git clone https://github.com/okamanx/sahayak.git
cd sahayak

# Install Frontend dependencies
npm install

# Install Backend dependencies
cd api
pip install -r requirements.txt
```

### 3. Environment Setup
Create a `.env` file in the root with your keys:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_GEMINI_API_KEY`
- `VITE_MAPBOX_TOKEN`

### 4. Running the Project
```bash
# Start Backend (Term 1)
cd api
uvicorn main:app --reload --port 8000

# Start Frontend (Term 2)
npm run dev
```

---

## 🌐 Mobile Access
To test on a physical phone:
1. Ensure PC and Phone are on the same Wi-Fi.
2. Update `VITE_API_URL` in `.env` to your PC's local IP (e.g., `http://192.168.1.5:8000`).
3. Open `https://[YOUR_IP]:5173` on your phone browser.

---

## ⚖️ License
Created for the **Civic Tech Initiative**. Authorized use only.
