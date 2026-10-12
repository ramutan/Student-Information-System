/* auth.js — login / signup (server mode) + Data Privacy consent flow */
(function () {
    SIS.ready.then(() => {
        if (SIS.currentUser()) location.replace(SIS.currentUser().role === 'admin' ? 'admin.html' : 'dashboard.html');
    });

    const tabLogin = document.getElementById('tabLogin');
    const tabSignup = document.getElementById('tabSignup');
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    const privacyModal = document.getElementById('privacyModal');
    let redirectAfterPrivacy = 'dashboard.html';

    function showTab(which) {
        const isLogin = which === 'login';
        tabLogin.classList.toggle('active', isLogin);
        tabSignup.classList.toggle('active', !isLogin);
        loginForm.classList.toggle('hidden', !isLogin);
        signupForm.classList.toggle('hidden', isLogin);
    }
    tabLogin.addEventListener('click', () => showTab('login'));
    tabSignup.addEventListener('click', () => showTab('signup'));

    SIS.attachPwChecklist(signupForm.password, document.getElementById('pwRules'));
    const fail = (box, msg) => { box.textContent = msg; box.classList.add('on'); };

    /* ---------- Data Privacy popup ---------- */
    function showPrivacyNotice() { privacyModal.style.display = 'flex'; }
    document.getElementById('privacyAgree').addEventListener('click', () => {
        privacyModal.style.display = 'none';
        location.href = redirectAfterPrivacy;
    });

    loginForm.addEventListener('submit', async e => {
        e.preventDefault();
        const box = document.getElementById('loginError'); box.classList.remove('on');
        const res = await SIS.login(loginForm.identifier.value, loginForm.password.value);
        if (res.error) return fail(box, res.error);
        redirectAfterPrivacy = res.user.role === 'admin' ? 'admin.html' : 'dashboard.html';
        showPrivacyNotice();                     /* popup instead of instant redirect */
    });

    signupForm.addEventListener('submit', async e => {
        e.preventDefault();
        const box = document.getElementById('signupError'); box.classList.remove('on');
        if (!signupForm.consent.checked) return fail(box, 'Please agree to the Data Privacy consent before creating an account.');
        if (signupForm.password.value !== signupForm.confirm.value) return fail(box, 'Passwords do not match.');
        const res = await SIS.signup({
            fullName: signupForm.fullName.value,
            email: signupForm.email.value,
            studentNo: signupForm.studentNo.value,
            password: signupForm.password.value,
            consent: signupForm.consent.checked,
        });
        if (res.error) return fail(box, res.error);
        await SIS.login(signupForm.studentNo.value, signupForm.password.value);
        redirectAfterPrivacy = 'dashboard.html';
        showPrivacyNotice();
    });
})();