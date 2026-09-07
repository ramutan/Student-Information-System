/* store.js — SERVER MODE: same SIS API, but data lives on the server now */
const SIS = (function () {
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

    const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

    const PW_RULES = [
        { re: /.{8,}/, label: 'At least 8 characters' }, { re: /[A-Z]/, label: 'One uppercase letter (A–Z)' },
        { re: /[a-z]/, label: 'One lowercase letter (a–z)' }, { re: /\d/, label: 'One number (0–9)' },
        { re: /[^A-Za-z0-9]/, label: 'One special character (!@#$…)' },
    ];
    const passwordIssues = pw => PW_RULES.filter(r => !r.re.test(pw || '')).map(r => r.label);
    function attachPwChecklist(input, list) {
        if (!input || !list) return;
        const render = () => list.innerHTML = PW_RULES.map(r => `<li class="${r.re.test(input.value) ? 'ok' : ''}">${r.label}</li>`).join('');
        input.addEventListener('input', render); render();
    }

    /* ---------- server state ---------- */
    let ME = null, DATA = {};
    const ready = fetch('/api/me', { credentials: 'same-origin' }).then(r => r.json())
        .then(d => { ME = d.user; DATA = d.records || {}; }).catch(() => {});
    const currentUser = () => ME;
    const onReady = cb => ready.then(cb);

    async function api(method, url, body) {
        try {
            const res = await fetch(url, { method, credentials: 'same-origin',
                headers: body ? { 'Content-Type': 'application/json' } : undefined,
                body: body ? JSON.stringify(body) : undefined });
            const d = await res.json().catch(() => ({}));
            return res.ok ? d : { error: d.error || 'Request failed.' };
        } catch (e) { return { error: 'Cannot reach the server — is "node server.js" running?' }; }
    }

    const signup = f => api('POST', '/api/signup', f);
    async function login(identifier, password) {
        const r = await api('POST', '/api/login', { identifier, password });
        if (!r.error) ME = r.user;
        return r;
    }
    async function logout() { await api('POST', '/api/logout'); location.href = 'index.html'; }
    function requireAuth() { if (!ME) location.replace('index.html'); }

    const getData = key => key ? (DATA[key] || {}) : DATA;
    async function saveSection(key, partial) {
        DATA[key] = Object.assign({}, DATA[key] || {}, partial);
        return api('PUT', '/api/records/' + key, DATA[key]);
    }
    const wipeRecords = () => api('DELETE', '/api/records');

    async function updateProfile(f) {
        const body = { fullName: f.fullName, email: f.email };
        if (f.photo !== undefined) body.photo = f.photo;
        const r = await api('POST', '/api/profile', body);
        if (!r.error && r.user) ME = r.user;
        return r;
    }
    const changePassword = (current, next) => api('POST', '/api/password', { current, next });

    function progress() {
        let total = 0, filled = 0; const per = {};
        for (const s of SECTIONS) {
            const vals = DATA[s.key] || {}; let f = 0;
            for (const k of s.fields) {
                total++;
                const v = vals[k];
                if (Array.isArray(v) ? v.length : (v !== undefined && String(v).trim() !== '')) f++;
            }
            filled += f; per[s.key] = { filled: f, total: s.fields.length };
        }
        return { percent: total ? Math.round(filled / total * 100) : 0, per };
    }

    function bindSection(key) {
        return ready.then(() => {
            const form = document.getElementById('sectionForm');
            if (!form) return;
            const values = DATA[key] || {};
            form.querySelectorAll('[name]').forEach(el => { el.value = values[el.name] ?? ''; });
            if (typeof window.applyExtra === 'function') window.applyExtra(values);

            const stamp = document.getElementById('savedStamp');
            const showStamp = t => { if (stamp && t) stamp.textContent = 'Last saved: ' + new Date(t).toLocaleString(); };
            showStamp(values._savedAt);

            form.addEventListener('submit', e => e.preventDefault());
            document.getElementById('saveBtn').addEventListener('click', async () => {
                const obj = {};
                form.querySelectorAll('[name]').forEach(el => { obj[el.name] = el.value.trim(); });
                if (typeof window.collectExtra === 'function') window.collectExtra(obj);
                obj._savedAt = Date.now();
                const r = await saveSection(key, obj);
                if (r.error) return toast(r.error);
                showStamp(obj._savedAt);
                toast('Information saved successfully.');
                refreshTopbar();
            });
            const reset = document.getElementById('resetBtn');
            if (reset) reset.addEventListener('click', () => {
                if (confirm('Discard unsaved changes and reload the saved version?')) location.reload();
            });
        });
    }

    /* image → small data URL for the avatar */
    function fileToAvatarDataUrl(file, max = 240) {
        return new Promise((resolve, reject) => {
            if (!file || !file.type.startsWith('image/')) return reject(new Error('Please choose an image file.'));
            const img = new Image(), url = URL.createObjectURL(file);
            img.onload = () => {
                const s = Math.min(1, max / Math.max(img.width, img.height));
                const c = document.createElement('canvas');
                c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
                c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
                URL.revokeObjectURL(url); resolve(c.toDataURL('image/jpeg', 0.85));
            };
            img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Could not read that image.')); };
            img.src = url;
        });
    }

    /* ---------- theme + password eye (unchanged behaviour) ---------- */
    const K_THEME = 'sis_theme';
    const getTheme = () => localStorage.getItem(K_THEME) || 'dark';
    function setTheme(t) {
        localStorage.setItem(K_THEME, t);
        document.documentElement.dataset.theme = t;
        document.querySelectorAll('.theme-toggle').forEach(b => b.textContent = t === 'dark' ? '☀' : '☾');
    }
    const toggleTheme = () => setTheme(getTheme() === 'dark' ? 'light' : 'dark');

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
        clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 2600);
    }

    setTheme(getTheme());
    document.querySelectorAll('.pw-eye').forEach(b => { if (!b.innerHTML.trim()) b.innerHTML = EYE; });

    return { SECTIONS, esc, ready, onReady, currentUser, requireAuth, signup, login, logout,
             getData, saveSection, wipeRecords, updateProfile, changePassword, progress,
             bindSection, fileToAvatarDataUrl, toast, refreshTopbar,
             getTheme, setTheme, toggleTheme, PW_RULES, passwordIssues, attachPwChecklist };
})();