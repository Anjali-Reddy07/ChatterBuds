# ChatterBuds 🎧

> **Real-Time, Two-Way Live Voice Translator for Paired Bluetooth Earbuds & Smartphones**

ChatterBuds enables two people speaking different languages to have fluid, natural, spoken conversations. Whether sitting face-to-face in a cafe or on a remote long-distance call, each speaker uses their own phone and Bluetooth earbuds: speech is transcribed in real-time, translated conversationally, and spoken directly into the partner's earbuds with acoustic **Echo-Guard** isolation.

---

## ⚡ Tech Stack

### Backend (`backend/`)
- **Runtime & Server:** Python 3.10+, FastAPI, Uvicorn, WebSockets
- **Speech-to-Text (STT):** Groq `whisper-large-v3-turbo` (sub-second ultra-fast transcription, auto-detect or ISO-hinted)
- **Conversational Translation:** Groq `llama-3.3-70b-versatile` (idiomatic spoken translation preserving tone)
- **Text-to-Speech (TTS):** Microsoft Edge-TTS (natural neural regional voices)
- **Room Coordination:** In-memory asynchronous `RoomManager` (max 2 participants per 4-digit room code with peer status events and ping/pong keep-alive)

### Mobile PWA (`mobile-app/`)
- **Framework:** Next.js (App Router, TypeScript, React 18/19)
- **Styling & UI:** Tailwind CSS, Lucide Icons, Mobile-first dark aesthetic (`max-w-md`)
- **PWA Capabilities:** Standalone mobile app (`manifest.json`, viewport-fit, mobile web app headers)
- **Instant Pairing:** Dynamic QR code generation (`QRCodeSVG`), 1-tap invite link copying, and native Web Share API
- **Audio Engine:**
  - **Auto-Listen (VAD):** Web Audio `AnalyserNode` with automatic 0.75s silence speech slicing
  - **Hold-to-Talk (PTT):** Instant push-to-record mode for loud environments
  - **Echo-Guard:** Automatic microphone suspension during incoming audio playback to prevent feedback loops

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- Python 3.10+
- Node.js 18+ and npm
- A [Groq API Key](https://console.groq.com)

---

### 2. Backend Setup (`backend/`)

1. Open a terminal and navigate to `backend/`:
   ```bash
   cd backend
   ```

2. Create and activate a Python virtual environment:
   ```bash
   # Windows
   python -m venv venv
   .\venv\Scripts\activate

   # macOS / Linux
   python3 -m venv venv
   source venv/bin/activate
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Configure environment variables:
   ```bash
   cp .env.example .env
   ```
   Edit `.env` and insert your Groq API key:
   ```env
   GROQ_API_KEY=gsk_your_actual_groq_api_key_here
   PORT=8000
   HOST=0.0.0.0
   ```

5. Start the FastAPI server:
   ```bash
   python main.py
   ```
   Verify the health endpoint in your browser or curl:
   ```bash
   curl http://localhost:8000/health
   # Returns: {"status": "healthy", "service": "ChatterBuds Voice Engine", ...}
   ```

---

### 3. Frontend Mobile App Setup (`mobile-app/`)

1. Open a second terminal and navigate to `mobile-app/`:
   ```bash
   cd mobile-app
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the Next.js development server:
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000` on your desktop or mobile browser.

---

## 📱 Mobile & Bluetooth Earbuds Testing Guide

Mobile browsers require **HTTPS** (and **WSS** for WebSockets) to grant microphone access. To test ChatterBuds with two real smartphones and Bluetooth earbuds:

### Option A: Local Tunnel (Recommended & Free)
1. In a new terminal, expose your local backend (port 8000):
   ```bash
   npx localtunnel --port 8000
   # Gives: https://chatterbuds-api.loca.lt
   ```
   Note down the WSS equivalent: `wss://chatterbuds-api.loca.lt/ws`

2. Expose your local Next.js frontend (port 3000):
   ```bash
   npx localtunnel --port 3000
   # Gives: https://chatterbuds-app.loca.lt
   ```

3. Open `https://chatterbuds-app.loca.lt` on **Phone A**:
   - In Settings (gear icon), set the WebSocket URL to `wss://chatterbuds-api.loca.lt/ws`.
   - Select your language (e.g. *Telugu*).
   - Click **Enter Room & Start Translating**.

4. On **Phone B**:
   - Scan the QR code displayed on Phone A's screen (or open the shared link `https://chatterbuds-app.loca.lt/?room=XXXX`).
   - Select your language (e.g. *English*).
   - In Settings, ensure the WebSocket URL is also pointed to `wss://chatterbuds-api.loca.lt/ws`.
   - Click **Enter Room**.

5. **Put in Bluetooth Earbuds**:
   - Speak in Telugu on Phone A -> Phone B's earbuds will auto-play the translated English audio instantly.
   - Speak in English on Phone B -> Phone A's earbuds will auto-play the translated Telugu audio.

---

## 🌐 Production Cloud Deployment

### 1. Deploy Backend on Render / Railway / Fly.io
- **Build Command:** `pip install -r requirements.txt`
- **Start Command:** `uvicorn main:app --host 0.0.0.0 --port $PORT`
- **Environment Variables:**
  - `GROQ_API_KEY`: `gsk_...`
- Render automatically provisions an HTTPS/WSS domain: `https://your-app.onrender.com`.

### 2. Deploy Frontend on Vercel
1. Link the `mobile-app/` directory as the Root Directory in Vercel.
2. Add the environment variable:
   - `NEXT_PUBLIC_WS_URL`: `wss://your-app.onrender.com/ws`
3. Deploy! Vercel builds the Next.js PWA with zero configuration.

---

## 🛡️ Echo-Guard Architecture

When using open speakers or high-volume earbuds, a microphone might pick up the partner's incoming translated audio and echo it back.
ChatterBuds solves this via **Echo-Guard**:
- When the incoming message delivers audio bytes, `isPlaying` is set to `true`.
- The Web Audio VAD loop suspends speech detection during playback.
- On the HTML5 Audio `onended` event, the microphone un-mutes within milliseconds, allowing instantaneous natural reply.

---

## 📄 License
MIT
