# UPHSD Student Information System (SIS)

**Admission Office - a full-stack, 7-section GSPIS encoder with cloud storage, an admin control panel, and branded report exports.**

![backend](https://img.shields.io/badge/backend-Node.js%20%2B%20Express-339933?labelColor=555555&style=flat-square)
![database](https://img.shields.io/badge/database-PostgreSQL%20on%20Neon-336791?labelColor=555555&style=flat-square)
![auth](https://img.shields.io/badge/auth-bcrypt%20%2B%20sessions-E07B39?labelColor=555555&style=flat-square)
![hosting](https://img.shields.io/badge/hosting-Render%20auto--deploy-4F46E5?labelColor=555555&style=flat-square)

---

## 1. What this project is

The Student Information System is a web application built for the **University of Perpetual Help System Dalta (UPHSD) Admission Office**. Students register an account (student number or email), then fill out the **7-Section Information Sheet (GSPIS)** online — Personal Data, Residence, Physical Description, Family, Educational Background, General Qualification, and References. Every answer is saved to a cloud PostgreSQL database as they go, so nothing is lost between sessions.

The admin oversees everything from one panel: monitoring per-student progress and last-saved dates, resetting passwords, clearing records, deleting accounts, and exporting all data. The entire interface carries the official UPHSD **maroon-and-gold** identity, including the university seal and wordmark on every page.

| | |
|---|---|
| **Users** | Students (encode GSPIS) · Admin (manage all accounts) |
| **Frontend** | Multi-page HTML / CSS / JavaScript — no framework |
| **Backend** | Node.js + Express REST API (`lib/server.js`) |
| **Database** | PostgreSQL hosted on Neon (permanent cloud storage) |
| **Hosting** | Render — auto-deploys on every `git push` |

---

## 2. Key Features

### For students

- **Account System** — Sign up with full name, email, and student number (both unique per account); live password-requirement checklist with show/hide toggles; log in with either student number or email.
- **7-Section Information Sheet (GSPIS)** — Personal Data (incl. Alien Status), Residence Data, Physical Description, Family Data (dynamic sibling rows), Educational Background, General Qualification, and References.
- **Progress Tracking** — Live completion percentage per section and overall, shown on the dashboard and topbar.
- **User Profile** — Editable full name and email, with photo upload (automatically resized and stored in the database).

### For the admin

- **Admin Panel** — Role-based access: view all registered users, monitor per-user progress and last-saved dates, reset passwords (secure temporary passwords), clear records, delete accounts, and export everything.

### System-wide

- **Permanent Cloud Storage** — All accounts and submissions live in PostgreSQL on Neon; data survives redeploys, restarts, and server sleep cycles.
- **Report Exports** — Formatted Excel (`.xls`) with grouped section headers, per-user PDF reports, raw CSV, and a print-friendly report — covering every account and every answer.
- **Dark & Light Mode** — Theme toggle on every page, persisted across sessions.
- **UPHSD Branding** — Official seal + wordmark on every page (theme-blending logo, favicon = university seal), maroon & gold palette, and exports carry the full lockup header.
- **Security** — Passwords are bcrypt-hashed (never stored or viewable in plain text); secrets live in environment variables (never committed); sessions are server-managed; admin routes are protected server-side.
- **Data Privacy** — Consent notice presented before encoding; consent is recorded per account.
- **Responsive Design** — Optimized for desktop, tablet, and mobile.

---

## 3. Tech Stack 

| Layer | Technology | Purpose |
|---|---|---|
| Frontend | HTML · CSS · JavaScript | Multi-page app, no framework |
| Styling | Custom CSS (`css/style.css`) | UPHSD maroon & gold theme, dark/light modes |
| Backend | Node.js + Express | REST API, auth, sessions, static hosting |
| Database | PostgreSQL (Neon) | Accounts, GSPIS answers, profile photos |
| Security | bcrypt + server sessions | Password hashing, protected admin routes |
| Exports | SpreadsheetML (`.xls`), jsPDF + AutoTable, CSV, print | Student and admin reports |
| Deployment | GitHub + Render | Push-to-deploy hosting |

## 4. Project Structure

```text
Student-Information-System/
├── index.html                 # Entry point — Login / Sign up + Data Privacy consent
├── css/
│   └── style.css              # Global styles — maroon & gold theme, dark/light mode
├── js/
│   ├── auth.js                # Login / signup logic, password requirement checks
│   ├── store.js               # SIS data layer — saves each section to the API
│   ├── layout.js              # Sidebar, topbar, progress bar, theme toggle
│   ├── brand.js               # UPHSD logo on every page (no-flash swap, v5)
│   └── exports.js             # Excel / PDF / CSV / print export suite (v2)
├── lib/
│   └── server.js              # Express server — REST API + PostgreSQL + sessions
├── src/
│   ├── assets/
│   │   ├── uphsd-logo.png         # Official lockup — light theme + PDF/print
│   │   ├── uphsd-logo-dark.png    # Lockup variant — dark theme
│   │   └── uphsd-seal.png         # University seal — favicon + PDF fallback
│   ├── dashboard.html         # Progress overview + account settings
│   ├── profile.html           # Edit name, email, and profile photo
│   ├── admin.html             # Control panel — user management + exports
│   ├── personal.html          # I.    Personal Data (incl. Alien Status)
│   ├── residence.html         # II.   Residence Data
│   ├── physical.html          # III.  Physical Description
│   ├── family.html            # IV.   Family Data (dynamic sibling rows)
│   ├── education.html         # V.    Educational Background
│   ├── qualification.html     # VI.   General Qualification
│   └── references.html        # VII.  References
├── package.json               # Dependencies and scripts
├── package-lock.json          # Locked dependency versions
├── .env                       # Secrets — NEVER committed (DATABASE_URL, SESSION_SECRET)
└── .gitignore                 # Excludes .env, node_modules, and database files
```



---

## 5. Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 18+
- A free PostgreSQL database on [Neon](https://neon.tech/)
- A [Render](https://render.com/) account (for deployment)

### Environment variables

Create a `.env` file in the project root (**never commit it**):
 
```env
DATABASE_URL=postgresql://user:password@ep-xxxx.neon.tech/neondb
SESSION_SECRET=change-me-to-a-long-random-string
```

### Install & run 

```bash
npm install
npm start            # or: node lib/server.js
```

---

## 6. Deployment (Render + Neon)
 
1. Create the database on Neon and copy its connection string into `DATABASE_URL`.
2. Push this repo to GitHub.
3. On Render, create a **Web Service** from the repo and add `DATABASE_URL` and `SESSION_SECRET` under **Environment**.
4. Every `git push` to `main` triggers an automatic deploy — data persists in Neon across all redeploys.
---


## 7. Security & Data Privacy

- Passwords are **bcrypt-hashed** — never stored or displayed in plain text.
- Secrets (`.env`) are never committed; they are configured per environment.
- Sessions are server-managed; admin routes are protected server-side.
- A **Data Privacy consent** step is required before encoding, and consent is recorded per account.

---

## 8. Branding

All pages, exports, and printed reports use the official University of Perpetual Help System Dalta identity: maroon & gold palette, the university seal as favicon, and the full seal + wordmark lockup (light and dark variants) on every page.

---