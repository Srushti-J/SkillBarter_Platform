# 🤝 SkillBarter Platform v2

> **An AI-powered Skill Exchange Platform** where users can teach what they know and learn what they need through intelligent skill matching, real-time communication, session scheduling, and a reputation-based learning ecosystem.

![React](https://img.shields.io/badge/Frontend-React-61DAFB?logo=react)
![Node.js](https://img.shields.io/badge/Backend-Node.js-339933?logo=node.js)
![Express](https://img.shields.io/badge/Framework-Express-000000?logo=express)
![MongoDB](https://img.shields.io/badge/Database-MongoDB-47A248?logo=mongodb)
![FastAPI](https://img.shields.io/badge/AI-FastAPI-009688?logo=fastapi)
![Socket.IO](https://img.shields.io/badge/Realtime-Socket.IO-010101?logo=socketdotio)
![JWT](https://img.shields.io/badge/Auth-JWT-orange)

---

## 📖 Overview

SkillBarter Platform is a full-stack web application that enables users to exchange skills without monetary transactions. Users create profiles showcasing the skills they can teach and the skills they wish to learn. An AI-powered recommendation engine intelligently matches compatible users, while real-time chat and notifications make collaboration seamless.

Unlike traditional learning platforms, SkillBarter focuses on **peer-to-peer knowledge exchange**, making learning accessible, collaborative, and community-driven.

---

# ✨ Features

### 🔐 Authentication

* Secure user registration and login
* JWT-based authentication
* Protected routes
* Persistent login sessions

### 👤 User Profile

* Create and edit profile
* Upload profile picture
* Add skills offered
* Add skills wanted
* Set proficiency levels
* Profile completeness validation

### 🤖 AI Skill Matching

* AI-powered user recommendations
* Intelligent compatibility scoring
* Filters incomplete profiles
* Returns only real MongoDB users
* Automatic fallback scoring if AI service is unavailable

### 🤝 Skill Requests

* Send barter requests
* Accept or reject requests
* Instant request notifications
* Request history

### 💬 Real-Time Chat

* One-to-one messaging
* Socket.IO powered
* User ID based rooms
* Typing indicators
* Online/offline status
* Conversation history

### 📅 Session Management

* Schedule learning sessions
* Complete sessions
* Cancel sessions
* Track session history

### ⭐ Reviews & Reputation

* Rate learning partners
* Leave reviews
* Reputation score calculation
* Community trust system

### 🔔 Live Notifications

* New barter requests
* Request accepted/rejected
* New messages
* Online users
* Typing indicators

---

# 🚀 What's New in Version 2

| Previous Issue                     | Fixed in v2                                |
| ---------------------------------- | ------------------------------------------ |
| Dummy users shown in matches       | Only real MongoDB users are matched        |
| Anyone could chat                  | Chat allowed only after request acceptance |
| Socket IDs caused multi-tab issues | User ID based rooms implemented            |
| No real-time notifications         | Live notifications using Socket.IO         |
| No profile image upload            | Multer image upload added                  |
| No typing indicator                | Typing events implemented                  |
| No online/offline status           | Live user presence tracking                |
| Empty profiles appeared in matches | Profile completeness validation added      |

---

# 🏗️ Tech Stack

## Frontend

* React.js
* React Router
* Axios
* Context API
* CSS

## Backend

* Node.js
* Express.js
* MongoDB
* Mongoose
* JWT Authentication
* Multer
* Socket.IO

## AI Module

* Python
* FastAPI
* Scikit-learn
* TF-IDF Vectorizer
* Cosine Similarity

---

# 📂 Project Structure

```text
SkillBarter-Platform/
│
├── backend/
│   ├── controllers/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── uploads/
│   ├── server.js
│   └── package.json
│
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   ├── context/
│   │   ├── pages/
│   │   ├── services/
│   │   └── App.jsx
│   └── package.json
│
├── ai_module/
│   ├── main.py
│   └── requirements.txt
│
├── README.md
└── .gitignore
```

---

# 🔄 End-to-End Workflow

1. User registers and logs in.
2. User completes profile by adding skills offered and skills wanted.
3. AI recommendation engine finds the best learning partners.
4. User sends a barter request.
5. Receiver gets an instant notification.
6. Receiver accepts the request.
7. Chat becomes available automatically.
8. Users schedule learning sessions.
9. Session is completed.
10. Both users leave ratings and reviews.
11. Reputation score is updated.

---

# ⚡ Real-Time Socket.IO Events

| Event                    | Direction                | Description                    |
| ------------------------ | ------------------------ | ------------------------------ |
| `user_online`            | Client → Server          | Join personal room             |
| `new_request`            | Server → Client          | New barter request             |
| `request_status_changed` | Server → Client          | Accepted/Rejected notification |
| `send_message`           | Client → Server          | Send message                   |
| `receive_message`        | Server → Client          | Receive message                |
| `typing_start`           | Client → Server → Client | Typing started                 |
| `typing_stop`            | Client → Server → Client | Typing stopped                 |
| `online_users`           | Server → All             | Online users list              |

---

# ⚙️ Installation

## 1️⃣ Clone Repository

```bash
git clone https://github.com/yourusername/SkillBarter-Platform.git

cd SkillBarter-Platform
```

---

## 2️⃣ Backend

```bash
cd backend

npm install

npm run dev
```

Runs on:

```
http://localhost:5000
```

---

## 3️⃣ Frontend

```bash
cd frontend

npm install

npm start
```

Runs on:

```
http://localhost:3000
```

---

## 4️⃣ AI Module (Optional)

```bash
cd ai_module

python -m venv venv
```

### Windows

```bash
venv\Scripts\activate
```

### Linux / macOS

```bash
source venv/bin/activate
```

Install dependencies

```bash
pip install -r requirements.txt
```

Start FastAPI

```bash
uvicorn main:app --reload --port 8000
```

---

# 🔑 Environment Variables

## Backend (.env)

```env
MONGO_URI=mongodb://localhost:27017/skillbarter

JWT_SECRET=your_secret_key

CLIENT_URL=http://localhost:3000

AI_SERVICE_URL=http://localhost:8000/recommend

PORT=5000

NODE_ENV=development
```

---

## Frontend (.env)

```env
REACT_APP_API_URL=http://localhost:5000/api

REACT_APP_SOCKET_URL=http://localhost:5000
```

---

# 🤖 AI Recommendation Engine

The AI module recommends compatible learning partners using Natural Language Processing.

### Workflow

* User enters skills offered.
* User enters skills wanted.
* Skills are converted into TF-IDF vectors.
* Cosine similarity is calculated.
* Best matching users are ranked.
* Recommendations are returned to the frontend.

If the AI service is unavailable, the backend automatically falls back to rule-based scoring.

---

## 📸 Screenshots

### 🏠 Dashboard

![Dashboard](sb/screenshots/dashboard.png)

---

### 🤖 AI Matches

![AI Matches](sb/screenshots/ai-matches.png)

---

### 📚 Skills

![Skills](sb/screenshots/skills.png)

---

### 📤 Send Barter Request

![Send Barter Request](sb/screenshots/send-barter-request.png)

---

### 🤝 Barter Request

![Barter Request](sb/screenshots/barter-request.png)

---

### 💬 Chat Interface

![Chat Interface](sb/screenshots/chat-interface.png)

---

### 📅 Schedule Session

![Schedule Session](sb/screenshots/schedule-session.png)

---

### 👤 My Profile

![My Profile](sb/screenshots/my-profile.png)

---

### 🏆 Badges & Leaderboard

![Badges and Leaderboard](sb/screenshots/badges-and-leaderboard.png)
# 🛣️ Future Enhancements

* 🎥 Video calling
* 🤖 LLM-powered recommendations
* 📅 Google Calendar integration
* 📧 Email notifications
* 📱 Mobile application
* 🏆 Achievement badges
* 🌍 Multi-language support
* 📊 Analytics dashboard
* 🔍 Semantic search using Sentence Transformers

---

# 🤝 Contributing

Contributions are welcome.

1. Fork the repository.
2. Create a new branch.

```bash
git checkout -b feature-name
```

3. Commit changes.

```bash
git commit -m "Added new feature"
```

4. Push to GitHub.

```bash
git push origin feature-name
```

5. Open a Pull Request.

---

# 📜 License

This project is licensed under the MIT License.

---

# 👩‍💻 Author

**Srushti Joshi**

Information Science & Engineering Student

Passionate about AI, Machine Learning, Full-Stack Development, and Building Intelligent Applications.

**GitHub:** https://github.com/Srushti-J

**LinkedIn:** https://www.linkedin.com/in/srushti-joshi

---

⭐ If you found this project useful, consider giving it a **Star** on GitHub!
