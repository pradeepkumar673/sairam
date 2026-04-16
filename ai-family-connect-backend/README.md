# 🏠 AI Powered Family Connect — Backend v2.0

A production‑ready Node.js + TypeScript backend for a caring family safety web app.  
22 complete features including real‑time alerts, AI health assistance, medicine tracking, SOS, location sharing, mood analysis, and more.

## 🧰 Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 18+ |
| Framework | Express.js + TypeScript |
| Database | MongoDB + Mongoose |
| Auth | JWT + bcryptjs |
| Real‑time | Socket.io |
| AI | Google Gemini 1.5 Flash |
| File Upload | Multer |
| Scheduling | node‑cron |
| Security | Helmet + CORS |

## ✨ 22 Features (Fully Implemented)

### Safety & Health
1. Smart Fall & Posture Sentinel  
2. Injury Photo Analyzer  
3. One‑Tap SOS  
4. Medicine Reminder + Compliance  
5. Doctor Slip Scanner  
6. Refill Guardian  
7. Medicine Interaction Checker  

### Mood & Emotional AI
8. Facial Mood Mirror  
9. Voice Emotion Guardian  
10. Mood Compass  
11. Emotion Trend Forecaster  
12. AI Memory Companion  
13. Personalized Sleep Story Generator  
14. Cognitive Memory Game Corner  

### Daily Life
15. Smart Chatbot (Saathi)  
16. Recipe Suggester  
17. Weather‑Health Nudge  

### Family Connection
18. Inbuilt Video Call Logging  
19. Family Chat Group  
20. Family Dashboard  

### Accessibility
21. Multi‑Language Support (English, Tamil, Hindi)  
22. Voice‑First Support  

## 🚀 Run Locally

### 1. Clone & Install
```bash
git clone <repo-url>
cd ai-family-connect-backend
npm install
```

### 2. Environment Variables
```bash
cp .env.example .env
```
Fill in your `.env` with actual values (especially `GEMINI_API_KEY`).

### 3. Start Development Server
```bash
npm run dev
```
Server runs at `http://localhost:5000`.

## 🔌 Connect React Frontend

Install Socket.io client:
```bash
npm install socket.io-client
```

Connect with auth token:
```typescript
import { io } from "socket.io-client";

const socket = io("http://localhost:5000", {
  auth: { token: `Bearer ${localStorage.getItem("token")}` },
  transports: ["websocket"],
});

socket.on("connect", () => console.log("Connected:", socket.id));
socket.on("sos:alert", (data) => alert(`🆘 ${data.message}`));
```

## 📡 API Base URL

```
http://localhost:5000/api
```

| Group | Base Path |
|---|---|
| Auth | `/api/auth` |
| Family | `/api/family` |
| Medicine | `/api/medicine` |
| Safety | `/api/safety` |
| AI Features | `/api/ai` |

## ☁️ Deploy on Render / Railway

1. Set environment variables in the dashboard.
2. Build command: `npm install && npm run build`
3. Start command: `npm start`

## 📝 License

MIT