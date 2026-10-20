/* seni-dewan.js — dasbor Dewan seni (Monitor, Data Peserta, Riwayat Data).
   Semua aksi hanya untuk arena pada sesi. Pemeriksaan sesi hanya demo; keamanan asli di backend PHP. */
(() => {
  'use strict';
  const S = ATSC_AUTH.require('dewan', 'seni');
  if (!S) return;
  const n = S.arena, by = S.name, $ = UI.$, esc = UI.esc, C = SENI.RULES.components, f = SENI.fmtNum;
  UI.topbar({ title: 'DEWAN SENI', session: S });
  $('liveLink').href = 'live-score-seni.html?arena=' + n;
  let filter = 'semua', listKey = '', editFilled = '';

  const guard = () => { if (!ATSC_AUTH.can('dewan', n, 'seni')) { UI.toast('Aksi ditolak: sesi bukan Dewan seni arena ini.', 'err'); return false; } return true; };
  const report = r => { if (r && r.msg) UI.toast(r.msg, r.ok ? 'ok' : 'err'); render(); };
  const showErr = (id, errs) => { const el = $(id); el.hidden = !errs || !errs.length; el.innerHTML = (errs || []).map(x => `<li>${esc(x)}</li>`).join(''); };
  const dateStr = ts => ts ? new Date(ts).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

  function showTab(t) {
    document.querySelectorAll('[data-tab]').forEach(b => b.classList.toggle('active', b.dataset.tab === t));
    document.querySelectorAll('.pane').forEach(p => p.hidden = p.id !== 'pane-' + t);
  }
  document.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => showTab(b.dataset.tab));

  /* ---------------- MONITOR ---------------- */
  function renderMonitor(a) {
    const m = a.match, st = SENI.effStatus(a), sc = SENI.compute(a);
    const sEl = $('mStatus'); UI.setText(sEl, SENI.STATUS[st]); sEl.dataset.st = st;
    UI.setText($('mKat'), m ? m.kategori.toUpperCase() : 'KATEGORI SENI');
    UI.setText($('mNama'), m ? m.nama : '—'); UI.setText($('mKont'), m ? m.kontingen : '');
    UI.setText($('mTimer'), m ? SENI.fmt(SENI.elapsed(a)) : '00:00');
    UI.setText($('mLimit'), m ? (m.durasiMenit > 0 ? 'Timer maju · batas ' + SENI.fmt(SENI.limitMs(a)) : 'Timer maju · tanpa batas') : '');

    const cfg = { siap: ['Mulai Penampilan', 'start'], berlangsung: ['Jeda Timer', 'pause'], dijeda: ['Lanjutkan Penampilan', 'resume'] }[st];
    const mb = $('mainBtn'); mb.disabled = !cfg; mb.dataset.act = cfg ? cfg[1] : ''; UI.setText(mb, cfg ? cfg[0] : 'MULAI / JEDA');
    $('resetBtn').disabled = !m || st === 'berlangsung'; $('lepasBtn').disabled = !m || st !== 'siap';

    UI.setHTML($('jBoxes'), Array.from({ length: SENI.RULES.judgeCount }, (_, i) => i + 1).map(j => {
      const k = C.filter(c => a.scores[j][c.key].rev > 0).length;
      const lbl = k === C.length ? 'SUDAH KIRIM' : k === 0 ? 'BELUM KIRIM' : `SEBAGIAN (${k}/${C.length})`;
      return `<div class="jbox" data-ok="${k === C.length ? 1 : k ? 2 : 0}">JURI ${j}<small>${lbl}</small></div>`;
    }).join(''));
    UI.setHTML($('mComps'), sc.comps.map(c => `<div class="d-panel"><h3>${c.label}</h3><div class="num">${m ? f(c.avg) : 0}</div><small>${c.count}/${SENI.RULES.judgeCount} juri</small></div>`).join(''));
    UI.setText($('mTotal'), m ? f(sc.total) : '0');
    UI.setText($('mPen'), m && sc.penalty > 0 ? `(pengurangan waktu −${f(sc.penalty)})` : '');

    const kb = $('kirimBtn');
    const canSend = ['berlangsung', 'dijeda', 'waktu-habis', 'selesai'].includes(st);
    kb.disabled = !(canSend || st === 'final'); UI.setText(kb, st === 'final' ? 'KOREKSI' : 'KIRIM');
    UI.setText($('kirimHint'), st === 'final' ? 'Skor akhir sudah dikirim ke Live Score. Gunakan KOREKSI bila perlu (wajib alasan).'
      : SENI.RULES.publishOnConfirm ? 'Nilai komponen langsung tampil di Live Score saat juri mengirim. Total Keseluruhan baru tampil setelah Anda menekan KIRIM.' : '');

    /* pilih peserta berikutnya: tampil bila belum ada peserta atau peserta sebelumnya sudah final */
    const free = !m || st === 'final', akan = a.peserta.filter(p => p.status === 'akan');
    $('pickCard').hidden = !free;
    $('pickNone').hidden = akan.length > 0; $('pickBtn').disabled = !akan.length;
    const key = akan.map(p => p.id).join(',');
    if ($('pickSel')._k !== key) { const cur = $('pickSel').value; $('pickSel')._k = key;
      $('pickSel').innerHTML = akan.map(p => `<option value="${esc(p.id)}">${a.peserta.indexOf(p) + 1}. ${esc(p.nama)} — ${esc(p.kontingen)} (${esc(p.kategori)})</option>`).join('');
      if (akan.some(p => p.id === cur)) $('pickSel').value = cur; }
  }
  $('pickBtn').onclick = () => { if (guard() && $('pickSel').value) report(SENI.tampilkan(n, $('pickSel').value, by)); };
  $('mainBtn').onclick = e => { if (!guard()) return; const act = e.currentTarget.dataset.act; if (act) report(SENI[act](n, by)); };
  $('lepasBtn').onclick = () => { if (guard()) report(SENI.lepas(n, by)); };
  $('resetBtn').onclick = async () => {
    if (!guard()) return;
    const a = SENI.getArena(n); if (!a.match) return;
    const need = a.match.status !== 'siap';
    const c = await UI.confirmDialog({ title: 'Reset penampilan?', okText: 'Reset', reason: need ? { label: 'Alasan reset', required: true } : null,
      html: '<p>Semua nilai juri, timer, dan hasil peserta ini dihapus. Peserta tetap tampil di arena.</p>' });
    if (c.ok) report(SENI.reset(n, c.reason, by));
  };
  $('kirimBtn').onclick = async () => {
    if (!guard()) return;
    const a = SENI.getArena(n), m = a.match; if (!m) return;
    const sc = SENI.compute(a, true), correcting = m.status === 'final';
    const warn = sc.complete < SENI.RULES.judgeCount ? `<p class="err">Baru ${sc.complete} dari ${SENI.RULES.judgeCount} juri yang mengirim ketiga komponen.</p>` : '';
    const c = await UI.confirmDialog({ title: correcting ? 'Simpan koreksi skor?' : 'Kirim skor akhir ke Live Score?', okText: correcting ? 'Simpan Koreksi' : 'Kirim',
      reason: correcting ? { label: 'Alasan koreksi', required: true } : null,
      html: `<p class="official"><b>${esc(m.nama)}</b> — ${esc(m.kontingen)}<br>${sc.comps.map(x => `${x.label}: ${f(x.avg)}`).join(' · ')}${sc.penalty > 0 ? `<br>Pengurangan waktu: −${f(sc.penalty)}` : ''}<br>TOTAL KESELURUHAN: <b>${f(sc.total)}</b></p>${warn}${correcting ? '' : '<p>Timer dihentikan, total dikirim ke Live Score, dan peserta ditandai "Sudah".</p>'}` });
    if (c.ok) report(SENI.confirm(n, { reason: c.reason }, by));
  };

  /* ---------------- DATA PESERTA ---------------- */
  const readF = p => ({ nama: $(p + '-nama').value.trim(), kontingen: $(p + '-kont').value.trim(), kategori: $(p + '-kat').value.trim(),
    durasiMenit: $(p + '-timer').value === '' ? NaN : parseFloat($(p + '-timer').value) });
  $('addForm').addEventListener('submit', e => {
    e.preventDefault(); if (!guard()) return;
    const r = SENI.addPeserta(n, readF('a'), by);
    showErr('addErr', r.ok ? [] : r.errors || [r.msg]);
    if (r.ok) { ['nama', 'kont', 'kat'].forEach(k => $('a-' + k).value = ''); UI.toast(r.msg, 'ok'); render(); } else UI.toast('Periksa isian.', 'err');
  });
  function fillEdit(a) {
    const p = a.peserta.find(x => x.id === $('e-pick').value), dis = !p || (p.status === 'tampil' && a.match && a.match.status !== 'siap');
    if (p && editFilled !== p.id + p.nama + p.kontingen + p.kategori + p.durasiMenit) {
      $('e-nama').value = p.nama; $('e-kont').value = p.kontingen; $('e-kat').value = p.kategori; $('e-timer').value = p.durasiMenit;
      editFilled = p.id + p.nama + p.kontingen + p.kategori + p.durasiMenit;
    }
    ['e-nama', 'e-kont', 'e-kat', 'e-timer'].forEach(i => $(i).disabled = dis); $('e-del').disabled = !p || p.status !== 'akan';
  }
  $('e-pick').onchange = () => { editFilled = ''; render(); };
  $('editForm').addEventListener('submit', e => {
    e.preventDefault(); if (!guard() || !$('e-pick').value) return;
    const r = SENI.updatePeserta(n, $('e-pick').value, readF('e'), by);
    showErr('editErr', r.ok ? [] : r.errors || [r.msg]);
    if (r.ok) { editFilled = ''; UI.toast(r.msg, 'ok'); render(); } else UI.toast(r.msg, 'err');
  });
  $('e-del').onclick = async () => {
    if (!guard() || !$('e-pick').value) return;
    const c = await UI.confirmDialog({ title: 'Hapus peserta?', okText: 'Hapus', html: '<p>Peserta akan dihapus dari daftar.</p>' });
    if (c.ok) { editFilled = ''; report(SENI.removePeserta(n, $('e-pick').value, by)); }
  };
  $('b-go').onclick = () => {
    if (!guard()) return;
    const r = SENI.importPeserta(n, $('b-text').value, by);
    showErr('bulkErr', r.errors); UI.toast(r.msg, r.ok ? 'ok' : 'err'); if (r.ok && !r.errors.length) $('b-text').value = ''; render();
  };
  function renderData(a) {
    const opts = a.peserta.filter(p => p.status !== 'sudah');
    const key = opts.map(p => p.id + p.nama).join(',');
    if (listKey !== key) { const cur = $('e-pick').value; listKey = key;
      $('e-pick').innerHTML = opts.map(p => `<option value="${esc(p.id)}">${a.peserta.indexOf(p) + 1}. ${esc(p.nama)} — ${esc(p.kontingen)}${p.status === 'tampil' ? ' (sedang tampil)' : ''}</option>`).join('') || '<option value="">(belum ada data)</option>';
      if (opts.some(p => p.id === cur)) $('e-pick').value = cur; editFilled = ''; }
    fillEdit(a);
  }

  /* ---------------- RIWAYAT ---------------- */
  document.querySelectorAll('#filters [data-f]').forEach(b => b.onclick = () => { filter = b.dataset.f;
    document.querySelectorAll('#filters [data-f]').forEach(x => x.classList.toggle('active', x === b)); render(); });
  function renderRiwayat(a) {
    const st = SENI.stats(a);
    UI.setText($('stAll'), st.total); UI.setText($('stAkan'), st.akan); UI.setText($('stSudah'), st.sudah);
    const rows = a.peserta.filter(p => filter === 'semua' || (filter === 'sudah' ? p.status === 'sudah' : p.status !== 'sudah'));
    UI.setHTML($('histTable'), rows.length ? `<table class="list"><thead><tr><th>nama</th><th>kontingen</th><th>kategori</th><th>tanggal</th><th>nilai</th><th>status</th><th>cetak</th></tr></thead><tbody>${rows.map(p => `<tr>
      <td>${esc(p.nama)}</td><td>${esc(p.kontingen)}</td><td>${esc(p.kategori)}</td><td>${dateStr(p.tanggal)}</td><td>${p.nilai === null ? '—' : f(p.nilai)}</td><td>${SENI.PSTATUS[p.status]}</td>
      <td>${p.status === 'sudah' ? `<button class="btn btn-ghost" data-print="${esc(p.id)}">Cetak</button>` : p.status === 'akan' ? `<button class="btn btn-ghost" data-show="${esc(p.id)}">Tampilkan</button>` : '—'}</td></tr>`).join('')}</tbody></table>` : '<p class="muted">Belum ada data.</p>');
    UI.setHTML($('auditList'), a.audit.length ? `<table class="list"><tbody>${a.audit.slice(0, 40).map(x => `<tr><td>${UI.fmtDateTime(x.at)}</td><td>${esc(x.by)}</td><td>${esc(x.action)}</td><td>${esc(x.detail)}</td></tr>`).join('')}</tbody></table>` : '<p class="muted">Belum ada aktivitas.</p>');
  }
  $('histTable').addEventListener('click', e => {
    const sb = e.target.closest('[data-show]'), pb = e.target.closest('[data-print]');
    if (sb && guard()) { const r = SENI.tampilkan(n, sb.dataset.show, by); if (r.ok) showTab('monitor'); report(r); }
    if (pb) printPeserta(SENI.getArena(n).peserta.find(p => p.id === pb.dataset.print));
  });
  function printPeserta(p) {
    if (!p || !p.detail) return;
    const w = window.open('', '_blank'); if (!w) { UI.toast('Pop-up diblokir browser. Izinkan pop-up untuk mencetak.', 'err'); return; }
    w.document.write(`<!DOCTYPE html><html lang="id"><head><meta charset="utf-8"><title>Hasil Seni — ${esc(p.nama)}</title>
      <style>body{font-family:Arial,sans-serif;margin:32px;color:#000}h1{font-size:18px;margin:0}h2{margin:6px 0 18px;font-size:14px;font-weight:normal}table{border-collapse:collapse;width:100%;margin:12px 0}td,th{border:1px solid #000;padding:6px 10px;text-align:left}.t{font-size:22px;font-weight:bold}</style></head><body>
      <h1>AR-RANIRY TAPAK SUCI CHAMPIONSHIP IV</h1><h2>TINGKAT PROVINSI ACEH — Arena ${n} · Seni</h2>
      <p><b>${esc(p.nama)}</b><br>${esc(p.kontingen)} · ${esc(p.kategori)}<br>Tanggal: ${dateStr(p.tanggal)}</p>
      <table><tr><th>Juri</th>${p.detail.comps.map(c => `<th>${c.label}</th>`).join('')}</tr>
      ${p.detail.judges.map(j => `<tr><td>Juri ${j.no}</td>${j.vals.map(v => `<td>${v === null ? '—' : v}</td>`).join('')}</tr>`).join('')}
      <tr><th>Rata-rata</th>${p.detail.comps.map(c => `<th>${f(c.avg)}</th>`).join('')}</tr></table>
      ${p.detail.penalty > 0 ? `<p>Pengurangan waktu: −${f(p.detail.penalty)} (waktu ${SENI.fmt(p.detail.elapsedMs || 0)})</p>` : ''}<p class="t">TOTAL KESELURUHAN: ${f(p.nilai)}</p><p>Dewan: ${esc(by)}</p><script>window.onload=()=>window.print()<\/script></body></html>`);
    w.document.close();
  }

  /* ---------------- PENGATURAN: pengurangan nilai per waktu ---------------- */
  let penRows = SENI.getSettings().penalty.map(r => Object.assign({}, r));
  function drawPen() {
    $('penRows').innerHTML = penRows.length ? penRows.map((r, i) => `<div class="pen-line">
      <span>Jika waktu ≥</span><input type="number" min="0" step="1" value="${r.menit}" data-i="${i}" data-f="menit" aria-label="Menit"><span>menit</span>
      <input type="number" min="0" max="59" step="1" value="${r.detik}" data-i="${i}" data-f="detik" aria-label="Detik"><span>detik → kurangi</span>
      <input type="number" min="0" step="0.1" value="${r.kurang}" data-i="${i}" data-f="kurang" aria-label="Pengurangan"><span>nilai</span>
      <button class="btn btn-danger" type="button" data-del="${i}" aria-label="Hapus baris">×</button></div>`).join('') : '<p class="muted">Belum ada aturan: tidak ada pengurangan nilai karena waktu.</p>';
  }
  $('penRows').addEventListener('input', e => { const i = e.target.dataset.i; if (i !== undefined) penRows[+i][e.target.dataset.f] = e.target.value; });
  $('penRows').addEventListener('click', e => { const b = e.target.closest('[data-del]'); if (b) { penRows.splice(+b.dataset.del, 1); drawPen(); } });
  $('penAdd').onclick = () => { penRows.push({ menit: 0, detik: 0, kurang: 0 }); drawPen(); };
  $('penSave').onclick = () => {
    if (!guard()) return;
    const r = SENI.setPenalty(n, penRows, by);
    showErr('penErr', r.ok ? [] : [r.msg]);
    if (r.ok) { penRows = SENI.getSettings().penalty.map(x => Object.assign({}, x)); drawPen(); }
    report(r);
  };
  drawPen();

  function render() {
    let a = SENI.getArena(n);
    if (SENI.needsSettle(a)) { SENI.settle(n); a = SENI.getArena(n); }
    renderMonitor(a); renderData(a); renderRiwayat(a);
  }
  showTab('monitor'); UI.every(render, 250);
})();
