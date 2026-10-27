/* ============================================================
   brand.js v2 — UPHSD branding for every page (buddy's SIS)
   ------------------------------------------------------------
   What it does (no HTML edits needed):
   1. Finds the old letter tile (the "R" / "A" square) on any page
      and replaces it with the real UPHSD seal.
   2. Puts the SCHOOL NAME next to the seal, so the brand area
      reads like the official lockup:
         [seal] University of Perpetual Help
                SYSTEM DALTA · ADMISSION
      - If the brand row already has a text block ("Admission /
        ADMIN"), its text is replaced with the school name.
      - If the brand row has no text at all, one is created.
   3. Sets the browser tab favicon to the UPHSD seal.
   4. Injects all CSS it needs (white round chip, name styles) —
      works on BOTH dark and light themes.

   Requires: /assets/uphsd-seal.png  (in src/assets/)
   Load AFTER store.js:   <script src="js/brand.js?v=2"></script>
   ============================================================ */
(function () {
  'use strict';

  var SEAL = '/assets/uphsd-seal.png';
  var NAME_1 = 'University of Perpetual Help';
  var NAME_2 = 'System Dalta · Admission';

  /* ---- 1. inject CSS (idempotent) ---------------------------- */
  function ensureCSS() {
    if (document.getElementById('uphsdBrandCSS')) return;
    var st = document.createElement('style');
    st.id = 'uphsdBrandCSS';
    st.textContent =
      '.uphsd-logo{display:flex;align-items:center;justify-content:center;' +
        'background:#fff !important;border-radius:50% !important;padding:3px;' +
        'box-shadow:inset 0 0 0 1px rgba(0,0,0,.10);overflow:hidden;flex:none}' +
      '.uphsd-logo img{width:100%;height:100%;object-fit:contain;display:block}' +
      '.uphsd-name{min-width:0;line-height:1.15}' +
      '.uphsd-name b{display:block;font-size:13px;font-weight:700;' +
        'letter-spacing:.2px;color:var(--text,var(--fg,#fff));white-space:nowrap;' +
        'overflow:hidden;text-overflow:ellipsis}' +
      '.uphsd-name span{display:block;font-size:9.5px;font-weight:600;' +
        'letter-spacing:.6px;text-transform:uppercase;margin-top:3px;' +
        'color:var(--muted,var(--muted-fg,#9aa0a6))}';
    document.head.appendChild(st);
  }

  /* ---- 2. swap tiles + set the school name ------------------- */
  var SELECTORS =
    '.brand-logo,.brand-icon,.brand-mark,.app-logo,.side-logo,' +
    '.logo-tile,.auth-logo,.login-logo,[data-brand-logo],.logo';

  function makeName() {
    var d = document.createElement('div');
    d.className = 'uphsd-name';
    d.dataset.uphsdName = '1';
    d.innerHTML = '<b>' + NAME_1 + '</b><span>' + NAME_2 + '</span>';
    return d;
  }

  function nameBlockFor(row, tile) {
    /* a) reuse an existing text container if there is one */
    var t = row.querySelector('.brand-text,.brand-title,.brand-sub,.app-title');
    if (t) return t.closest('.brand-text') || t;
    /* b) else first sibling element that actually has text */
    for (var i = 0; i < row.children.length; i++) {
      var k = row.children[i];
      if (k === tile || k.contains(tile)) continue;
      if (k.classList && (k.classList.contains('uphsd-logo') || k.classList.contains('uphsd-name'))) continue;
      if ((k.textContent || '').trim()) return k;
    }
    /* c) nothing found → caller creates one */
    return null;
  }

  function swapOnce() {
    var tiles = document.querySelectorAll(SELECTORS);
    for (var i = 0; i < tiles.length; i++) {
      var el = tiles[i];
      if (el.dataset.uphsdDone) continue;
      el.dataset.uphsdDone = '1';

      /* seal into the tile */
      if (el.tagName === 'IMG') {
        el.src = SEAL;
        el.alt = 'UPHSD seal';
      } else {
        el.textContent = '';
        el.classList.add('uphsd-logo');
        var img = document.createElement('img');
        img.src = SEAL;
        img.alt = 'UPHSD seal';
        img.draggable = false;
        el.appendChild(img);
      }

      /* school name beside the seal */
      var row = el.closest('.brand,.brand-row,.brand-header,.sidebar-header,.side-header') || el.parentElement;
      if (row && !row.dataset.uphsdNamed) {
        var tb = nameBlockFor(row, el);
        if (tb) {
          tb.dataset.uphsdName = '1';
          tb.innerHTML = '<b>' + NAME_1 + '</b><span>' + NAME_2 + '</span>';
          tb.classList.add('uphsd-name');
        } else {
          var nb = makeName();
          el.insertAdjacentElement('afterend', nb);
        }
        row.dataset.uphsdNamed = '1';
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
