# 🏠 AI Powered Family Connect — Backend

A production-ready Node.js + TypeScript backend for a caring family safety web app.  
Real-time alerts, AI health assistance, medicine tracking, SOS, location sharing and more — all in one.

---

## 🧰 Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 18+ |
| Framework | Express.js + TypeScript |
| Database | MongoDB + Mongoose |
| Auth | JWT + bcryptjs |
| Real-time | Socket.io |
| AI | Google Gemini API |
| File Upload | Multer |
| Scheduling | node-cron |
| Security | Helmet + CORS + Rate Limiting |

---

## ✨ Features (22 total)

1. JWT Authentication (register / login / refresh)
2. Family Linking (invite by email or code)
3. Medicine CRUD + Compliance Tracking
4. Doctor Slip Scanner (Gemini Vision)
5. Refill Guardian (low stock alerts)
6. Injury Photo Analyzer (Gemini Vision)
7. One-Tap SOS (real-time Socket.io)
8. Smart Fall & Posture Sentinel
9. Facial Mood Mirror (Gemini Vision)
10. Voice Emotion Guardian (Gemini Audio)
11. Mood Compass (AI activity suggestions)
12. Emotion Trend Forecaster
13. Recipe Suggester (mood-aware)
14. Medicine Interaction Checker
15. Personalized Sleep Story Generator
16. AI Memory Companion (life stories)
17. Smart Chatbot (context-aware)
18. Real-time Family Group Chat
19. Real-time Location Sharing
20. Daily Check-in System
21. Family Event & Expense Tracker
22. Game Score + Video Call Logger

---

## 🚀 Run Locally

### 1. Clone & Install

```bash
git clone https://github.com/your-username/ai-family-connect-backend.git
cd ai-family-connect-backend
npm install
```

### 2. Environment Variables

```bash
cp .env.example .env
```

Fill in your `.env`:

```env
NODE_ENV=development
PORT=5000
CLIENT_URL=http://localhost:3000

MONGO_URI=mongodb://localhost:27017/ai_family_connect

JWT_SECRET=your_super_secret_key_min_32_chars
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=another_secret_for_refresh
JWT_REFRESH_EXPIRES_IN=30d

GEMINI_API_KEY=your_google_gemini_api_key
```

Get your Gemini API key free at: https://aistudio.google.com/app/apikey

### 3. Start Development Server

```bash
npm run dev
```

Server starts at `http://localhost:5000`  
Socket.io at `ws://localhost:5000`

---

## 🔌 Connect React Frontend

Install Socket.io client in your React app:

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

// Listen for SOS alerts
socket.on("sos:alert", (data) => {
  alert(`🆘 ${data.message}`);
});

// Listen for medicine reminders
socket.on("medicine:reminder", (data) => {
  showNotification(data.message);
});

// Send a chat message
socket.emit("chat:send", {
  familyId: "your_family_id",
  content: "Hello family!",
});
```

Set your React `.env`:

```env
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_SOCKET_URL=http://localhost:5000
```

---

## ☁️ Deploy on Render

1. Push your code to GitHub.
2. Go to [render.com](https://render.com) → **New Web Service**.
3. Connect your repo and set:
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm start`
4. Add all environment variables from `.env` in the Render dashboard.
5. Set `NODE_ENV=production` and use your MongoDB Atlas URI in `MONGO_URI_PROD`.

## ☁️ Deploy on Railway

1. Go to [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub**.
2. Add a **MongoDB** plugin from the Railway dashboard (auto-sets `MONGO_URL`).
3. Add all other environment variables in **Variables** tab.
4. Railway auto-detects `npm start` from `package.json`.

---

## 📡 API Base URL

```
http://localhost:5000/api
```

| Route Group | Base Path |
|---|---|
| Auth | `/api/auth` |
| Family | `/api/family` |
| Medicine | `/api/medicine` |
| Safety / SOS | `/api/safety`, `/api/sos` |
| AI Features | `/api/ai` |
| Chat | `/api/chat` |
| Location | `/api/location` |
| Check-in | `/api/checkin` |
| Events | `/api/events` |
| Notifications | `/api/notifications` |
| Admin | `/api/admin` |

---

## 🔒 Rate Limits

| Endpoint Group | Limit |
|---|---|
| General API | 200 req / 15 min |
| Auth (login/register) | 10 req / 15 min |
| AI endpoints | 30 req / 10 min |
| SOS trigger | 5 req / 1 min |
| File uploads | 20 req / 1 hour |

---

## 📁 Project Structure (Key Files)

```
src/
├── app.ts              # Express app factory
├── server.ts           # HTTP + Socket.io entry point
├── config/             # DB, Socket, Gemini config
├── controllers/        # Route handlers
├── models/             # Mongoose schemas
├── routes/             # Express routers
├── sockets/            # Socket.io event handlers
├── jobs/               # node-cron scheduled tasks
├── helpers/            # Gemini AI prompt helpers
├── middleware/         # Auth, rate limit, upload
├── utils/              # ApiResponse, AppError, i18n
└── types/              # TypeScript declarations
```

---

## 🛠️ Scripts

```bash
npm run dev      # Development with hot reload (nodemon)
npm run build    # Compile TypeScript → dist/
npm start        # Run compiled production build
npm run lint     # TypeScript type check
npm run clean    # Remove dist/ folder
```

---

## 📝 License

MIT © 2024 AI Family Connect
