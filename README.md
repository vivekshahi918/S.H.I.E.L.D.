# 🛡️ S.H.I.E.L.D.  
### Secure Heuristic Intelligent Email Logging & Defense

**S.H.I.E.L.D.** is an enterprise-grade **Email Archiving & Analytics Platform** powered by Generative AI.  
It automates Gmail backup, categorizes mail using AI, detects sensitive-data leaks (DLP), and provides encrypted, compliant storage with advanced analytics.

🚀 **Live Demo:** https://s-h-i-e-l-d-mu.vercel.app  

---

## 🌟 Key Features

### 🧠 AI-Powered Intelligence (Gemini 1.5 Flash)
- Smart AI summaries for long email threads  
- Sentiment classification (Positive / Neutral / Negative)  
- Auto-categorization: Work, Finance, Personal, Promotions  
- Priority email tagging (Urgent / Important)  
- Attachment classifier: Invoices, Resumes, Media, etc.

### 🔒 Security & Compliance
- **AES-256 End-to-End Encryption** — even DB admins can't read emails  
- **DLP Engine** — detects credit cards, passwords, tokens  
- **Audit Logs** — every action tracked for compliance  
- **Secure Google OAuth 2.0** + HttpOnly cookies

### ⚡ Performance & Usability
- Cron-based auto-sync every 5 minutes  
- Real-time updates using smart polling  
- Full-text search on subject, sender, tags  
- PDF and CSV export for compliance

---

## 🏗️ System Architecture

### 1️⃣ Frontend (Vite + React)
- Tailwind CSS  
- Recharts for analytics  
- Client-side PDF generation  
- Deployed on **Vercel**

### 2️⃣ Backend (NestJS)
- Google OAuth strategies  
- Gmail API integration  
- AI processing (Gemini 1.5 Flash)  
- Cron jobs for email sync  
- Deployed on **Render**

### 3️⃣ Database (MongoDB Atlas)
- Encrypted emails  
- Audit logs  
- Text indexes  

---

## 🛠️ Tech Stack

| Component | Technology |
|----------|------------|
| **Frontend** | React + TS, Vite, Tailwind, Lucide |
| **Backend** | NestJS, Express, Passport.js |
| **Database** | MongoDB Atlas (Mongoose) |
| **AI Engine** | Google Gemini 1.5 Flash |
| **Security** | AES-256, Crypto, Helmet |
| **Deployment** | Vercel, Render |

---

<!-- ## 📸 Screenshots

| Dashboard | AI Summary + DLP Warning |
|----------|---------------------------|
| ![](https://via.placeholder.com/400x200?text=Analytics+Dashboard) | ![](https://via.placeholder.com/400x200?text=DLP+Warning) |

--- -->

# 🚀 Getting Started (Local Development)

## 📦 Prerequisites
- Node.js (v18+)  
- MongoDB URI  
- Google OAuth Credentials  
- Gemini API Key  

---

## 1️⃣ Clone the Repository

```bash
git clone https://github.com/YOUR_USERNAME/email-archiver-final.git
cd email-archiver-final
```

## 🖥️ 2️⃣ Backend Setup

### Install dependencies
```bash
cd backend
npm install
```

## 💻 3️⃣ Frontend Setup

### Install dependencies
```bash
cd ../frontend
npm install
```

### Create .env
```bash
VITE_API_URL=http://localhost:3000
```

### Start frontend
```bash
npm run dev
```    

## 🛡️ Security Measures

- AES-256 encrypted email storage  
- Sanitized AI output  
- Strict access control  
- Minimal OAuth scopes  

---

## 🔮 Future Roadmap

- Outlook + Yahoo support  
- ElasticSearch integration  
- Legal Hold Mode for litigation compliance  

---

## 👤 Author  
**Vivek Shahi**
