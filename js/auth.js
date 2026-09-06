/* auth.js — login / signup page logic (index.html only) */
(function () {
    if (SIS.session()) { location.replace('dashboard.html'); return; }

    const tabLogin = document.getElementById('tabLogin');
    const tabSignup = document.getElementById('tabSignup');
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');

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

    loginForm.addEventListener('submit', e => {
        e.preventDefault();
        const box = document.getElementById('loginError');
        box.classList.remove('on');
        const res = SIS.login(loginForm.identifier.value, loginForm.password.value);
        if (res.error) return fail(box, res.error);
        location.href = 'dashboard.html';
    });

    signupForm.addEventListener('submit', e => {
        e.preventDefault();
        const box = document.getElementById('signupError');
        box.classList.remove('on');
        if (signupForm.password.value !== signupForm.confirm.value)
            return fail(box, 'Passwords do not match.');
        const res = SIS.signup({
            fullName: signupForm.fullName.value,
            email: signupForm.email.value,
            studentNo: signupForm.studentNo.value,
            password: signupForm.password.value,
        });
        if (res.error) return fail(box, res.error);
        SIS.login(signupForm.studentNo.value, signupForm.password.value);
        location.href = 'dashboard.html';
    });
})();