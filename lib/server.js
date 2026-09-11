/* ============================================================
   server.js — SIS backend: Express + SQLite + sessions
   (lives in lib/ — serves pages from src/ + root assets)
   ============================================================ */
const express = require('express');
const session = require('express-session');
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');

/* project root = one folder up from lib/ */
const ROOT = path.join(__dirname, '..');

/* ---------- database (stored at project root) ---------- */
const db = new Database(path.join(ROOT, 'sis.db'));
db.pragma('journal_mode = WAL');
db.exec(`
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
);`);

/* seed the admin account (change the password after first login!) */
if (!db.prepare('SELECT 1 FROM users WHERE student_no = ?').get('admin')) {
    db.prepare('INSERT INTO users (student_no,full_name,email,password_hash,role,photo,created_at) VALUES (?,?,?,?,?,?,?)')
      .run('admin', 'Administrator', 'admin@sis.local', bcrypt.hashSync('admin123', 10), 'admin', null, new Date().toISOString());
    console.log('── Seeded ADMIN account → ID: admin | password: admin123  (CHANGE IT!) ──');
}

const SECTIONS = ['personal','residence','physical','family','education','qualification','references'];
const pwIssues = pw => [
    !/.{8,}/.test(pw) && '8+ characters', !/[A-Z]/.test(pw) && 'an uppercase letter',
    !/[a-z]/.test(pw) && 'a lowercase letter', !/\d/.test(pw) && 'a number',
    !/[^A-Za-z0-9]/.test(pw) && 'a special character',
].filter(Boolean);
const emailOk = v => /^\S+@\S+\.\S+$/.test(v || '');

const pubUser = u => ({ studentNo: u.student_no, fullName: u.full_name, email: u.email, role: u.role, photo: u.photo, createdAt: u.created_at });
const getRecords = sno => Object.fromEntries(
    db.prepare('SELECT section, data FROM records WHERE student_no = ?').all(sno).map(r => [r.section, JSON.parse(r.data)]));

/* ---------- app ---------- */
const app = express();
app.set('trust proxy', 1);
app.use(express.json({ limit: '2mb' }));
app.use(session({ secret: process.env.SESSION_SECRET || 'change-this-secret-string', resave: false, saveUninitialized: false, cookie: { maxAge: 1000 * 60 * 60 * 8 } }));

/* static files: pages live in src/, css + js + index.html at root */
app.use(express.static(path.join(ROOT, 'src')));
app.use(express.static(ROOT));

app.use((req, res, next) => {
    if (req.session.student_no)
        req.user = db.prepare('SELECT * FROM users WHERE student_no = ?').get(req.session.student_no) || null;
    next();
});

/* ---------- auth ---------- */
app.post('/api/signup', (req, res) => {
    const fullName = (req.body.fullName || '').trim();
    const email = (req.body.email || '').trim().toLowerCase();
    const studentNo = (req.body.studentNo || '').trim();
    const password = req.body.password || '';
    if (fullName.length < 2) return res.status(400).json({ error: 'Please enter your full name.' });
    if (!emailOk(email)) return res.status(400).json({ error: 'Please enter a valid email address.' });
    if (studentNo.length < 4 || !/^[\w.-]+$/.test(studentNo)) return res.status(400).json({ error: 'Student number must be 4+ characters (letters, numbers, dots, dashes).' });
    const issues = pwIssues(password);
    if (issues.length) return res.status(400).json({ error: 'Password needs: ' + issues.join(', ') + '.' });
    if (db.prepare('SELECT 1 FROM users WHERE lower(student_no)=?').get(studentNo.toLowerCase()))
        return res.status(400).json({ error: 'That student number is already registered.' });
    if (db.prepare('SELECT 1 FROM users WHERE lower(email)=?').get(email))
        return res.status(400).json({ error: 'That email is already used by another account.' });
    db.prepare('INSERT INTO users (student_no,full_name,email,password_hash,role,photo,created_at) VALUES (?,?,?,?,?,?,?)')
      .run(studentNo, fullName, email, bcrypt.hashSync(password, 10), 'student', null, new Date().toISOString());
    res.json({ ok: true });
});

app.post('/api/login', (req, res) => {
    const id = (req.body.identifier || '').trim().toLowerCase();
    const user = db.prepare('SELECT * FROM users WHERE lower(student_no)=? OR lower(email)=?').get(id, id);
    if (!user || !bcrypt.compareSync(req.body.password || '', user.password_hash))
        return res.status(401).json({ error: 'Invalid student number/email or password.' });
    req.session.student_no = user.student_no;
    res.json({ user: pubUser(user) });
});

