/* layout.js — sidebar + topbar (waits for the server session) */
SIS.onReady(() => {
    const shell = document.querySelector('.app');
    if (!shell) return;
    SIS.requireAuth();
    const user = SIS.currentUser() || { studentNo: '—', fullName: '', photo: null };
    const displayName = user.fullName || user.studentNo;
    const here = location.pathname.split('/').pop() || 'dashboard.html';

    const avatarHtml = user.photo ? `<img class="avatar" src="${user.photo}" alt="">`
                                  : `<b>${SIS.esc(displayName.slice(0, 2).toUpperCase())}</b>`;
    const links = [
        { href: 'dashboard.html', num: '⌂', label: 'Dashboard' },
        { href: 'profile.html',  num: '👤', label: 'My Profile' },
    ].concat(SIS.SECTIONS.map(s => ({ href: s.href, num: s.num, label: s.label })));
    if (user.role === 'admin') links.push({ href: 'admin.html', num: '⚙', label: 'Admin' });

    document.getElementById('sidebar').innerHTML = `
        <div class="side-brand"><div class="logo">R</div>
          <div><h1>REGISTRAR</h1><p>SIS PORTAL</p></div></div>
        <nav>${links.map(l => `<a href="${l.href}" class="${l.href === here ? 'active' : ''}"><span class="num">${l.num}</span>${l.label}</a>`).join('')}</nav>
        <div class="side-foot">${user.photo ? `<img class="side-avatar" src="${user.photo}" alt="">` : ''}Signed in as<br><b>${SIS.esc(displayName)}</b></div>`;

    document.getElementById('topbar').innerHTML = `
        <button type="button" class="hamburger" id="hamburger" aria-label="Menu">☰</button>
        <h2 class="page-title">${SIS.esc(document.body.dataset.title || 'Student Information System')}</h2>
        <div class="top-right">
            <span class="progress-chip" id="progressChip"></span>
            <button type="button" class="btn ghost sm icon-btn theme-toggle" onclick="SIS.toggleTheme()"></button>
            <button type="button" class="btn ghost sm hide-sm" onclick="window.print()">⎙ Print</button>
            <span class="user-chip hide-sm">${avatarHtml}${SIS.esc(displayName)}</span>
            <button type="button" class="btn ghost sm" onclick="SIS.logout()">Logout</button>
        </div>`;

    SIS.setTheme(SIS.getTheme());
    SIS.refreshTopbar();
    document.getElementById('hamburger').addEventListener('click', () => document.getElementById('sidebar').classList.toggle('open'));
    document.getElementById('sidebar').addEventListener('click', e => { if (e.target.closest('a')) e.target.closest('.sidebar').classList.remove('open'); });
});