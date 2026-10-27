(function () {
  'use strict';

  var LOCKUP = '/assets/uphsd-logo.png';
  var SEAL = '/assets/uphsd-seal.png';

  /* ---- 1. inject CSS (idempotent) ---------------------------- */
  function ensureCSS() {
    if (document.getElementById('uphsdBrandCSS')) return;
    var st = document.createElement('style');
    st.id = 'uphsdBrandCSS';
    st.textContent =
      '.uphsd-lockup{display:block;width:min(100%,220px);height:auto;' +
        'background:#fff;border-radius:10px;padding:8px 10px;box-sizing:border-box;' +
        'box-shadow:inset 0 0 0 1px rgba(0,0,0,.08),0 1px 4px rgba(0,0,0,.18)}' +
      '[data-theme="light"] .uphsd-lockup{box-shadow:inset 0 0 0 1px rgba(0,0,0,.10)}' +
      '.uphsd-tile-hidden{display:none !important}';
    document.head.appendChild(st);
  }

  /* ---- 2. replace tile + text with the lockup image ---------- */
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
        img.src = LOCKUP;
        img.alt = 'University of Perpetual Help System Dalta';
        img.className = 'uphsd-lockup';
        img.draggable = false;
        row.insertBefore(img, el);
        row.dataset.uphsdLockup = '1';
      }
    }
  }

  var t = null;
  function swapDebounced() {
    clearTimeout(t);
    t = setTimeout(swapOnce, 120);
  }

  /* ---- 3. favicon -------------------------------------------- */
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
    // Some sidebars are rendered by JS after the /api/me fetch —
    // watch the DOM and re-swap if a new tile appears later.
    if (window.MutationObserver) {
      new MutationObserver(swapDebounced)
        .observe(document.documentElement, { childList: true, subtree: true });
    }
  });
})();
