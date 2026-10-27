(function () {
  'use strict';

  var LOCKUP = '/assets/uphsd-logo.png';
  var LOCKUP_DARK = '/assets/uphsd-logo-dark.png';
  var SEAL = '/assets/uphsd-seal.png';

  /* ---- 1. inject CSS (idempotent) ---------------------------- */
  function ensureCSS() {
    if (document.getElementById('uphsdBrandCSS')) return;
    var st = document.createElement('style');
    st.id = 'uphsdBrandCSS';
    st.textContent =
      '.uphsd-lockup{display:block;width:min(100%,220px);height:auto;' +
        'background:transparent;border:none;outline:none;box-shadow:none}' +
      '.uphsd-tile-hidden{display:none !important}';
    document.head.appendChild(st);
  }

  /* ---- 2. theme detection ------------------------------------ */
  function themeIsLight() {
    var t = document.documentElement.getAttribute('data-theme') ||
            (document.body && document.body.getAttribute('data-theme')) || 'dark';
    return t === 'light';               // dark is the app default
  }
  function lockupSrc() { return themeIsLight() ? LOCKUP : LOCKUP_DARK; }

  function applyLogos() {
    var want = lockupSrc();
    var imgs = document.querySelectorAll('img.uphsd-lockup');
    for (var i = 0; i < imgs.length; i++) {
      var im = imgs[i];
      if (im.dataset.uphsdSrc !== want) {   // avoid needless reload/flicker
        im.dataset.uphsdSrc = want;
        im.src = want;
      }
    }
  }

  /* ---- 3. replace tile + text with the lockup image ---------- */
  var SELECTORS =
    '.brand-logo,.brand-icon,.brand-mark,.app-logo,.side-logo,' +
    '.logo-tile,.auth-logo,.login-logo,[data-brand-logo],.logo';

  function swapOnce() {
    var tiles = document.querySelectorAll(SELECTORS);
    for (var i = 0; i < tiles.length; i++) {
      var el = tiles[i];
      if (el.dataset.uphsdDone) continue;
      el.dataset.uphsdDone = '1';

      var row = el.closest('.brand,.brand-row,.brand-header,.sidebar-header,.side-header,.auth-brand') ||
                el.parentElement;
      if (!row) continue;

      /* hide the old letter tile */
      el.classList.add('uphsd-tile-hidden');

      /* hide old brand text so it doesn't clash with the wordmark */
      var texts = row.querySelectorAll('.brand-text,.brand-title,.brand-sub,.app-title,.uphsd-name');
      for (var k = 0; k < texts.length; k++) texts[k].classList.add('uphsd-tile-hidden');

      /* insert the official lockup image where the tile was */
      if (!row.dataset.uphsdLockup) {
        var img = document.createElement('img');
        img.className = 'uphsd-lockup';
        img.alt = 'University of Perpetual Help System Dalta';
        img.draggable = false;
        img.dataset.uphsdSrc = lockupSrc();
        img.src = img.dataset.uphsdSrc;
        row.insertBefore(img, el);
        row.dataset.uphsdLockup = '1';
      }
    }
    applyLogos();                        // keep every lockup on-theme
  }

  var t = null;
  function swapDebounced() {
    clearTimeout(t);
    t = setTimeout(swapOnce, 120);
  }

  /* ---- 4. favicon -------------------------------------------- */
  function setFavicon() {
    var link = document.querySelector('link[rel="icon"]');
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    link.type = 'image/png';
    link.href = SEAL;
  }

  /* ---- go ----------------------------------------------------- */
  function ready(fn) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn);
    } else { fn(); }
  }

  ready(function () {
    ensureCSS();
    swapOnce();
    setFavicon();

    // JS-rendered sidebars → re-swap when new tiles appear
    if (window.MutationObserver) {
      new MutationObserver(swapDebounced)
        .observe(document.documentElement, { childList: true, subtree: true });

      // theme toggle → swap logo variant instantly
      var themeObs = new MutationObserver(applyLogos);
      themeObs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
      if (document.body) {
        themeObs.observe(document.body, { attributes: true, attributeFilter: ['data-theme'] });
      }
    }
  });
})();
