/* ============================================================
   server.js — SIS backend: Express + PostgreSQL (Neon) + sessions
   Data persists FOREVER — the database lives on Neon, not the disk.
   ============================================================ */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const express = require('express');
const session = require('express-session');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

/* ---------- postgres (Neon) ---------- */
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
});

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  student_no    TEXT PRIMARY KEY,
  full_name     TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'student',
  photo         TEXT,
  created_at    TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS records (
  student_no TEXT NOT NULL,
  section    TEXT NOT NULL,
  data       TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (student_no, section)
);`;

const SECTIONS = ['personal','residence','physical','family','education','qualification','references'];
const pwIssues = pw => [
    !/.{8,}/.test(pw) && '8+ characters', !/[A-Z]/.test(pw) && 'an uppercase letter',
    !/[a-z]/.test(pw) && 'a lowercase letter', !/\d/.test(pw) && 'a number',
    !/[^A-Za-z0-9]/.test(pw) && 'a special character',
].filter(Boolean);
const emailOk = v => /^\S+@\S+\.\S+$/.test(v || '');

const pubUser = u => ({ studentNo: u.student_no, fullName: u.full_name, email: u.email, role: u.role, photo: u.photo, createdAt: u.created_at });
async function getRecords(sno) {
    const r = await pool.query('SELECT section, data FROM records WHERE student_no = $1', [sno]);
    return Object.fromEntries(r.rows.map(row => [row.section, JSON.parse(row.data)]));
}

/* ---------- app ---------- */
const app = express();
app.set('trust proxy', 1);
app.use(express.json({ limit: '2mb' }));
app.use(session({ secret: process.env.SESSION_SECRET || 'change-this-secret-string', resave: false, saveUninitialized: false, cookie: { maxAge: 1000 * 60 * 60 * 8 } }));

/* static files: pages live in src/, css + js + index.html at root */
app.use(express.static(path.join(ROOT, 'src')));
app.use(express.static(ROOT));

/* load the signed-in user for every request */
app.use(async (req, res, next) => {
    try {
        if (req.session.student_no) {
            const r = await pool.query('SELECT * FROM users WHERE student_no = $1', [req.session.student_no]);
            req.user = r.rows[0] || null;
        }
    } catch (e) { console.error(e); }
    next();
});

/* ---------- auth ---------- */
app.post('/api/signup', async (req, res) => {
    try {
        const fullName = (req.body.fullName || '').trim();
        const email = (req.body.email || '').trim().toLowerCase();
        const studentNo = (req.body.studentNo || '').trim();
        const password = req.body.password || '';
        if (fullName.length < 2) return res.status(400).json({ error: 'Please enter your full name.' });
        if (!emailOk(email)) return res.status(400).json({ error: 'Please enter a valid email address.' });
        if (studentNo.length < 4 || !/^[\w.-]+$/.test(studentNo)) return res.status(400).json({ error: 'Student number must be 4+ characters (letters, numbers, dots, dashes).' });
        const issues = pwIssues(password);
        if (issues.length) return res.status(400).json({ error: 'Password needs: ' + issues.join(', ') + '.' });
        const dupeNo = await pool.query('SELECT 1 FROM users WHERE lower(student_no)=$1', [studentNo.toLowerCase()]);
        if (dupeNo.rowCount) return res.status(400).json({ error: 'That student number is already registered.' });
        const dupeEmail = await pool.query('SELECT 1 FROM users WHERE lower(email)=$1', [email]);
        if (dupeEmail.rowCount) return res.status(400).json({ error: 'That email is already used by another account.' });
        await pool.query('INSERT INTO users (student_no,full_name,email,password_hash,role,photo,created_at) VALUES ($1,$2,$3,$4,$5,$6,$7)',
            [studentNo, fullName, email, bcrypt.hashSync(password, 10), 'student', null, new Date().toISOString()]);
        res.json({ ok: true });
    } catch (e) { console.error(e); res.status(500).json({ error: 'Server error.' }); }
});

app.post('/api/login', async (req, res) => {
    try {
        const id = (req.body.identifier || '').trim().toLowerCase();
        const r = await pool.query('SELECT * FROM users WHERE lower(student_no)=$1 OR lower(email)=$1', [id]);
        const user = r.rows[0];
        if (!user || !bcrypt.compareSync(req.body.password || '', user.password_hash))
            return res.status(401).json({ error: 'Invalid student number/email or password.' });
        req.session.student_no = user.student_no;
        res.json({ user: pubUser(user) });
    } catch (e) { console.error(e); res.status(500).json({ error: 'Server error.' }); }
});

app.post('/api/logout', (req, res) => req.session.destroy(() => res.json({ ok: true })));

app.get('/api/me', async (req, res) => {
    try {
        if (!req.user) return res.json({ user: null, records: {} });
        res.json({ user: pubUser(req.user), records: await getRecords(req.user.student_no) });
    } catch (e) { console.error(e); res.status(500).json({ error: 'Server error.' }); }
});

/* ---------- own records ---------- */
app.put('/api/records/:section', async (req, res) => {
    try {
        if (!req.user) return res.status(401).json({ error: 'Not signed in.' });
        if (!SECTIONS.includes(req.params.section)) return res.status(400).json({ error: 'Unknown section.' });
        if (typeof req.body !== 'object' || req.body === null) return res.status(400).json({ error: 'Invalid data.' });
        await pool.query(`INSERT INTO records (student_no,section,data,updated_at) VALUES ($1,$2,$3,$4)
                          ON CONFLICT (student_no,section) DO UPDATE SET data=EXCLUDED.data, updated_at=EXCLUDED.updated_at`,
            [req.user.student_no, req.params.section, JSON.stringify(req.body), new Date().toISOString()]);
        res.json({ ok: true });
    } catch (e) { console.error(e); res.status(500).json({ error: 'Server error.' }); }
});

app.delete('/api/records', async (req, res) => {
    try {
        if (!req.user) return res.status(401).json({ error: 'Not signed in.' });
        await pool.query('DELETE FROM records WHERE student_no = $1', [req.user.student_no]);
        res.json({ ok: true });
    } catch (e) { console.error(e); res.status(500).json({ error: 'Server error.' }); }
});

/* ---------- profile & password ---------- */
app.post('/api/profile', async (req, res) => {
    try {
        if (!req.user) return res.status(401).json({ error: 'Not signed in.' });
        const fullName = (req.body.fullName || '').trim();
        const email = (req.body.email || '').trim().toLowerCase();
        if (fullName.length < 2) return res.status(400).json({ error: 'Please enter your full name.' });
        if (!emailOk(email)) return res.status(400).json({ error: 'Please enter a valid email address.' });
        const dupe = await pool.query('SELECT 1 FROM users WHERE lower(email)=$1 AND student_no<>$2', [email, req.user.student_no]);
        if (dupe.rowCount) return res.status(400).json({ error: 'That email is used by another account.' });
        if ('photo' in req.body)
            await pool.query('UPDATE users SET photo=$1 WHERE student_no=$2', [req.body.photo, req.user.student_no]);
        await pool.query('UPDATE users SET full_name=$1, email=$2 WHERE student_no=$3', [fullName, email, req.user.student_no]);
        const r = await pool.query('SELECT * FROM users WHERE student_no=$1', [req.user.student_no]);
        res.json({ user: pubUser(r.rows[0]) });
    } catch (e) { console.error(e); res.status(500).json({ error: 'Server error.' }); }
});

app.post('/api/password', async (req, res) => {
    try {
        if (!req.user) return res.status(401).json({ error: 'Not signed in.' });
        if (!bcrypt.compareSync(req.body.current || '', req.user.password_hash))
            return res.status(400).json({ error: 'Current password is incorrect.' });
        const issues = pwIssues(req.body.next || '');
        if (issues.length) return res.status(400).json({ error: 'Password needs: ' + issues.join(', ') + '.' });
        await pool.query('UPDATE users SET password_hash=$1 WHERE student_no=$2', [bcrypt.hashSync(req.body.next, 10), req.user.student_no]);
        res.json({ ok: true });
    } catch (e) { console.error(e); res.status(500).json({ error: 'Server error.' }); }
});

/* ---------- admin ---------- */
function adminOnly(req, res, next) {
    if (!req.user) return res.status(401).json({ error: 'Not signed in.' });
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admins only.' });
    next();
}

app.get('/api/admin/data', adminOnly, async (req, res) => {
    try {
        const users = (await pool.query('SELECT * FROM users')).rows
            .map(u => ({ studentNo: u.student_no, fullName: u.full_name, email: u.email, role: u.role, createdAt: u.created_at }));
        const records = {};
        for (const row of (await pool.query('SELECT student_no, section, data FROM records')).rows)
            (records[row.student_no] ??= {})[row.section] = JSON.parse(row.data);
        res.json({ users, records });
    } catch (e) { console.error(e); res.status(500).json({ error: 'Server error.' }); }
});

app.post('/api/admin/users/:sno/delete', adminOnly, async (req, res) => {
    try {
        const t = await pool.query('SELECT * FROM users WHERE student_no=$1', [req.params.sno]);
        if (!t.rows[0]) return res.status(404).json({ error: 'User not found.' });
        if (t.rows[0].role === 'admin') return res.status(400).json({ error: 'You cannot delete an admin account.' });
        await pool.query('DELETE FROM users WHERE student_no=$1', [t.rows[0].student_no]);
        await pool.query('DELETE FROM records WHERE student_no=$1', [t.rows[0].student_no]);
        res.json({ ok: true });
    } catch (e) { console.error(e); res.status(500).json({ error: 'Server error.' }); }
});

app.post('/api/admin/users/:sno/clear', adminOnly, async (req, res) => {
    try {
        await pool.query('DELETE FROM records WHERE student_no=$1', [req.params.sno]);
        res.json({ ok: true });
    } catch (e) { console.error(e); res.status(500).json({ error: 'Server error.' }); }
});

app.post('/api/admin/users/:sno/reset', adminOnly, async (req, res) => {
    try {
        const t = await pool.query('SELECT * FROM users WHERE student_no=$1', [req.params.sno]);
        if (!t.rows[0]) return res.status(404).json({ error: 'User not found.' });
        const temp = 'Temp' + Math.random().toString(36).slice(2, 8);
        await pool.query('UPDATE users SET password_hash=$1 WHERE student_no=$2', [bcrypt.hashSync(temp, 10), t.rows[0].student_no]);
        res.json({ temp });
    } catch (e) { console.error(e); res.status(500).json({ error: 'Server error.' }); }
});

/* ---------- init: create tables + seed admin, THEN listen ---------- */
(async () => {
    await pool.query(SCHEMA);
    const admin = await pool.query('SELECT 1 FROM users WHERE student_no = $1', ['admin']);
    if (!admin.rowCount) {
        await pool.query('INSERT INTO users (student_no,full_name,email,password_hash,role,photo,created_at) VALUES ($1,$2,$3,$4,$5,$6,$7)',
            ['admin', 'Administrator', 'admin@sis.local', bcrypt.hashSync('admin123', 10), 'admin', null, new Date().toISOString()]);
        console.log('── Seeded ADMIN account → ID: admin | password: admin123  (CHANGE IT!) ──');
    }
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => console.log(`✅ SIS server running → http://localhost:${PORT}`));
})().catch(e => { console.error('Failed to start:', e); process.exit(1); });