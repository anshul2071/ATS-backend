# NEXCRUIT Backend

A robust, scalable RESTful API for the Application Tracking System (ATS), implementing end-to-end candidate management—from onboarding and resume parsing through assessments, interviews, offers, and background checks.



---

## 📋 Table of Contents

1. [Features](#features)
2. [Tech Stack](#tech-stack)
3. [Project Structure](#project-structure)
4. [Getting Started](#getting-started)

   * [Prerequisites](#prerequisites)
   * [Installation](#installation)
   * [Environment Variables](#environment-variables)
   * [Available Scripts](#available-scripts)
5. [Configuration & Connectors](#configuration--connectors)
6. [Database & Models](#database--models)
7. [Middleware](#middleware)
8. [Controllers & Routes](#controllers--routes)
9. [Services & Utilities](#services--utilities)
10. [Error Handling & Logging](#error-handling--logging)
11. [Deployment](#deployment)
12. [Contributing](#contributing)
13. [License](#license)

---

## 🚀 Features

* **User Authentication** via JWT with protected endpoints
* **Candidate CRUD** (create, read, update, delete) with resume file uploads
* **Assessment Module** for assigning and retrieving candidate assessments
* **Interview Scheduling** with Google Calendar integration
* **Offer & Background Check Emails** via configurable templates
* **Pipeline Status Tracking** through customizable stages
* **File Upload Handling** with Multer (resumes & assessments)
* **Resume Parsing** utilities (Mammoth, textract)
* **Real-Time Stats** endpoint for dashboard metrics

---

## 🛠 Tech Stack

* **Runtime & Framework:** Node.js, Express
* **Language:** TypeScript
* **Database:** MongoDB (Mongoose)
* **Authentication:** JSON Web Tokens (jsonwebtoken)
* **File Uploads:** Multer
* **Email Service:** Nodemailer / SMTP
* **Scheduling:** node-cron + Google Calendar API
* **Logging:** Morgan + Winston
* **Validation & Error Handling:** express-validator + custom middleware

---

## 📂 Project Structure

```
ATS-backend/
├── src/
│   ├── config/
│   │   ├── db.ts
│   │   └── index.ts
│   ├── constants/
│   │   └── pipelineStages.ts
│   ├── controllers/
│   │   ├── authController.ts
│   │   ├── candidateController.ts
│   │   ├── assessmentController.ts
│   │   ├── interviewController.ts
│   │   ├── letterController.ts
│   │   ├── commentController.ts
│   │   ├── sectionController.ts
│   │   └── statsController.ts
│   ├── middleware/
│   │   ├── authMiddleware.ts
│   │   ├── uploadMiddleware.ts
│   │   └── errorHandler.ts
│   ├── models/
│   │   ├── User.ts
│   │   ├── Candidate.ts
│   │   ├── Assessment.ts
│   │   ├── Interview.ts
│   │   ├── Letter.ts
│   │   ├── Comment.ts
│   │   └── Section.ts
│   ├── routes/
│   │   ├── authRoutes.ts
│   │   ├── candidateRoutes.ts
│   │   ├── assessmentRoutes.ts
│   │   ├── interviewRoutes.ts
│   │   ├── letterRoutes.ts
│   │   ├── commentRoutes.ts
│   │   ├── sectionRoutes.ts
│   │   └── statsRoutes.ts
│   ├── services/
│   │   ├── emailService.ts
│   │   └── statsService.ts
│   └── utils/
│       ├── email.ts
│       ├── googleCalendar.ts
│       ├── logger.ts
│       └── resumeParser.ts
├── uploads/
│   ├── resumes/
│   └── assessments/
├── .env                # Environment variable definitions (do not commit!)
├── package.json        # NPM dependencies and scripts
├── tsconfig.json       # TypeScript configuration
└── README.md           # Project documentation
```

---

## 🏁 Getting Started

### Prerequisites

* Node.js v18+
* npm (or Yarn)
* MongoDB instance (local or Atlas)

### Installation

```bash
git clone https://github.com/anshul2071/ATS-backend.git
cd ATS-backend
npm install
```

### Environment Variables

Define the following keys in your `.env` file (do not commit values):

```ini
PORT                    # e.g. 5000
MONGO_URI               # MongoDB connection string
JWT_SECRET              # Secret for signing JWTs
JWT_EXPIRES_IN          # JWT expiration (e.g. "7d")

EMAIL_HOST              # SMTP host (e.g. smtp.gmail.com)
EMAIL_PORT              # SMTP port (e.g. 587)
EMAIL_USER              # SMTP username
EMAIL_PASS              # SMTP password or app password

# OAuth2 alternative settings (optional):
OAUTH_CLIENT_ID         # Google OAuth client ID
OAUTH_CLIENT_SECRET     # Google OAuth client secret
OAUTH_REFRESH_TOKEN     # Google OAuth refresh token
OAUTH_REDIRECT_URI      # OAuth2 redirect URI
GOOGLE_CALENDAR_ID      # Email/calendar ID for scheduling

FRONTEND_URL            # Production frontend URL
DEV_CLIENT_URL          # Development frontend URL
EMAIL_VERIFICATION_URL  # Frontend route for email verification
PASSWORD_RESET_URL      # Frontend route for password resets
```

### Available Scripts

* `npm run dev` — Start in development (ts-node + nodemon)
* `npm run build` — Compile TypeScript
* `npm run start` — Run production build

---

## 🔧 Configuration & Connectors

* **db.ts** initializes and exports the Mongoose connection using `MONGO_URI`.
* **pipelineStages.ts** exports an ordered list of recruitment stages.
* **googleCalendar.ts** wraps Google Calendar API calls for interview scheduling.

---

## 🗄 Database & Models

* **User.ts** — Schema for account credentials & roles
* **Candidate.ts** — Core profile data + resume URL + status + assessments array
* **Assessment.ts** — Title, score, remarks, fileUrl, candidate reference
* **Interview\.ts** — Candidate, date, stage, calendarLink
* **Letter.ts** — Offer or rejection, templateName, to, date
* **Section.ts** & **Comment.ts** — For customizable UI sections & notes

---

## 🔐 Middleware

* **authMiddleware.ts** — Protects routes, verifies JWT, attaches `req.user`
* **uploadMiddleware.ts** — Multer storage and filtering for resumes & assessments
* **errorHandler.ts** — Catches errors and sends JSON responses
* **express-validator** checks in route definitions for input validation

---

## 🚦 Controllers & Routes

Each controller group pairs with a router in `/src/routes`:

| Controller              | Router              | Purpose                             |
| ----------------------- | ------------------- | ----------------------------------- |
| authController.ts       | authRoutes.ts       | Signup, login, profile              |
| candidateController.ts  | candidateRoutes.ts  | CRUD candidates, resume upload      |
| assessmentController.ts | assessmentRoutes.ts | Create & list assessments           |
| interviewController.ts  | interviewRoutes.ts  | Schedule & list interviews          |
| letterController.ts     | letterRoutes.ts     | Send & list offer/rejection letters |
| commentController.ts    | commentRoutes.ts    | Add & list comments on sections     |
| sectionController.ts    | sectionRoutes.ts    | Customize UI sections               |
| statsController.ts      | statsRoutes.ts      | Dashboard metrics                   |

---

## 🛠 Services & Utilities

* **emailService.ts** — Nodemailer setup & send functions for offers & background checks
* **statsService.ts** — Aggregates counts and averages for `/stats` endpoint
* **resumeParser.ts** — Converts Word/PDF resumes to text using Mammoth & textract
* **logger.ts** — Winston configure for file/console logging

---

## ⚙️ Error Handling & Logging

* All controllers use `express-async-handler` to forward errors
* `errorHandler` middleware formats and returns `{ message, details }`
* Morgan logs HTTP requests in development
* Winston records application-level logs (errors, info)

---

## 🚀 Deployment

### Render.com Setup

1. Push this repository to GitHub.
2. In your Render dashboard, create a new **Web Service**.
3. Connect your GitHub ATS-backend repo.
4. Set **Build Command:** `npm install && npm run build`
5. Set **Start Command:** `npm run start`
6. Add environment variables in Render (same keys as in `.env`).
7. Deploy; Render will build and host at a generated URL.

### Usage

* **Base URL:** `https://ats-backend-fw5n.onrender.com`
* **API Root:** `https://ats-backend-fw5n.onrender.com/api`

---

## 🤝 Contributing

1. Fork the repo
2. Create a branch (`git checkout -b feat/your-feature`)
3. Commit changes (`git commit -m 'feat: add feature'`)
4. Push (`git push origin feat/your-feature`)
5. Open a Pull Request

---

## 📜 License

MIT © Anshul Rawal
