/* ============================================================
   store.js — data layer + theme + password tools (localStorage)
   Account = { studentNo (unique ID), fullName, email (unique), password, photo }
   ============================================================ */
const SIS = (function () {
    const K = { users: 'sis_users', session: 'sis_session', data: 'sis_records', theme: 'sis_theme' };

    const read = (k, fallback) => { try { const v = JSON.parse(localStorage.getItem(k)); return v ?? fallback; } catch (e) { return fallback; } };
    const write = (k, v) => localStorage.setItem(k, JSON.stringify(v));

    /* Demo-only hash — a real app must hash passwords on a server. */
    function hash(text) {
        let h = 5381;
        for (let i = 0; i < text.length; i++) h = ((h << 5) + h) ^ text.charCodeAt(i);
        return 'v1.' + (h >>> 0).toString(36) + '.' + text.length;
    }

    const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const emailOk = v => /^\S+@\S+\.\S+$/.test(v || '');

    /* ---------- password requirements ---------- */
    const PW_RULES = [
        { re: /.{8,}/,        label: 'At least 8 characters' },
        { re: /[A-Z]/,        label: 'One uppercase letter (A–Z)' },
        { re: /[a-z]/,        label: 'One lowercase letter (a–z)' },
        { re: /\d/,           label: 'One number (0–9)' },
        { re: /[^A-Za-z0-9]/, label: 'One special character (!@#$…)' },
    ];
    const passwordIssues = pw => PW_RULES.filter(r => !r.re.test(pw || '')).map(r => r.label);

    function attachPwChecklist(input, list) {
        if (!input || !list) return;
        const render = () => {
            list.innerHTML = PW_RULES.map(r =>
                `<li class="${r.re.test(input.value) ? 'ok' : ''}">${r.label}</li>`).join('');
        };
        input.addEventListener('input', render);
        render();
    }

    /* ---------- section registry ---------- */
    const SECTIONS = [
        { key: 'personal', num: 'I', label: 'Personal Data', href: 'personal.html',
          fields: ['course','major','curriculumYear','yearLevel','term','schoolYear','lastName','firstName','middleName','nativeLanguage','gender','religion','nationality','civilStatus','dob','placeOfBirth','birthOrder','mobile','email'] },
        { key: 'residence', num: 'II', label: 'Residence Data', href: 'residence.html',
          fields: ['homeStreet','homeCity','homeProvince','homeCountry','homeZip','homePhone','guardianName','guardianRelation','curStreet','curCity','curProvince','curCountry','curZip','curPhone','curEmail','emgName','emgRelation','emgStreet','emgCity','emgProvince','emgCountry','emgZip','emgPhone'] },
        { key: 'physical', num: 'III', label: 'Physical Description', href: 'physical.html',
          fields: ['heightCm','weightKg','built','eyeColor','hairColor','complexion','otherFeatures','disability'] },
        { key: 'family', num: 'IV', label: 'Family Data', href: 'family.html',
          fields: ['fatherName','fatherOccupation','fatherCompany','fatherCompanyAddress','fatherPhone','fatherEmail','motherName','motherOccupation','motherCompany','motherCompanyAddress','motherPhone','motherEmail','siblings'] },
        { key: 'education', num: 'V', label: 'Educational Background', href: 'education.html',
          fields: ['elemName','elemCourse','elemYear','elemHonors','hsName','hsCourse','hsYear','hsHonors','vocName','vocCourse','vocYear','vocHonors','colName','colCourse','colYear','colHonors','pgName','pgCourse','pgYear','pgHonors'] },
        { key: 'qualification', num: 'VI', label: 'General Qualification', href: 'qualification.html',
          fields: ['languages','hobbies','skills','talents','sports','honorsAwards','extracurricular','whyCourse'] },
        { key: 'references', num: 'VII', label: 'References', href: 'references.html',
          fields: ['refName1','refContact1','refName2','refContact2'] },
    ];

    /* ---------- auth ---------- */
    const users = () => read(K.users, []);
    const saveUsers = list => write(K.users, list);
    const session = () => localStorage.getItem(K.session);
    const currentUser = () => users().find(u => u.studentNo === session()) || null;

    /* Migration: older accounts get fullName/email fields. */
    (function migrate() {
        const list = users();
        let changed = false;
        for (const u of list) {
            if (u.fullName === undefined) { u.fullName = u.username || ''; changed = true; }
            if (u.email === undefined) { u.email = ''; changed = true; }
            if (u.photo === undefined) { u.photo = null; changed = true; }
        }
        if (changed) saveUsers(list);
    })();

    function requireAuth() { if (!session()) location.replace('index.html'); }
    function logout() { localStorage.removeItem(K.session); location.href = 'index.html'; }

    function signup({ studentNo, fullName, email, password }) {
        studentNo = (studentNo || '').trim();
        fullName = (fullName || '').trim();
        email = (email || '').trim().toLowerCase();

        if (fullName.length < 2) return { error: 'Please enter your full name (at least 2 characters).' };
        if (!emailOk(email)) return { error: 'Please enter a valid email address.' };
        if (studentNo.length < 4) return { error: 'Student number must be at least 4 characters.' };
        if (!/^[\w.-]+$/.test(studentNo)) return { error: 'Student number may only contain letters, numbers, dots, dashes and underscores.' };
        const issues = passwordIssues(password);
        if (issues.length) return { error: 'Password requirements not met: ' + issues.join(', ') + '.' };

        const list = users();
        if (list.some(u => u.studentNo.toLowerCase() === studentNo.toLowerCase()))
            return { error: 'That student number is already registered — one account per student number.' };
        if (list.some(u => (u.email || '').toLowerCase() === email))
            return { error: 'That email address is already used by another account.' };

        list.push({ studentNo, fullName, email, password: hash(password), photo: null, createdAt: new Date().toISOString() });
        saveUsers(list);
        return { ok: true };
    }

    /* Login accepts student number OR email. */
    function login(identifier, password) {
        const id = (identifier || '').trim().toLowerCase();
        const user = users().find(u => u.studentNo.toLowerCase() === id || (u.email || '').toLowerCase() === id);
        if (!user || user.password !== hash(password || '')) return { error: 'Invalid student number/email or password.' };
        localStorage.setItem(K.session, user.studentNo);
        return { ok: true, user };
    }

    function changePassword(current, next) {
        const list = users();
        const user = list.find(u => u.studentNo === session());
        if (!user) return { error: 'You are not signed in.' };
        if (user.password !== hash(current || '')) return { error: 'Current password is incorrect.' };
        const issues = passwordIssues(next);
        if (issues.length) return { error: 'Password requirements not met: ' + issues.join(', ') + '.' };
        user.password = hash(next);
        saveUsers(list);
        return { ok: true };
    }

    /* ---------- profile editing ---------- */
    function updateProfile({ fullName, email, photo }) {
        const list = users();
        const user = list.find(u => u.studentNo === session());
        if (!user) return { error: 'You are not signed in.' };
        fullName = (fullName || '').trim();
        email = (email || '').trim().toLowerCase();
        if (fullName.length < 2) return { error: 'Please enter your full name (at least 2 characters).' };
        if (!emailOk(email)) return { error: 'Please enter a valid email address.' };
        if (list.some(u => u.studentNo !== user.studentNo && (u.email || '').toLowerCase() === email))
            return { error: 'That email address is already used by another account.' };
        user.fullName = fullName;
        user.email = email;
        if (photo !== undefined) user.photo = photo;   // string = new photo, null = removed, undefined = unchanged
        saveUsers(list);
        return { ok: true, user };
    }

    /* Image → small square-friendly data URL (so it fits in localStorage). */
    function fileToAvatarDataUrl(file, max = 240) {
        return new Promise((resolve, reject) => {
            if (!file || !file.type.startsWith('image/')) return reject(new Error('Please choose an image file.'));
            const img = new Image();
            const url = URL.createObjectURL(file);
            img.onload = () => {
                const scale = Math.min(1, max / Math.max(img.width, img.height));
                const c = document.createElement('canvas');
                c.width = Math.round(img.width * scale);
                c.height = Math.round(img.height * scale);
                c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
                URL.revokeObjectURL(url);
                resolve(c.toDataURL('image/jpeg', 0.85));
            };
            img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Could not read that image.')); };
            img.src = url;
        });
    }

    /* ---------- records ---------- */
    function getData(key = session()) { const all = read(K.data, {}); return all[key] || {}; }
    function setData(d, key = session()) { const all = read(K.data, {}); all[key] = d; write(K.data, all); }
    function saveSection(key, partial) {
        const d = getData();
        d[key] = Object.assign({}, d[key] || {}, partial);
        setData(d);
    }
    function wipeRecords() {
        const all = read(K.data, {});
        delete all[session()];
        write(K.data, all);
    }

    function progress(key = session()) {
        const d = getData(key);
        let total = 0, filled = 0;
        const per = {};
        for (const s of SECTIONS) {
            const vals = d[s.key] || {};
            let f = 0;
            for (const k of s.fields) {
                total++;
                const v = vals[k];
                if (Array.isArray(v) ? v.length : (v !== undefined && String(v).trim() !== '')) f++;
            }
            filled += f;
            per[s.key] = { filled: f, total: s.fields.length };
        }
        return { percent: total ? Math.round(filled / total * 100) : 0, per };
    }

    /* ---------- CSV export: every registered user + everything they typed ---------- */
    function downloadCsv(filename, rows) {
        const csv = rows.map(r => r.map(v => '"' + String(v ?? '').replace(/"/g, '""') + '"').join(',')).join('\r\n');
        const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });  // BOM so Excel reads UTF-8
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = filename;
        a.click();
        URL.revokeObjectURL(a.href);
    }

    function exportUsersCsv() {
        const head = ['student_no', 'full_name', 'email', 'registered_at', 'progress_percent', 'last_saved'];
        for (const s of SECTIONS) for (const f of s.fields) head.push(s.key + '_' + f);

        const allData = read(K.data, {});
        const rows = [head];
        for (const u of users()) {
            const d = allData[u.studentNo] || {};
            const p = progress(u.studentNo);
            let last = 0;
            for (const v of Object.values(d)) if (v && v._savedAt > last) last = v._savedAt;
            const row = [u.studentNo, u.fullName || '', u.email || '', u.createdAt || '', p.percent + '%', last ? new Date(last).toLocaleString() : ''];
            for (const s of SECTIONS) for (const f of s.fields) {
                const v = (d[s.key] || {})[f];
                if (f === 'siblings' && Array.isArray(v))
                    row.push(v.map(x => [x.name, x.dob && '(' + x.dob + ')', x.course, x.school].filter(Boolean).join(' ')).join(' | '));
                else row.push(v === undefined ? '' : String(v));
            }
            rows.push(row);
        }
        downloadCsv('sis-users.csv', rows);
    }

    /* ---------- section-form binding ---------- */
    function bindSection(key) {
        const form = document.getElementById('sectionForm');
        if (!form) return;
        const values = getData()[key] || {};
        form.querySelectorAll('[name]').forEach(el => { el.value = values[el.name] ?? ''; });
        if (typeof window.applyExtra === 'function') window.applyExtra(values);

        const stamp = document.getElementById('savedStamp');
        const showStamp = t => { if (stamp && t) stamp.textContent = 'Last saved: ' + new Date(t).toLocaleString(); };
        showStamp(values._savedAt);

        form.addEventListener('submit', e => e.preventDefault());
        document.getElementById('saveBtn').addEventListener('click', () => {
            const obj = {};
            form.querySelectorAll('[name]').forEach(el => { obj[el.name] = el.value.trim(); });
            if (typeof window.collectExtra === 'function') window.collectExtra(obj);
            obj._savedAt = Date.now();
            saveSection(key, obj);
            showStamp(obj._savedAt);
            toast('Information saved successfully.');
            refreshTopbar();
        });
        const reset = document.getElementById('resetBtn');
        if (reset) reset.addEventListener('click', () => {
            if (confirm('Discard unsaved changes and reload the saved version?')) location.reload();
        });
    }

    /* ---------- theme ---------- */
    function getTheme() { return localStorage.getItem(K.theme) || 'dark'; }
    function setTheme(t) {
        localStorage.setItem(K.theme, t);
        document.documentElement.dataset.theme = t;
        document.querySelectorAll('.theme-toggle').forEach(b => { b.textContent = t === 'dark' ? '☀' : '☾'; });
    }
    function toggleTheme() { setTheme(getTheme() === 'dark' ? 'light' : 'dark'); }

    /* ---------- password show/hide ---------- */
    const EYE = '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
    const EYE_OFF = '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>';

    document.addEventListener('click', e => {
        const btn = e.target.closest('.pw-eye');
        if (!btn) return;
        const input = btn.parentElement.querySelector('input');
        const show = input.type === 'password';
        input.type = show ? 'text' : 'password';
        btn.innerHTML = show ? EYE_OFF : EYE;
    });

    /* ---------- ui helpers ---------- */
    function refreshTopbar() {
        const chip = document.getElementById('progressChip');
        if (chip) chip.textContent = progress().percent + '% complete';
    }

    let toastTimer;
    function toast(message) {
        let t = document.querySelector('.toast');
        if (!t) { t = document.createElement('div'); t.className = 'toast'; document.body.appendChild(t); }
        t.textContent = message;
        requestAnimationFrame(() => t.classList.add('show'));
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => t.classList.remove('show'), 2600);
    }

    /* ---------- init ---------- */
    setTheme(getTheme());
    document.querySelectorAll('.pw-eye').forEach(b => { if (!b.innerHTML.trim()) b.innerHTML = EYE; });

    return { SECTIONS, esc, hash, users, session, currentUser, requireAuth, logout,
             signup, login, changePassword, updateProfile, fileToAvatarDataUrl,
             getData, setData, saveSection, wipeRecords, progress,
             exportUsersCsv, downloadCsv, bindSection, toast, refreshTopbar,
             getTheme, setTheme, toggleTheme, PW_RULES, passwordIssues, attachPwChecklist };
})();