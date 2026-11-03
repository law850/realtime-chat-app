# 💬 TubongeApp

**TubongeApp** is a modern, real-time chat application built with React, Django, and WebSockets. It offers a seamless, WhatsApp-style messaging experience with a sleek dark/light mode UI, direct messaging, profile pictures, and read receipts.

![TubongeApp Logo](https://img.shields.io/badge/TubongeApp-Chat-purple?style=for-the-badge&logo=whatsapp)

## 🚀 Live Demo
*   **Frontend:** [https://tubonge-app.vercel.app](https://tubonge-app.vercel.app)
*   **Backend API:** [https://tubonge-backend-0d7b.onrender.com](https://tubonge-backend-0d7b.onrender.com)

---

## ✨ Features

*   **Real-Time Messaging:** Instant message delivery using Django Channels and WebSockets.
*   **Direct Messaging (DMs):** Private 1-on-1 conversations with strict validation (no ghost accounts).
*   **Message Management:** 
    *   ✏️ **Edit** sent messages.
    *   🗑️ **Delete for Me** (hides the message only on your screen).
    *   🚫 **Unsend for Everyone** (replaces the message with a "This message was unsent" notice for both users).
*   **Read Receipts:** Double blue checkmarks (✓✓) when the other user reads your message.
*   **Emoji Picker:** A built-in emoji menu for quick reactions.
*   **Profile Pictures:** Upload custom avatars (stored locally as Base64 for speed and reliability).
*   **Dark/Light Mode:** A beautiful theme toggle that saves your preference.
*   **Unread Badges:** Red notification dots for rooms with new messages.
*   **Mobile-First Layout:** A responsive, WhatsApp-style vertical chat list that adapts perfectly to mobile screens.
*   **Typing Indicators:** See when the other person is typing.
*   **Online Presence:** Live tracking of who is currently in the room.
*   **Secure Auth:** Registration, Login, and Password Reset using security questions.

---

## 🛠️ Tech Stack

### Frontend
*   **React.js** (Vite)
*   **Tailwind CSS** (Styling)
*   **WebSocket API** (Real-time communication)
*   **Vercel** (Hosting)

### Backend
*   **Django** & **Django REST Framework**
*   **Django Channels** (WebSockets)
*   **Redis** (Channel Layer for WebSockets)
*   **PostgreSQL** (Neon Database)
*   **Render** (Hosting)

---

## 📂 Project Structure

```text
realtime-chat/
│
├── backend/ (Django)
│   ├── chatcore/          # Main project settings
│   ├── chat/              # Chat app (models, consumers, views)
│   ├── manage.py
│   ├── build.sh           # Render build script
│   └── requirements.txt
│
└── frontend/ (React)
    ├── src/
    │   ├── App.jsx        # Main application logic
    │   ├── index.css      # Global styles
    │   └── main.jsx
    ├── package.json
    └── vite.config.js
🚀 Local Development Setup
Prerequisites
Python 3.10+

Node.js 18+

Redis (optional, but recommended for local WebSockets)

1. Backend Setup (Django)
bash
# Clone the repository
git clone https://github.com/your-username/realtime-chat-app.git
cd realtime-chat-app

# Create and activate virtual environment
python -m venv venv
# Windows:
venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run migrations
python manage.py makemigrations
python manage.py migrate

# Start the server
python manage.py runserver
The backend will run on http://127.0.0.1:8000

2. Frontend Setup (React)
bash
# Open a new terminal and navigate to the frontend folder
cd frontend

# Install dependencies
npm install

# Start the development server
npm run dev
The frontend will run on http://localhost:5173

🌍 Deployment Guide
Backend (Render)
Create a Web Service on Render.

Connect your GitHub repository.

Set Build Command to ./build.sh.

Set Start Command to daphne -b 0.0.0.0 -p $PORT chatcore.asgi:application.

Add Environment Variables:

SECRET_KEY: (Your Django secret key)

DATABASE_URL: (Neon PostgreSQL URL)

REDIS_URL: (Render Key Value / Redis URL)

DEBUG: False

ALLOWED_HOSTS: your-backend-url.onrender.com

Frontend (Vercel)
Create a New Project on Vercel.

Import your GitHub repository.

Set Root Directory to frontend.

Update your App.jsx API URLs to point to your live Render backend (e.g., https://your-backend-url.onrender.com).

Deploy!

🤝 Contributing
Contributions, issues, and feature requests are welcome! Feel free to check the issues page.

📝 License
This project is licensed under the MIT License.

Built with ❤️ by Simiyu Lawrence
contact 0748820547