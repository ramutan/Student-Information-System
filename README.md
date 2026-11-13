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