# ⚡ SkillBarter Platform v2 — Production Ready

> Real users, real-time interactions, no dummy data.

## What was fixed in v2

| Issue | Fix |
|-------|-----|
| Matches showed dummy/hardcoded users | Matches now come **only from MongoDB**, filtered to users with complete profiles |
| Any user could chat with anyone | Chat only works after a **barter request is accepted** |
| Socket.io used socketId (breaks with multiple tabs) | Now uses **userId-based rooms** — `socket.join(userId)` |
| No real-time notifications | `new_request`, `request_status_changed`, `receive_message` events all emit to userId rooms |
| No profile image upload | **Multer** upload at `POST /api/profile/upload-image` |
| No typing indicator | `typing_start` / `typing_stop` Socket.io events |
| No online/offline status | `online_users` broadcast + `GET /api/users/:id/status` |
| No profile completeness gate | Users with empty skills are excluded from matches and cannot send requests |

---

## Quick Start

### 1. Backend
```bash
cd backend
cp .env.example .env      # edit MONGO_URI and JWT_SECRET
npm install
npm run dev               # http://localhost:5000
```

### 2. Frontend
```bash
cd frontend
npm install
npm start                 # http://localhost:3000
```

### 3. AI Engine (optional — fallback scoring used if down)
```bash
cd ai_module
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --port 8000 --reload
```

---

## Folder Structure

```
skillbarter-v2/
├── backend/
│   ├── controllers/
│   │   ├── authController.js       Register, login (returns full profile)
│   │   ├── profileController.js    Get/update profile + image upload
│   │   ├── matchController.js      Real users only, profile completeness filter
│   │   ├── requestController.js    Send/accept/reject + real-time notifications
│   │   ├── chatController.js       Messages (accepted partners only) + conversations
│   │   ├── otherControllers.js     Skill, Session, Review controllers
│   │   └── userController.js       Online status endpoints
│   ├── middleware/
│   │   ├── authMiddleware.js       JWT protect
│   │   └── uploadMiddleware.js     Multer image upload (5MB, images only)
│   ├── models/
│   │   ├── User.js                 + profileImage, lastSeen, isProfileComplete virtual
│   │   └── models.js               SkillRequest, Message, Session, Review
│   ├── routes/                     One file per resource
│   ├── uploads/                    Profile images stored here (auto-created)
│   ├── server.js                   userId rooms, typing events, all routes
│   ├── package.json
│   └── .env.example
│
├── frontend/
│   └── src/
│       ├── App.jsx                 All routes
│       ├── context/AuthContext.jsx Auth state + single socket connection
│       ├── services/api.js         All Axios calls including image upload
│       ├── components/Layout/
│       │   ├── Sidebar.jsx         Nav + live notification badges
│       │   └── Topbar.jsx          Page title + profile completion warning
│       ├── pages/
│       │   ├── Login.jsx
│       │   ├── Register.jsx
│       │   ├── Dashboard.jsx       Real data, no hardcoded anything
│       │   ├── Matches.jsx         Real users, online indicators, request modal
│       │   ├── Requests.jsx        Accept/reject + real-time refresh + schedule
│       │   ├── Chat.jsx            Conversations, typing indicator, online status
│       │   ├── Profile.jsx         Image upload, skill management, reviews
│       │   └── Sessions.jsx        Complete/cancel/review
│       └── styles/global.css       Complete dark theme design system
│
└── ai_module/
    ├── main.py                     FastAPI + TF-IDF + cosine similarity
    └── requirements.txt
```

---

## End-to-End Flow

1. **User A** registers → redirected to Profile → adds skills
2. **User B** registers → same flow
3. **User A** visits Matches → AI returns User B (and vice versa)
4. **User A** sends barter request → User B gets **instant notification** via Socket.io
5. **User B** accepts → User A gets **instant notification** via Socket.io
6. Both can now **chat in real-time** (typing indicators, online status)
7. After session: **review each other** → reputation score recalculated

---

## Socket.io Events

| Event | Direction | Description |
|-------|-----------|-------------|
| `user_online` | Client → Server | Join userId room on connect |
| `new_request` | Server → Receiver | New barter request received |
| `request_status_changed` | Server → Sender | Request accepted or rejected |
| `send_message` | Client → Server | Send a chat message |
| `receive_message` | Server → Receiver | Deliver chat message in real-time |
| `typing_start` | Client → Server → Receiver | Partner started typing |
| `typing_stop` | Client → Server → Receiver | Partner stopped typing |
| `online_users` | Server → All | Updated list of online user IDs |

---

## Environment Variables

### backend/.env
```
MONGO_URI=mongodb://localhost:27017/skillbarter
JWT_SECRET=your_secret_key_change_this
CLIENT_URL=http://localhost:3000
AI_SERVICE_URL=http://localhost:8000/recommend
PORT=5000
NODE_ENV=development
```

### frontend/.env
```
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_SOCKET_URL=http://localhost:5000
```
