# Student-Information-System

A full-stack web application that digitizes the General Student Personal Information Sheet (GSPIS) — covering personal data, residence, physical description, family background, educational background, general qualifications, and references. Built with plain HTML, CSS, and JavaScript on the front end, powered by a Node.js + Express server with a cloud-hosted PostgreSQL database (Neon) on the back end.

Students register an account, fill out their information sheet section by section with live progress tracking, and manage their profile — while the admin oversees all accounts and records from a dedicated control panel with Excel, PDF, CSV, and print exports. All data is stored permanently in the cloud — it survives redeploys, restarts, and server sleeps.

## Table of Contents

- [About](#about)
- [Author](#author)
- [Tech Stack](#tech-stack)
- [Key Features](#key-features)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Deployment](#deployment)
- [Purpose](#purpose)
- [Roadmap](#roadmap)
- [License](#license)

## About

This application serves as a centralized platform for managing student records. What began as a client-side exercise evolved into a complete full-stack system: a REST API backed by a real cloud SQL database (PostgreSQL on Neon) handles authentication (with bcrypt-hashed passwords and server sessions), stores every submission permanently, and gives the administrator full visibility and control over all user accounts and their information sheets.

## Author

**Prince Ram Roydlikent F. Igna**
Developer of the Student Information System

## Tech Stack

| Technology | Purpose |
|---|---|
| HTML5 | Markup and page structures |
| CSS3 | Styling, layout, responsiveness, dark/light themes |
| JavaScript | Front-end application logic + server-side (Node.js) |
| Node.js + Express | REST API and static file server |
| PostgreSQL (Neon) | Cloud SQL database — permanent storage for users and records |
| pg (node-postgres) | PostgreSQL driver for Node.js |
| bcryptjs | Password hashing |
| express-session | Login sessions |
| dotenv | Environment variable management |
| jsPDF + AutoTable | PDF report generation |

## Key Features

- **Account System:** Students sign up with full name, email, and student number (both unique per account), with live password requirement checks and show/hide password toggles. Login accepts either student number or email.
- **7-Section Information Sheet (GSPIS):** Personal Data (incl. Alien Status), Residence Data, Physical Description, Family Data (with dynamic sibling rows), Educational Background, General Qualification, and References.
- **Permanent Cloud Storage:** All accounts and submissions live in a PostgreSQL database on Neon — data survives redeploys, restarts, and server sleep cycles.
- **Progress Tracking:** Live completion percentage per section and overall, shown on the dashboard and topbar.
- **User Profiles:** Editable full name and email, with photo upload (automatically resized and stored in the database).
- **Admin Panel:** Role-based access — the admin can view all registered users, monitor per-user progress and last-saved dates, reset passwords (secure temporary passwords), clear records, delete accounts, and export everything.
- **Report Exports:** Formatted Excel (.xls) with grouped section headers, per-user PDF reports, raw CSV, and a print-friendly report — covering every account and every answer.
- **Dark & Light Mode:** Theme toggle on every page, persisted across sessions.
- **Security:** Passwords are bcrypt-hashed (never stored or viewable in plain text), secrets are kept in environment variables (never committed), sessions are server-managed, and admin routes are protected server-side.
- **Responsive Design:** Optimized for desktop, tablet, and mobile.

## Project Structure

```
Student-Information-System/
├── index.html                 # Entry point — Login / Sign up
├── lib/
│   └── server.js              # Express server — REST API + PostgreSQL + sessions
├── package.json               # Dependencies and scripts
├── .gitignore                 # Excludes .env, node_modules, and database files
├── .env                       # Secrets — NEVER committed (DATABASE_URL, SESSION_SECRET)
│
├── src/
│   ├── dashboard.html         # Progress overview + account settings
│   ├── profile.html           # Edit name, email, and profile photo
│   ├── admin.html             # Control panel — user management + exports
│   ├── personal.html          # I.    Personal Data (incl. Alien Status)
│   ├── residence.html         # II.   Residence Data
│   ├── physical.html          # III.  Physical Description
│   ├── family.html            # IV.   Family Data
│   ├── education.html         # V.    Educational Background
│   ├── qualification.html     # VI.   General Qualification
│   └── references.html        # VII.  References
│
├── css/
│   └── style.css              # Themes (dark/light), layout, print styles
│
└── js/
    ├── store.js                # Data layer — REST API client + shared state
    ├── layout.js               # Sidebar + topbar builder for every page
    ├── auth.js                 # Login & signup logic
    └── export.js               # Excel / PDF / CSV / print report generator
```

## Getting Started

**Prerequisites:** Node.js (v18+ recommended) and a free PostgreSQL database ([Neon.tech](https://neon.tech))

```bash
# 1. Install dependencies
npm install

# 2. Create a .env file in the project root:
#    DATABASE_URL=postgresql://<user>:<password>@<host>/<dbname>?sslmode=require
#    SESSION_SECRET=<any-long-random-text>

# 3. Start the server
npm start

# 4. Open the app
# → http://localhost:3000
```

> **Note:** the app must be served by Node — opening the HTML files directly won't work, since the front end communicates with the REST API.

On first run, the server automatically creates the tables in PostgreSQL and seeds an admin account. Change the admin password immediately after first login (Admin page → Change my admin password).

## Deployment

The app is deployed on [Render](https://render.com) with HTTPS, using Neon as the persistent cloud database:

- **Build Command:** `npm install`
- **Start Command:** `npm start`
- **Environment Variables:** `DATABASE_URL` (Neon connection string) and `SESSION_SECRET`

Because the database lives on Neon rather than the host's ephemeral disk, all user data survives redeploys and restarts.

## Purpose

This project began as an exercise in building a functional web application with plain HTML, CSS, and JavaScript — and grew into a full-stack system. It demonstrates:

- Designing a REST API with Express and wiring a front end to it with `fetch`
- Working with a real cloud SQL database (PostgreSQL: schema design, parameterized queries, upserts)
- Secure authentication: bcrypt password hashing, server sessions, role-based access control
- Secrets management with environment variables (`.env` locally, host config in production)
- Form handling, validation, and dynamic DOM manipulation without frameworks
- Client-side file generation (Excel XML, PDF via jsPDF, CSV) and print styling
- Responsive, themeable UI design with CSS custom properties
- Cloud deployment (Render + Neon) with HTTPS

## Roadmap

- [x] Add data persistence (cloud PostgreSQL via Neon)
- [x] Export records to CSV / Excel / PDF
- [x] Add edit functionality for records and profiles
- [x] Authentication with role-based admin access
- [x] User management panel (reset passwords, clear/delete accounts)
- [x] Deploy with permanent cloud storage (Render + Neon)
- [ ] Search and filter for student records in the admin panel
- [ ] Improve accessibility (ARIA labels, keyboard navigation)
- [ ] Custom domain name

## License

This project is developed for educational purposes only.

© 2026 Prince Ram Roydlikent F. Igna. All Rights Reserved.