app.post('/api/logout', (req, res) => req.session.destroy(() => res.json({ ok: true })));

app.get('/api/me', (req, res) => {
    if (!req.user) return res.json({ user: null, records: {} });
    res.json({ user: pubUser(req.user), records: getRecords(req.user.student_no) });
});

/* ---------- own records ---------- */
app.put('/api/records/:section', (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'Not signed in.' });
    if (!SECTIONS.includes(req.params.section)) return res.status(400).json({ error: 'Unknown section.' });
    if (typeof req.body !== 'object' || req.body === null) return res.status(400).json({ error: 'Invalid data.' });
    db.prepare(`INSERT INTO records (student_no,section,data,updated_at) VALUES (?,?,?,?)
                ON CONFLICT(student_no,section) DO UPDATE SET data=excluded.data, updated_at=excluded.updated_at`)
      .run(req.user.student_no, req.params.section, JSON.stringify(req.body), new Date().toISOString());
    res.json({ ok: true });
});

app.delete('/api/records', (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'Not signed in.' });
    db.prepare('DELETE FROM records WHERE student_no = ?').run(req.user.student_no);
    res.json({ ok: true });
});

/* ---------- profile & password ---------- */
app.post('/api/profile', (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'Not signed in.' });
    const fullName = (req.body.fullName || '').trim();
    const email = (req.body.email || '').trim().toLowerCase();
    if (fullName.length < 2) return res.status(400).json({ error: 'Please enter your full name.' });
    if (!emailOk(email)) return res.status(400).json({ error: 'Please enter a valid email address.' });
    if (db.prepare('SELECT 1 FROM users WHERE lower(email)=? AND student_no<>?').get(email, req.user.student_no))
        return res.status(400).json({ error: 'That email is used by another account.' });
    if ('photo' in req.body)
        db.prepare('UPDATE users SET photo=? WHERE student_no=?').run(req.body.photo, req.user.student_no);
    db.prepare('UPDATE users SET full_name=?, email=? WHERE student_no=?').run(fullName, email, req.user.student_no);
    res.json({ user: pubUser(db.prepare('SELECT * FROM users WHERE student_no=?').get(req.user.student_no)) });
});

app.post('/api/password', (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'Not signed in.' });
    if (!bcrypt.compareSync(req.body.current || '', req.user.password_hash))
        return res.status(400).json({ error: 'Current password is incorrect.' });
    const issues = pwIssues(req.body.next || '');
    if (issues.length) return res.status(400).json({ error: 'Password needs: ' + issues.join(', ') + '.' });
    db.prepare('UPDATE users SET password_hash=? WHERE student_no=?').run(bcrypt.hashSync(req.body.next, 10), req.user.student_no);
    res.json({ ok: true });
});

/* ---------- admin ---------- */
function adminOnly(req, res, next) {
    if (!req.user) return res.status(401).json({ error: 'Not signed in.' });
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admins only.' });
    next();
}

app.get('/api/admin/data', adminOnly, (req, res) => {
    const users = db.prepare('SELECT * FROM users').all()
        .map(u => ({ studentNo: u.student_no, fullName: u.full_name, email: u.email, role: u.role, createdAt: u.created_at }));
    const records = {};
    for (const r of db.prepare('SELECT student_no, section, data FROM records').all())
        (records[r.student_no] ??= {})[r.section] = JSON.parse(r.data);
    res.json({ users, records });
});

app.post('/api/admin/users/:sno/delete', adminOnly, (req, res) => {
    const t = db.prepare('SELECT * FROM users WHERE student_no=?').get(req.params.sno);
    if (!t) return res.status(404).json({ error: 'User not found.' });
    if (t.role === 'admin') return res.status(400).json({ error: 'You cannot delete an admin account.' });
    db.prepare('DELETE FROM users WHERE student_no=?').run(t.student_no);
    db.prepare('DELETE FROM records WHERE student_no=?').run(t.student_no);
    res.json({ ok: true });
});

app.post('/api/admin/users/:sno/clear', adminOnly, (req, res) => {
    db.prepare('DELETE FROM records WHERE student_no=?').run(req.params.sno);
    res.json({ ok: true });
});

app.post('/api/admin/users/:sno/reset', adminOnly, (req, res) => {
    const t = db.prepare('SELECT * FROM users WHERE student_no=?').get(req.params.sno);
    if (!t) return res.status(404).json({ error: 'User not found.' });
    const temp = 'Temp' + Math.random().toString(36).slice(2, 8);
    db.prepare('UPDATE users SET password_hash=? WHERE student_no=?').run(bcrypt.hashSync(temp, 10), t.student_no);
    res.json({ temp });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ SIS server running → http://localhost:${PORT}`));