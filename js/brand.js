/* ============================================================
   brand.js — UPHSD branding for every page (buddy's SIS)
   ------------------------------------------------------------
   What it does (no HTML edits needed):
   1. Finds the old letter tile (the "R" / "A" square) on any page
      and replaces it with the real UPHSD seal.
   2. Sets the browser tab favicon to the UPHSD seal.
   3. Injects the small CSS it needs (white round chip so the seal
      looks good on BOTH dark and light themes).

   Requires: /assets/uphsd-seal.png  (put the PNG in  src/assets/)
   Load AFTER store.js:   <script src="js/brand.js?v=1"></script>
   ============================================================ */
(function () {
  'use strict';

  var SEAL = '/assets/uphsd-seal.png';

  /* ---- 1. inject CSS (idempotent) ---------------------------- */
  function ensureCSS() {
    if (document.getElementById('uphsdBrandCSS')) return;
    var st = document.createElement('style');
    st.id = 'uphsdBrandCSS';
    st.textContent =
      '.uphsd-logo{display:flex;align-items:center;justify-content:center;' +
        'background:#fff !important;border-radius:50% !important;padding:3px;' +
        'box-shadow:inset 0 0 0 1px rgba(0,0,0,.10);overflow:hidden;flex:none}' +
      '.uphsd-logo img{width:100%;height:100%;object-fit:contain;display:block}';
    document.head.appendChild(st);
  }

  /* ---- 2. swap the letter tile(s) for the seal --------------- */
  var SELECTORS =
    '.brand-logo,.brand-icon,.brand-mark,.app-logo,.side-logo,' +
    '.logo-tile,.auth-logo,.login-logo,[data-brand-logo],.logo';

  function swapOnce() {
    var tiles = document.querySelectorAll(SELECTORS);
    for (var i = 0; i < tiles.length; i++) {
      var el = tiles[i];
      if (el.dataset.uphsdDone) continue;
      el.dataset.uphsdDone = '1';
      if (el.tagName === 'IMG') {           // already an image → just point it at the seal
        el.src = SEAL;
        el.alt = 'UPHSD seal';
        continue;
      }
      el.textContent = '';
      el.classList.add('uphsd-logo');
      var img = document.createElement('img');
      img.src = SEAL;
      img.alt = 'UPHSD seal';
      img.draggable = false;
      el.appendChild(img);
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
