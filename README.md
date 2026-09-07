# Student-Information-System

A web application built to digitize student records using HTML, CSS, and JS. Manages core demographics, student numbers, addresses, personal phone numbers, and parent details (mother &amp; father). Features dual-email tracking for personal and Perpetual institutional accounts in a clean, responsive client-side dashboard.



---

## Table of Contents

- [About](#about)
- [Author](#author)
- [Tech Stack](#tech-stack)
- [Key Features](#features)
- [Project Structure](#project-structure)
- [Purpose](#purpose)
- [Roadmap](#roadmap)
- [License](#license)

---

## About 

This application serves as a centralized platform for managing student profiles, contact details, and family records. Built using plain HTML, CSS, and JavaScript, it focuses on fast client-side performance, responsive design, and intuitive data handling without relying on heavy external frameworks.

---

## Author

**Prince Ram Roydlikent F. Igna**
Developer of the Student Information System

---

## Tech Stack

| Technology | Purpose |
|------------|---------|
| HTML 5     | Markup and page structures |
| CSS3       | Styling, layout, and responsiveness |
| JavaScript | Application Logic and Interactivity |
| SQL        | Database for the project |
| React      | stores information |

---

## Key Features

* **Student Identity Tracking:** Records unique Student Numbers, full names, Date of Birth, and calculated age.

* **Dual-Email System:** Manages institutional **Perpetual email** accounts alongside **personal email** addresses for effective communication.

* **Parent & Guardian Records:** Keeps organized records of parents' names (Father & Mother) for administrative and emergency reference.

* **Contact & Demographics:** Stores residential addresses and direct personal phone numbers.

* **Responsive Dashboard:** Simple, accessible user interface optimized for desktop and mobile views.

* **Live Hosting: (Backend needed)** Database SQL 

---

## Project Structure

```
student-information-system/
├── index.html            → Login / Sign up
├── dashboard.html        → Progress overview + account settings
├── personal.html         → I. Personal Data (incl. I-B Alien Status)
├── residence.html        → II. Residence Data
├── physical.html         → III. Physical Description
├── family.html           → IV. Family Data
├── education.html        → V. Educational Background
├── qualification.html    → VI. General Qualification
├── references.html       → VII. References
├── profile.html          → VIII. Profile Edit (profile upload png & joeg, edit full name and username)
├── css/
│   └── style.css         → Shared stylesheet

└── js/
    ├── store.js          → Data layer (accounts + records, localStorage)
    ├── layout.js         → Builds sidebar/topbar on every page
    ├── export.js         → This is for the pdf, excel and export section
    └── auth.js           → Login & signup logic

```

---

## Purpose

This project was created as an educational exercise to practice building a functional, client-side web application using plain HTML, CSS, and JavaScript. It focuses on:

- Structuring and managing structured data (student records) without a backend or database
- Practicing form handling, validation, and dynamic DOM manipulation
- Applying responsive design principles for desktop and mobile views
- Reinforcing core web development fundamentals without relying on external frameworks


---

## Roadmap

- [ ] Add data persistence (LocalStorage or backend integration)
- [ ] Implement search and filter for student records
- [ ] Add form validation for emails, phone numbers, and required fields
- [ ] Export student records to CSV/PDF
- [ ] Add edit and delete functionality for existing records
- [ ] Introduce basic authentication for admin access
- [ ] Improve accessibility (ARIA labels, keyboard navigation)

---

## License

This project is developed for **educational purposes only**.

© 2026 Prince Ram Roydlikent F. Igna. All Rights Reserved.

