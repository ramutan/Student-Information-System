(function () {
  'use strict';

  /* ------------------------------------------------------------------
   * locate the SIS object (store.js may declare it with const,
   * which does NOT attach it to window — so check both)
   * ------------------------------------------------------------------ */
  var S = null;
  try { if (typeof SIS !== 'undefined') S = SIS; } catch (e) { /* not loaded */ }
  if (!S && window.SIS) S = window.SIS;
  if (!S) return;                       // nothing to fix on this page

  var MAROON = [140, 27, 43];           // UPHSD maroon for headers
  var SEAL = '/assets/uphsd-seal.png';
  var LOCKUP = '/assets/uphsd-logo.png'; // seal + school name (full logo)
  var SCHOOL = 'University of Perpetual Help System Dalta';
  var OFFICE = 'Admission Office — Student Information Sheet';

  /* ------------------------------------------------------------------
   * small helpers
   * ------------------------------------------------------------------ */
  function toast(msg) {
    try { if (typeof S.toast === 'function') S.toast(msg); } catch (e) { /* noop */ }
  }

  var lastFire = 0;
  function guard() {
    var now = Date.now();
    if (now - lastFire < 700) return false;   // debounce double-click
    lastFire = now;
    return true;
  }

  function stamp() {
    var d = new Date();
    var p = function (n) { return (n < 10 ? '0' : '') + n; };
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
  }

  function download(filename, blob) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
  }

  function xmlEscape(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&apos;');
  }

  function csvCell(v) {
    var s = String(v == null ? '' : v);
    return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }

  /* flatten any value (nested object / array like siblings or
     extra schools) into one readable line                        */
  function flat(v) {
    if (v == null || v === '') return '';
    if (typeof v !== 'object') return String(v);
    if (Array.isArray(v)) {
      return v.map(function (x) {
        if (x == null || x === '') return '';
        if (typeof x !== 'object') return String(x);
        return Object.values(x).filter(function (p) { return p !== '' && p != null; }).join(' ');
      }).filter(Boolean).join('; ');
    }
    return Object.values(v).filter(function (p) { return p !== '' && p != null; }).join(' ');
  }

  /* ------------------------------------------------------------------
   * figure out WHICH section we are on + get its saved data
   * (works with the store.js SECTIONS registry, with fallbacks)
   * ------------------------------------------------------------------ */
  function sectionKey() {
    if (S.currentSection) return S.currentSection;
    if (S.current) return S.current;
    if (document.body.dataset.section) return document.body.dataset.section;
    var file = (location.pathname.split('/').pop() || '').toLowerCase();
    var m = file.match(/^([a-z]+)\.html/);
    return m ? m[1] : '';
  }

  function getRecords() {
    try {
      if (typeof S.getRecords === 'function') {
        var r = S.getRecords();
        if (r) return r;
      }
    } catch (e) { /* fall through */ }
    if (S.records) return S.records;
    if (S.state && S.state.records) return S.state.records;
    if (S.data && S.data.records) return S.data.records;
    return {};
  }

  function getMeta(key) {
    var secs = S.SECTIONS || S.sections || [];
    var arr = Array.isArray(secs) ? secs : Object.values(secs);
    return arr.find(function (s) {
      return s.key === key || (s.href || '').toLowerCase().indexOf(key) !== -1;
    }) || null;
  }

  function userRows() {
    var u = null;
    try { u = S.user || (S.state && S.state.user) || null; } catch (e) { /* noop */ }
    if (!u) return [];
    var rows = [];
    if (u.full_name || u.name) rows.push(['Student name', u.full_name || u.name]);
    if (u.student_no) rows.push(['Student number', u.student_no]);
    if (u.email) rows.push(['Email', u.email]);
    return rows;
  }

  /* returns { title, rows:[[label, value], ...] } */
  function collect() {
    var key = sectionKey();
    var meta = getMeta(key);
    var title = (meta && (meta.label || meta.title || meta.name)) || key || 'Record';
    var data = (getRecords() && getRecords()[key]) || {};
    var rows = userRows();

    var fields = (meta && (meta.fields || meta.fieldList)) || null;
    if (fields && fields.length) {
      fields.forEach(function (f) {
        var name = (typeof f === 'string') ? f : (f.name || f.key || f.id);
        var label = (typeof f === 'string') ? f : (f.label || f.title || name);
        rows.push([label, flat(data[name])]);
      });
    } else {
      Object.keys(data).forEach(function (k) {
        rows.push([k, flat(data[k])]);
      });
    }
    return { title: title, key: key || 'record', rows: rows };
  }

  /* ==================================================================
   * EXCEL  (.xls SpreadsheetML — opens in Excel / WPS / Google Sheets)
   * ================================================================== */
  function exportExcel() {
    if (!guard()) return;
    try {
      var c = collect();
      var sheet = (c.title || c.key).replace(/[\[\]\*\?\/\\:]/g, '').slice(0, 31) || 'Sheet1';

      var xml =
        '<?xml version="1.0"?>\n' +
        '<?mso-application progid="Excel.Sheet"?>\n' +
        '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"\n' +
        ' xmlns:o="urn:schemas-microsoft-com:office:office"\n' +
        ' xmlns:x="urn:schemas-microsoft-com:office:excel"\n' +
        ' xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">\n' +
        '<Styles>\n' +
        ' <Style ss:ID="school"><Font ss:Bold="1" ss:Size="13" ss:Color="#8C1B2B"/></Style>\n' +
        ' <Style ss:ID="title"><Font ss:Bold="1" ss:Size="12"/></Style>\n' +
        ' <Style ss:ID="head"><Font ss:Bold="1" ss:Color="#FFFFFF"/>' +
        '<Interior ss:Color="#8C1B2B" ss:Pattern="Solid"/>' +
        '<Alignment ss:Vertical="Center"/></Style>\n' +
        '</Styles>\n' +
        '<Worksheet ss:Name="' + xmlEscape(sheet) + '">\n' +
        '<Table>\n' +
        ' <Column ss:Width="200"/><Column ss:Width="380"/>\n' +
        ' <Row><Cell ss:StyleID="school"><Data ss:Type="String">' + xmlEscape(SCHOOL) + '</Data></Cell></Row>\n' +
        ' <Row><Cell ss:StyleID="title"><Data ss:Type="String">' + xmlEscape(c.title + ' — exported ' + stamp()) + '</Data></Cell></Row>\n' +
        ' <Row><Cell ss:StyleID="head"><Data ss:Type="String">Field</Data></Cell>' +
        '<Cell ss:StyleID="head"><Data ss:Type="String">Information</Data></Cell></Row>\n';

      c.rows.forEach(function (r) {
        xml += ' <Row><Cell><Data ss:Type="String">' + xmlEscape(r[0]) + '</Data></Cell>' +
               '<Cell><Data ss:Type="String">' + xmlEscape(r[1]) + '</Data></Cell></Row>\n';
      });

      xml +=
        '</Table>\n' +
        '<WorksheetOptions xmlns="urn:schemas-microsoft-com:office:excel">\n' +
        ' <FreezePanes/><FrozenNoSplit/><SplitHorizontal>3</SplitHorizontal>' +
        '<TopRowBottomPane>3</TopRowBottomPane><ActivePane>2</ActivePane>\n' +
        '</WorksheetOptions>\n' +
        '</Worksheet>\n</Workbook>';

      download('UPHSD-' + c.key + '-' + stamp() + '.xls',
        new Blob(['\ufeff', xml], { type: 'application/vnd.ms-excel' }));
      toast('Excel downloaded ✓');
    } catch (e) {
      console.error('[exports] Excel failed:', e);
      toast('Excel export failed — see Console (F12)');
    }
  }

  /* ==================================================================
   * CSV
   * ================================================================== */
  function exportCSV() {
    if (!guard()) return;
    try {
      var c = collect();
      var lines = [['Field', 'Information'].map(csvCell).join(',')];
      c.rows.forEach(function (r) {
        lines.push([r[0], r[1]].map(csvCell).join(','));
      });
      download('UPHSD-' + c.key + '-' + stamp() + '.csv',
        new Blob(['\ufeff', lines.join('\r\n')], { type: 'text/csv;charset=utf-8' }));
      toast('CSV downloaded ✓');
    } catch (e) {
      console.error('[exports] CSV failed:', e);
      toast('CSV export failed — see Console (F12)');
    }
  }

  /* ==================================================================
   * PDF  (loads jsPDF + AutoTable on demand)
   * ================================================================== */
  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      var done = false;
      var s = document.createElement('script');
      s.src = src;
      s.onload = function () { if (!done) { done = true; resolve(); } };
      s.onerror = function () { if (!done) { done = true; reject(new Error('Could not load ' + src)); } };
      document.head.appendChild(s);
      setTimeout(function () { if (!done) { done = true; reject(new Error('Timed out loading ' + src)); } }, 12000);
    });
  }

  async function ensurePdfLibs() {
    if (!(window.jspdf && window.jspdf.jsPDF)) {
      await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
    }
    if (!(window.jspdf && window.jspdf.jsPDF && window.jspdf.jsPDF.API && window.jspdf.jsPDF.API.autoTable)) {
      await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.31/jspdf.plugin.autotable.min.js');
    }
    if (!(window.jspdf && window.jspdf.jsPDF)) throw new Error('jsPDF unavailable');
  }

  async function imgDataURL(path) {
    try {
      var res = await fetch(path, { credentials: 'same-origin' });
      if (!res.ok) return null;
      var blob = await res.blob();
      return await new Promise(function (resolve, reject) {
        var fr = new FileReader();
        fr.onload = function () { resolve(fr.result); };
        fr.onerror = reject;
        fr.readAsDataURL(blob);
      });
    } catch (e) { return null; }        // no image → caller falls back
  }

  async function exportPDF() {
    if (!guard()) return;
    try {
      await ensurePdfLibs();
      var jsPDF = window.jspdf.jsPDF;
      var doc = new jsPDF({ unit: 'pt', format: 'a4' });
      var c = collect();

      /* header — full UPHSD lockup (seal + school name), fallback: seal + text */
      var lockup = await imgDataURL(LOCKUP);
      if (lockup) {
        try {
          doc.addImage(lockup, 'PNG', 40, 30, 196, 52);
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(9);
          doc.setTextColor(90, 90, 90);
          doc.text(OFFICE, 40, 96);
        } catch (e) { /* fall through to seal + text */ lockup = null; }
      }
      if (!lockup) {
        var seal = await imgDataURL(SEAL);
        if (seal) {
          try { doc.addImage(seal, 'PNG', 40, 34, 62, 62); } catch (e) { /* skip logo */ }
        }
        doc.setTextColor(MAROON[0], MAROON[1], MAROON[2]);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.text(SCHOOL, 116, 52);
        doc.setFontSize(10);
        doc.setTextColor(90, 90, 90);
        doc.setFont('helvetica', 'normal');
        doc.text(OFFICE, 116, 68);
      }

      doc.setTextColor(30, 30, 30);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text(c.title, 40, 122);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(120, 120, 120);
      doc.text('Generated on ' + stamp(), 40, 136);

      doc.autoTable({
        startY: 150,
        head: [['Field', 'Information']],
        body: c.rows,
        margin: { left: 40, right: 40 },
        styles: { fontSize: 9, cellPadding: 5, overflow: 'linebreak', textColor: [30, 30, 30] },
        headStyles: { fillColor: MAROON, textColor: 255, fontStyle: 'bold' },
        columnStyles: { 0: { cellWidth: 170, fontStyle: 'bold' } },
        alternateRowStyles: { fillColor: [250, 243, 245] }
      });

      doc.save('UPHSD-' + c.key + '-' + stamp() + '.pdf');
      toast('PDF downloaded ✓');
    } catch (e) {
      console.error('[exports] PDF failed:', e);
      toast('PDF failed: ' + e.message);
    }
  }

  /* ==================================================================
   * PRINT  (clean report sheet only)
   * ================================================================== */
  function ensurePrintCSS() {
    if (document.getElementById('uphsdPrintCSS')) return;
    var st = document.createElement('style');
    st.id = 'uphsdPrintCSS';
    st.textContent =
      '#printReport{display:none}' +
      '@media print{' +
      ' body.printing *{visibility:hidden !important}' +
      ' body.printing #printReport, body.printing #printReport *{visibility:visible !important}' +
      ' body.printing #printReport{display:block !important;position:absolute;left:0;top:0;width:100%;' +
      '   padding:28px;background:#fff;color:#111}' +
      ' #printReport table{width:100%;border-collapse:collapse;font-size:12px}' +
      ' #printReport th,#printReport td{border:1px solid #999;padding:6px 8px;text-align:left;vertical-align:top}' +
      ' #printReport th{background:#f5e6e9;color:#5b1220}' +
      ' #printReport .pr-school{font-size:17px;font-weight:700;color:#8C1B2B}' +
      ' #printReport .pr-office{font-size:11px;color:#555;margin-bottom:14px}' +
      '}';
    document.head.appendChild(st);
  }

  function printReport() {
    if (!guard()) return;
    try {
      ensurePrintCSS();
      var c = collect();
      var box = document.getElementById('printReport');
      if (!box) {
        box = document.createElement('div');
        box.id = 'printReport';
        document.body.appendChild(box);
      }
      var html =
        '<div style="margin-bottom:8px">' +
        '  <img src="' + LOCKUP + '" alt="' + SCHOOL + '" style="width:250px;max-width:100%;object-fit:contain"' +
        '    onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'block\'">' +
        '  <div class="pr-school" style="display:none">' + SCHOOL + '</div>' +
        '  <div class="pr-office">' + OFFICE + '</div>' +
        '</div>' +
        '<div style="font-weight:700;font-size:15px;margin:10px 0 2px">' + c.title + '</div>' +
        '<div style="font-size:11px;color:#666;margin-bottom:10px">Generated on ' + stamp() + '</div>' +
        '<table><thead><tr><th style="width:32%">Field</th><th>Information</th></tr></thead><tbody>';
      c.rows.forEach(function (r) {
        html += '<tr><td>' + String(r[0]) + '</td><td>' + String(r[1]) + '</td></tr>';
      });
      html += '</tbody></table>';
      box.innerHTML = html;

      document.body.classList.add('printing');
      var cleanup = function () {
        document.body.classList.remove('printing');
        window.removeEventListener('afterprint', cleanup);
      };
      window.addEventListener('afterprint', cleanup);
      window.print();
      setTimeout(cleanup, 2000);          // safety net if afterprint is missed
    } catch (e) {
      console.error('[exports] Print failed:', e);
      toast('Print failed — see Console (F12)');
    }
  }

  /* ==================================================================
   * ADMIN — export ALL users as CSV
   * ================================================================== */
  async function exportUsersCSV() {
    if (!guard()) return;
    try {
      var res = await fetch('/api/admin/data', { credentials: 'include' });
      if (!res.ok) throw new Error('request failed (' + res.status + ')');
      var j = await res.json();
      var users = j.users || j.data || j || [];
      if (!Array.isArray(users)) users = Object.values(users);

      var head = ['student_no', 'name', 'email', 'role', 'sections_saved', 'consented_at'];
      var lines = [head.join(',')];
      users.forEach(function (u) {
        var recs = u.records;
        var count = recs ? (Array.isArray(recs) ? recs.length : Object.keys(recs).length) : (u.record_count || 0);
        lines.push([u.student_no, u.full_name || u.name, u.email, u.role || 'student',
          count, u.consented_at || ''].map(csvCell).join(','));
      });
      download('UPHSD-users-' + stamp() + '.csv',
        new Blob(['\ufeff', lines.join('\r\n')], { type: 'text/csv;charset=utf-8' }));
      toast('Users CSV downloaded ✓');
    } catch (e) {
      console.error('[exports] Users CSV failed:', e);
      toast('Users export failed: ' + e.message);
    }
  }

  /* ==================================================================
   * install — override the old functions + (re)bind the buttons
   * ================================================================== */
  var api = {
    exportExcel: exportExcel,
    exportCSV: exportCSV,
    exportPDF: exportPDF,
    printReport: printReport,
    exportUsersCSV: exportUsersCSV
  };
  try {
    Object.assign(S, api);              // SIS.exportExcel() etc. now use the fixed code
    window.SIS = S;
  } catch (e) { console.error('[exports] could not override SIS:', e); }
  // bare-name aliases in case buttons call exportExcel() directly
  window.exportExcel = exportExcel;
  window.exportCSV = exportCSV;
  window.exportPDF = exportPDF;
  window.printReport = printReport;

  function wire() {
    var map = {
      excel: exportExcel, csv: exportCSV, pdf: exportPDF,
      print: printReport, users: exportUsersCSV
    };
    document.querySelectorAll('[data-export]').forEach(function (b) {
      var fn = map[(b.dataset.export || '').toLowerCase()];
      if (fn) b.onclick = function (e) { e.preventDefault(); fn(); };
    });
    var ids = {
      btnExcel: exportExcel, btnCSV: exportCSV, btnCsv: exportCSV,
      btnPDF: exportPDF, btnPdf: exportPDF, btnPrint: printReport,
      btnUsersCsv: exportUsersCSV, btnUsersCSV: exportUsersCSV
    };
    Object.keys(ids).forEach(function (id) {
      var b = document.getElementById(id);
      if (b) b.onclick = function (e) { e.preventDefault(); ids[id](); };
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', wire);
  } else { wire(); }
})();
