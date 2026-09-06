/* ============================================================
   export.js — formatted Excel / PDF / print reports of ALL users
   Requires store.js. PDF uses jsPDF + AutoTable (CDN); if the
   library isn't loaded (offline), PDF falls back to print dialog.
   ============================================================ */
(function () {

    /* ---------- human-readable field labels ---------- */
    const FIXED = {
        course:'Course', major:'Major / Specialization', email:'Email Address', mobile:'Mobile Number',
        dob:'Date of Birth', placeOfBirth:'Place of Birth', nativeLanguage:'Native Language',
        civilStatus:'Civil Status', birthOrder:'Birth Order', yearLevel:'Year Level',
        schoolYear:'School Year', curriculumYear:'Curriculum Year',
        guardianName:'Guardian Name', guardianRelation:'Guardian Relation',
        honorsAwards:'Honors / Awards / Merits', extracurricular:'Extra-Curricular Activities',
        whyCourse:'Why Taking This Course', siblings:'Siblings',
        fatherName:"Father's Name", fatherOccupation:"Father's Occupation", fatherCompany:"Father's Company",
        fatherCompanyAddress:"Father's Company Address", fatherPhone:"Father's Telephone", fatherEmail:"Father's Email",
        motherName:"Mother's Name", motherOccupation:"Mother's Occupation", motherCompany:"Mother's Company",
        motherCompanyAddress:"Mother's Company Address", motherPhone:"Mother's Telephone", motherEmail:"Mother's Email",
        refName1:'Reference 1 — Name', refContact1:'Reference 1 — Address / Tel No.',
        refName2:'Reference 2 — Name', refContact2:'Reference 2 — Address / Tel No.',
        refName3:'Reference 3 — Name', refContact3:'Reference 3 — Address / Tel No.',
    };
    const PREFIX = { elem:'Elementary', hs:'High School', voc:'Vocational', col:'College',
                     pg:'Post-Graduate', cur:'Current', emg:'Emergency', home:'Home' };

    function label(f) {
        if (FIXED[f]) return FIXED[f];
        let out = f;
        for (const p in PREFIX) if (out.startsWith(p)) { out = PREFIX[p] + ' ' + out.slice(p.length); break; }
        out = out.replace(/([a-z])([A-Z])/g, '$1 $2');
        return out.charAt(0).toUpperCase() + out.slice(1);
    }

    function stringify(f, v) {
        if (v === undefined || v === null) return '';
        if (Array.isArray(v))   // siblings
            return v.map(x => [x.name, x.dob ? '(' + x.dob + ')' : null, x.course, x.school].filter(Boolean).join(' ')).join(' | ');
        return String(v);
    }

    /* ---------- build the full table (used by Excel & CSV) ---------- */
    function usersTable() {
        const groups = [{ title: 'ACCOUNT', span: 6 }];
        const head = ['Student No', 'Full Name', 'Email', 'Registered', 'Progress', 'Last Saved'];
        for (const s of SIS.SECTIONS) {
            groups.push({ title: s.num + ' · ' + s.label, span: s.fields.length });
            for (const f of s.fields) head.push(label(f));
        }
        const rows = [];
        for (const u of SIS.users()) {
            const d = SIS.getData(u.studentNo);
            const p = SIS.progress(u.studentNo);
            let last = 0;
            for (const v of Object.values(d)) if (v && v._savedAt > last) last = v._savedAt;
            const row = [u.studentNo, u.fullName || '', u.email || '',
                         u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '',
                         p.percent + '%', last ? new Date(last).toLocaleString() : ''];
            for (const s of SIS.SECTIONS) for (const f of s.fields) row.push(stringify(f, (d[s.key] || {})[f]));
            rows.push(row);
        }
        return { groups, head, rows };
    }

    /* ================= EXCEL (.xls, formatted) ================= */
    function toExcel() {
        const { groups, head, rows } = usersTable();
        const X = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
        const widths = [85, 135, 175, 95, 70, 135];

        let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<?mso-application progid="Excel.Sheet"?>\n' +
            '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">' +
            '<Styles>' +
              '<Style ss:ID="grp"><Font ss:Bold="1" ss:Color="#FFFFFF"/><Interior ss:Color="#2F3345" ss:Pattern="Solid"/><Alignment ss:Horizontal="Center" ss:Vertical="Center"/></Style>' +
              '<Style ss:ID="hdr"><Font ss:Bold="1" ss:Color="#FFFFFF"/><Interior ss:Color="#545BF0" ss:Pattern="Solid"/><Alignment ss:Vertical="Center" ss:WrapText="1"/></Style>' +
              '<Style ss:ID="cell"><Alignment ss:Vertical="Top" ss:WrapText="1"/>' +
                '<Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D9D9DE"/></Borders></Style>' +
            '</Styles>' +
            '<Worksheet ss:Name="SIS Users"><Table>';
        head.forEach((h, i) => { xml += `<Column ss:Width="${widths[i] || 115}"/>`; });

        xml += '<Row ss:Height="18">';                       // grouped section titles (merged)
        for (const g of groups)
            xml += (g.span > 1 ? `<Cell ss:MergeAcross="${g.span - 1}" ss:StyleID="grp">` : '<Cell ss:StyleID="grp">') +
                   `<Data ss:Type="String">${X(g.title)}</Data></Cell>`;
        xml += '</Row><Row ss:Height="28">';                 // field names
        for (const h of head) xml += `<Cell ss:StyleID="hdr"><Data ss:Type="String">${X(h)}</Data></Cell>`;
        xml += '</Row>';
        for (const r of rows) {                              // one row per user
            xml += '<Row>';
            for (const v of r) xml += `<Cell ss:StyleID="cell"><Data ss:Type="String">${X(v)}</Data></Cell>`;
            xml += '</Row>';
        }
        xml += '</Table><WorksheetOptions xmlns="urn:schemas-microsoft-com:office:excel">' +
               '<FreezePanes/><FrozenNoSplit/><SplitHorizontal>2</SplitHorizontal>' +
               '<TopRowBottomPane>2</TopRowBottomPane><ActivePane>2</ActivePane></WorksheetOptions>' +
               '</Worksheet></Workbook>';

        const a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([xml], { type: 'application/vnd.ms-excel' }));
        a.download = 'sis-users.xls';
        a.click();
        URL.revokeObjectURL(a.href);
        SIS.toast('Excel file downloaded.');
    }

    /* ================= PDF (formatted report) ================= */
    function toPdf() {
        if (!(window.jspdf && window.jspdf.jsPDF)) {
            SIS.toast('PDF library not loaded (offline?) — opening print dialog instead.');
            return printReport();
        }
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
        const users = SIS.users();

        doc.setFont('helvetica', 'bold'); doc.setFontSize(16); doc.setTextColor(25);
        doc.text('REGISTRAR — Student Information System', 40, 46);
        doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(110);
        doc.text(`Users report · ${users.length} account(s) · generated ${new Date().toLocaleString()}`, 40, 62);

        if (!users.length) doc.text('No accounts registered yet.', 40, 95);

        let first = true;
        for (const u of users) {
            if (!first) doc.addPage();
            first = false;
            let y = 52;
            const d = SIS.getData(u.studentNo);
            const p = SIS.progress(u.studentNo);

            doc.setFont('helvetica', 'bold'); doc.setFontSize(14); doc.setTextColor(25);
            doc.text(u.fullName || u.studentNo, 40, y);
            doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(110);
            y += 14;
            doc.text(`Student No: ${u.studentNo}    Email: ${u.email || '—'}    Registered: ${u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—'}    Progress: ${p.percent}%`, 40, y);
            y += 14;

            let any = false;
            for (const s of SIS.SECTIONS) {
                const body = [];
                for (const f of s.fields) {
                    const v = stringify(f, (d[s.key] || {})[f]);
                    if (v !== '') body.push([label(f), v]);
                }
                if (!body.length) continue;
                any = true;
                doc.autoTable({
                    startY: y,
                    head: [[s.num + ' · ' + s.label.toUpperCase(), '']],
                    body,
                    theme: 'grid',
                    styles: { fontSize: 8, cellPadding: 4, valign: 'top', textColor: 40, lineColor: [215, 217, 228], lineWidth: .5 },
                    headStyles: { fillColor: [84, 91, 240], textColor: 255, fontSize: 9 },
                    columnStyles: { 0: { cellWidth: 160, fontStyle: 'bold', fillColor: [244, 245, 250] } },
                    margin: { left: 40, right: 40 },
                });
                y = doc.lastAutoTable.finalY + 14;
            }
            if (!any) {
                doc.setFontSize(9); doc.setTextColor(130);
                doc.text('No information sheet data yet.', 40, y + 4);
            }
        }

        const total = doc.internal.getNumberOfPages();       // page numbers
        for (let i = 1; i <= total; i++) {
            doc.setPage(i); doc.setFontSize(8); doc.setTextColor(140);
            doc.text(`Page ${i} of ${total}`,
                doc.internal.pageSize.getWidth() - 90, doc.internal.pageSize.getHeight() - 16);
        }
        doc.save('sis-users.pdf');
        SIS.toast('PDF report downloaded.');
    }

    /* ================= PRINT (fallback / paper) ================= */
    function reportHtml() {
        const users = SIS.users();
        let html = `<div class="rp-head"><h1>REGISTRAR — STUDENT INFORMATION SYSTEM</h1>
            <p>Users report · ${users.length} account(s) · generated ${new Date().toLocaleString()}</p></div>`;
        for (const u of users) {
            const d = SIS.getData(u.studentNo);
            const p = SIS.progress(u.studentNo);
            let body = '', any = false;
            for (const s of SIS.SECTIONS) {
                const trs = [];
                for (const f of s.fields) {
                    const v = stringify(f, (d[s.key] || {})[f]);
                    if (v !== '') trs.push(`<tr><td class="rp-k">${SIS.esc(label(f))}</td><td>${SIS.esc(v)}</td></tr>`);
                }
                if (!trs.length) continue;
                any = true;
                body += `<tr class="rp-sec"><td colspan="2">${s.num} · ${SIS.esc(s.label.toUpperCase())}</td></tr>` + trs.join('');
            }
            html += `<div class="rp-user">
                <h3>${SIS.esc(u.fullName || u.studentNo)} <span>· ${SIS.esc(u.studentNo)}</span></h3>
                <p class="rp-meta">${SIS.esc(u.email || '—')} · Registered ${u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—'} · ${p.percent}% complete</p>
                ${any ? `<table>${body}</table>` : '<p class="rp-meta">No information sheet data yet.</p>'}
            </div>`;
        }
        return html;
    }

    function printReport() {
        document.getElementById('printReport')?.remove();
        const holder = document.createElement('div');
        holder.id = 'printReport';
        holder.innerHTML = reportHtml();
        document.body.appendChild(holder);
        document.body.classList.add('printing');
        const cleanup = () => { holder.remove(); document.body.classList.remove('printing'); window.removeEventListener('afterprint', cleanup); };
        window.addEventListener('afterprint', cleanup);
        window.print();
    }

    SIS.report = { usersTable, toExcel, toPdf, print: printReport };
})();