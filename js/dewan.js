/* dewan.js — dasbor Dewan FIGHT: Monitor, Data Fighter, Data Riwayat, Bagan Fighter.
   Semua aksi hanya untuk arena pada sesi. Pemeriksaan sesi hanya demo; keamanan asli di backend PHP. */
(() => {
  'use strict';
  const S = ATSC_AUTH.require('dewan');
  if (!S) return;
  const n = S.arena, by = S.name, $ = UI.$, esc = UI.esc, low = BAGAN.low;
  UI.topbar({ title: 'DEWAN PERTANDINGAN', session: S });
  $('liveLink').href = 'live-score.html?arena=' + n;
  let correcting = false, filter = 'semua', editSig = '', pickKey = '', editKey = '', bgKey = '';

  const guard = () => { if (!ATSC_AUTH.can('dewan', n)) { UI.toast('Aksi ditolak: sesi bukan Dewan arena ini.', 'err'); return false; } return true; };
  const report = r => { if (r && r.msg) UI.toast(r.msg, r.ok ? 'ok' : 'err'); render(); };
  const showErr = (id, errs) => { const el = $(id); el.hidden = !errs || !errs.length; el.innerHTML = (errs || []).map(x => `<li>${esc(x)}</li>`).join(''); };
  const dateStr = ts => ts ? new Date(ts).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
  const label = e => `P${e.partai}: ${e.red.nama} vs ${e.blue.nama} (${e.kategori} · ${e.kelas})`;

  function showTab(t) {
    document.querySelectorAll('[data-tab]').forEach(b => b.classList.toggle('active', b.dataset.tab === t));
    document.querySelectorAll('.pane').forEach(p => p.hidden = p.id !== 'pane-' + t);
  }
  document.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => showTab(b.dataset.tab));

  /* ---------------- MONITOR ---------------- */
  function judgeCard(a, no) {
    const j = a.scores[no], m = a.match;
    const row = (l, f) => `<tr><th>${l}</th><td>${f(j.red)}</td><td>${f(j.blue)}</td></tr>`;
    return `<article class="card jcard"><h3>JURI ${no} <small>${esc(m ? m.juri[no - 1] : '')}</small></h3>
      <span class="badge" data-ok="${j.revision ? 1 : 0}">${j.revision ? 'Sudah Menilai' : 'Belum Menilai'}</span>
      <table><thead><tr><th></th><th class="r">Merah</th><th class="b">Biru</th></tr></thead><tbody>
      ${row('nilai', s => ATSC_RESULTS.techOf(s))}${ATSC.RULES.penaltyBtns.map(b => row(b.label, s => (s[b.key][b.idx] ? 1 : 0))).join('')}</tbody></table>
      <small>Input terakhir: ${UI.fmtTime(j.submittedAt)}</small></article>`;
  }
  function renderMonitor(a, s) {
    const m = a.match, st = ATSC.effStatus(a);
    $('monNotice').hidden = !!m;
    const sEl = $('mStatus'); UI.setText(sEl, ATSC.STATUS[st]); sEl.dataset.st = st;
    UI.setText($('mPartai'), m ? `· Partai ${m.nomor} · ${m.kategori} · ${m.kelas || ''}` : '');
    if (m) {
      const sc = ATSC_RESULTS.compute(a);
      UI.setText($('mRedName'), m.red.nama); UI.setText($('mRedKont'), m.red.kontingen);
      UI.setText($('mBlueName'), m.blue.nama); UI.setText($('mBlueKont'), m.blue.kontingen);
      UI.setText($('mRedScore'), ATSC_RESULTS.fmtScore(sc.red.score)); UI.setText($('mBlueScore'), ATSC_RESULTS.fmtScore(sc.blue.score));
      UI.setText($('mBabak'), ATSC_TIMER.roundOf(a).label.toUpperCase()); UI.setText($('mTimer'), ATSC_TIMER.fmt(ATSC_TIMER.remaining(a)));
    } else { ['mRedName', 'mBlueName'].forEach(i => UI.setText($(i), '—')); ['mRedKont', 'mBlueKont'].forEach(i => UI.setText($(i), '')); UI.setText($('mRedScore'), '0'); UI.setText($('mBlueScore'), '0'); UI.setText($('mTimer'), '00:00'); UI.setText($('mBabak'), 'BABAK'); }
    const cfg = { siap: ['Mulai Pertandingan', 'start'], 'siap-babak': ['Mulai Babak', 'start'], berlangsung: ['Jeda Timer', 'pause'], dijeda: ['Lanjutkan Pertandingan', 'resume'] }[st];
    const mb = $('mainBtn'); mb.disabled = !cfg; mb.dataset.act = cfg ? cfg[1] : ''; UI.setText(mb, cfg ? cfg[0] : 'Mulai / Jeda');
    $('endBtn').disabled = !['berlangsung', 'dijeda', 'waktu-habis', 'siap-babak'].includes(st);
    $('resetBtn').disabled = !m || st === 'berlangsung'; $('lepasBtn').disabled = !m || st !== 'siap';
    const locked = !m || a.timer.running || ['selesai', 'final'].includes(st);
    UI.setHTML($('roundList'), m ? ATSC.buildRounds(m).map((r, i) => `<button class="round-opt${i === m.roundIndex ? ' active' : ''}" data-round="${i}" ${locked ? 'disabled' : ''}><span class="dot"></span>${esc(r.label)} <small>${ATSC_TIMER.fmt(r.ms)}</small></button>`).join('') : '');
    let h = ''; for (let i = 1; i <= ATSC.RULES.judgeCount; i++) h += judgeCard(a, i);
    UI.setHTML($('judgeCards'), h);

    const free = !m || st === 'final', akan = s.fightList.filter(e => e.status === 'akan' && (!e.arena || e.arena === n));
    $('pickCard').hidden = !free; $('pickNone').hidden = akan.length > 0; $('pickBtn').disabled = !akan.length;
    const key = akan.map(e => e.id + e.partai + e.red.nama + e.blue.nama).join(',');
    if (pickKey !== key) { const cur = $('pickSel').value; pickKey = key;
      $('pickSel').innerHTML = akan.map(e => `<option value="${esc(e.id)}">${esc(label(e))}</option>`).join(''); if (akan.some(e => e.id === cur)) $('pickSel').value = cur; }
  }
  $('pickBtn').onclick = () => { if (guard() && $('pickSel').value) report(FD.tampilkan(n, $('pickSel').value, by)); };
  $('mainBtn').onclick = e => { if (!guard()) return; const act = e.currentTarget.dataset.act; if (act) report(ATSC_TIMER[act](n, by)); };
  $('roundList').onclick = e => { const b = e.target.closest('[data-round]'); if (b && !b.disabled && guard()) report(ATSC_TIMER.setRound(n, +b.dataset.round, by)); };
  $('lepasBtn').onclick = () => { if (guard()) report(FD.lepas(n, by)); };
  $('endBtn').onclick = async () => {
    if (!guard()) return;
    const sc = ATSC_RESULTS.compute(ATSC.getArena(n));
    const c = await UI.confirmDialog({ title: 'Akhiri pertandingan?', okText: 'Akhiri Pertandingan', html: `<p>Timer dihentikan. Juri yang sudah menilai: <b>${sc.submitted} dari ${ATSC.RULES.judgeCount}</b>.</p><p>Pemenang belum ditetapkan; gunakan panel "Tetapkan Pemenang" di bawah.</p>` });
    if (c.ok) report(ATSC_TIMER.end(n, by));
  };
  $('resetBtn').onclick = async () => {
    if (!guard()) return;
    const a = ATSC.getArena(n); if (!a.match) return;
    const need = a.match.status !== 'siap';
    const c = await UI.confirmDialog({ title: 'Reset pertandingan?', okText: 'Reset', reason: need ? { label: 'Alasan reset', required: true } : null, html: '<p>Semua nilai juri, timer, dan hasil partai ini dihapus. Partai tetap tampil di arena.</p>' });
    if (c.ok) { correcting = false; report(FD.resetMatch(n, c.reason, by)); }
  };

  /* ---------------- panel pemenang ---------------- */
  function setWForm(on) { $('wFields').disabled = !on; $('wConfirm').disabled = !on; }
  function renderResult(a) {
    const m = a.match, st = ATSC.effStatus(a), info = $('wInfo'), note = $('wNote');
    if (!m) { UI.setHTML(info, '<p class="muted">Belum ada partai.</p>'); note.hidden = true; setWForm(false); $('wConfirm').hidden = false; $('wCorrect').hidden = true; return; }
    const sc = ATSC_RESULTS.compute(a), f = ATSC_RESULTS.fmtScore;
    const lead = sc.red.score === sc.blue.score ? 'Skor sementara seimbang' : `Skor sementara lebih tinggi: Sudut ${sc.red.score > sc.blue.score ? 'Merah' : 'Biru'}`;
    const r = a.result, official = r ? `<p class="official">HASIL RESMI: <b>${r.winnerSide ? esc(m[r.winnerSide].nama) + ' — Sudut ' + (r.winnerSide === 'red' ? 'Merah' : 'Biru') : 'Seri / belum ada pemenang'}</b> · ${esc(r.basis)} · oleh ${esc(r.by)} · ${UI.fmtDateTime(r.at)}${r.correctionReason ? ' · koreksi: ' + esc(r.correctionReason) : ''}</p>` : '';
    UI.setHTML(info, `<table class="sum"><tr><th>Partai</th><td>${esc(m.nomor)} · Arena ${n}</td><th>Status</th><td>${ATSC.STATUS[st]}</td></tr>
      <tr><th class="r">Merah</th><td>${esc(m.red.nama)} (${esc(m.red.kontingen)})</td><td colspan="2" class="big-n r">${f(sc.red.score)}</td></tr>
      <tr><th class="b">Biru</th><td>${esc(m.blue.nama)} (${esc(m.blue.kontingen)})</td><td colspan="2" class="big-n b">${f(sc.blue.score)}</td></tr></table>
      <p class="muted">${lead} (hanya informasi, bukan keputusan). Juri sudah menilai: ${sc.submitted}/${ATSC.RULES.judgeCount}.</p>${official}`);
    const can = st === 'selesai' || (st === 'final' && correcting);
    setWForm(can); note.hidden = can || st === 'final';
    if (!note.hidden) note.textContent = 'Akhiri pertandingan terlebih dahulu untuk menetapkan pemenang.';
    $('wCorrect').hidden = !(st === 'final' && !correcting); $('wConfirm').hidden = !can;
    UI.setText($('wConfirm'), correcting ? 'SIMPAN KOREKSI' : 'TETAPKAN PEMENANG'); $('wBy').value = by;
  }
  $('wCorrect').onclick = () => { correcting = true; render(); };
  $('wConfirm').onclick = async () => {
    if (!guard()) return;
    const pick = document.querySelector('input[name="hasil"]:checked');
    if (!pick) { UI.toast('Pilih hasil pertandingan.', 'err'); return; }
    const data = { winnerSide: pick.value === 'seri' ? null : pick.value, basis: $('wBasis').value, notes: $('wNotes').value.trim() };
    const a = ATSC.getArena(n), m = a.match, sc = ATSC_RESULTS.compute(a), f = ATSC_RESULTS.fmtScore;
    const lbl = data.winnerSide ? `${esc(m[data.winnerSide].nama)} — Sudut ${data.winnerSide === 'red' ? 'Merah' : 'Biru'}` : 'Seri / belum ada pemenang';
    const c = await UI.confirmDialog({ title: 'Konfirmasi hasil resmi', okText: 'Konfirmasi Hasil', reason: correcting ? { label: 'Alasan koreksi', required: true } : null,
      html: `<p>Apakah Anda yakin ingin mengonfirmasi hasil resmi pertandingan ini?</p><p class="official"><b>${lbl}</b><br>Dasar: ${esc(data.basis || '—')}</p><p>Skor akhir — Merah <b>${f(sc.red.score)}</b> : <b>${f(sc.blue.score)}</b> Biru</p>` });
    if (!c.ok) return;
    data.reason = c.reason; const r = ATSC_RESULTS.confirm(n, data, by); if (r.ok) correcting = false; report(r);
  };

  /* ---------------- DATA FIGHTER (form) ---------------- */
  const fieldsHTML = p => `<div class="grid">
      <label class="field"><span>Partai *</span><input id="${p}-partai"></label>
      <label class="field"><span>Babak</span><select id="${p}-babak"><option>1</option><option>2</option><option>3</option></select></label>
      <label class="field"><span>Kategori *</span><input id="${p}-kat" list="dl-kat"></label>
      <label class="field"><span>Kelas *</span><input id="${p}-kelas" list="dl-kelas"></label></div>
    <div class="grid">
      <label class="field red-f"><span>Pesilat Merah *</span><input id="${p}-redN"></label><label class="field red-f"><span>Kontingen Merah *</span><input id="${p}-redK"></label>
      <label class="field blue-f"><span>Pesilat Biru *</span><input id="${p}-blueN"></label><label class="field blue-f"><span>Kontingen Biru *</span><input id="${p}-blueK"></label></div>
    <div class="grid">
      <label class="field"><span>Timer per babak (menit) *</span><input id="${p}-timer" type="number" min="0.1" step="0.1" value="2"></label>
      <label class="field"><span>Babak tambahan (menit; 0 = tidak ada)</span><input id="${p}-tam" type="number" min="0" step="0.1" value="1"></label></div>`;
  $('addFields').innerHTML = fieldsHTML('a'); $('editFields').innerHTML = fieldsHTML('e');
  const g = id => $(id);
  const readF = p => { const t = id => g(p + '-' + id).value.trim(); const k = FD.normKat(t('kat')) || t('kat');
    return { partai: t('partai'), babak: +g(p + '-babak').value, kategori: k, kelas: t('kelas'), red: { nama: t('redN'), kontingen: t('redK') }, blue: { nama: t('blueN'), kontingen: t('blueK') },
      durasiMenit: parseFloat(g(p + '-timer').value), durasiTambahanMenit: g(p + '-tam').value === '' ? 0 : parseFloat(g(p + '-tam').value) }; };
  const fillF = (p, e) => { g(p + '-partai').value = e.partai; g(p + '-babak').value = e.babak; g(p + '-kat').value = e.kategori; g(p + '-kelas').value = e.kelas;
    g(p + '-redN').value = e.red.nama; g(p + '-redK').value = e.red.kontingen; g(p + '-blueN').value = e.blue.nama; g(p + '-blueK').value = e.blue.kontingen;
    g(p + '-timer').value = e.durasiMenit; g(p + '-tam').value = e.tambahan ? e.durasiTambahanMenit : 0; };
  const resetAdd = s => { ['kat', 'kelas', 'redN', 'redK', 'blueN', 'blueK'].forEach(k => g('a-' + k).value = ''); g('a-partai').value = FD.nextPartai(s); };
  g('a-partai').value = FD.nextPartai(ATSC.load());
  $('addForm').addEventListener('submit', e => {
    e.preventDefault(); if (!guard()) return;
    const r = FD.addEntry(n, readF('a'), by); showErr('addErr', r.ok ? [] : r.errors);
    if (r.ok) { UI.toast(r.msg, 'ok'); resetAdd(ATSC.load()); render(); } else UI.toast('Periksa isian.', 'err');
  });
  $('e-pick').onchange = () => { editSig = ''; render(); };
  $('editForm').addEventListener('submit', e => {
    e.preventDefault(); if (!guard() || !$('e-pick').value) return;
    const r = FD.updateEntry(n, $('e-pick').value, readF('e'), by); showErr('editErr', r.ok ? [] : r.errors);
    if (r.ok) { editSig = ''; UI.toast(r.msg, 'ok'); render(); } else UI.toast(r.msg, 'err');
  });
  $('e-del').onclick = async () => {
    if (!guard() || !$('e-pick').value) return;
    const c = await UI.confirmDialog({ title: 'Hapus partai?', okText: 'Hapus', html: '<p>Partai akan dihapus dari daftar.</p>' });
    if (c.ok) { editSig = ''; report(FD.removeEntry(n, $('e-pick').value, by)); }
  };
  function renderData(s) {
    const opts = s.fightList.filter(e => e.status === 'akan'), key = opts.map(e => e.id + e.partai).join(',');
    if (editKey !== key) { const cur = $('e-pick').value; editKey = key;
      $('e-pick').innerHTML = opts.map(e => `<option value="${esc(e.id)}">${esc(label(e))}</option>`).join('') || '<option value="">(tidak ada partai "akan bertanding")</option>';
      if (opts.some(e => e.id === cur)) $('e-pick').value = cur; editSig = ''; }
    const e = opts.find(x => x.id === $('e-pick').value);
    if (e) { const sig = JSON.stringify(e); if (editSig !== sig) { fillF('e', e); editSig = sig; } }
    $('editNote').hidden = !(e && e.ref);
    ['kat', 'kelas', 'redN', 'redK', 'blueN', 'blueK'].forEach(k => g('e-' + k).disabled = !e || !!e.ref);
    ['partai', 'babak', 'timer', 'tam'].forEach(k => g('e-' + k).disabled = !e); $('e-del').disabled = !e || !!e.ref;
    const kl = [...new Set([...s.fightList.map(x => x.kelas), ...s.loting.peserta.map(p => p.kelas)])];
    UI.setHTML($('dl-kelas'), kl.map(k => `<option value="${esc(k)}">`).join(''));
  }

  /* ---------------- DATA RIWAYAT ---------------- */
  document.querySelectorAll('#filters [data-f]').forEach(b => b.onclick = () => { filter = b.dataset.f; document.querySelectorAll('#filters [data-f]').forEach(x => x.classList.toggle('active', x === b)); render(); });
  function renderRiwayat(a, s) {
    const st = FD.stats(s); UI.setText($('stAll'), st.total); UI.setText($('stAkan'), st.akan); UI.setText($('stSudah'), st.sudah);
    const rows = s.fightList.filter(e => filter === 'semua' || (filter === 'sudah' ? e.status === 'sudah' : e.status !== 'sudah'));
    UI.setHTML($('histTable'), rows.length ? `<table class="list"><thead><tr><th>partai</th><th>nama</th><th>kontingen</th><th>kategori</th><th>kelas</th><th>tanggal</th><th>nilai</th><th>status</th><th>cetak</th></tr></thead><tbody>${rows.map(e => `<tr>
      <td>${esc(e.partai)}</td><td><span class="r">${esc(e.red.nama)}</span> vs <span class="b">${esc(e.blue.nama)}</span></td><td>${esc(e.red.kontingen)} / ${esc(e.blue.kontingen)}</td><td>${esc(e.kategori)}</td><td>${esc(e.kelas)}</td>
      <td>${dateStr(e.tanggal)}</td><td>${e.hasil ? e.hasil.red + ' : ' + e.hasil.blue : '—'}</td>
      <td>${e.status === 'sudah' ? 'Sudah' : e.status === 'tampil' ? 'Sedang tampil (Arena ' + e.arena + ')' : 'Akan'}</td>
      <td>${e.status === 'sudah' ? `<button class="btn btn-ghost" data-print="${esc(e.id)}">Cetak</button>` : e.status === 'akan' && (!e.arena || e.arena === n) ? `<button class="btn btn-ghost" data-show="${esc(e.id)}">Tampilkan</button>` : '—'}</td></tr>`).join('')}</tbody></table>` : '<p class="muted">Belum ada data.</p>');
    UI.setHTML($('auditList'), a.audit.length ? `<table class="list"><tbody>${a.audit.slice(0, 40).map(x => `<tr><td>${UI.fmtDateTime(x.at)}</td><td>${esc(x.by)}</td><td>${esc(x.action)}</td><td>${esc(x.detail)}</td></tr>`).join('')}</tbody></table>` : '<p class="muted">Belum ada aktivitas.</p>');
  }
  $('histTable').addEventListener('click', e => {
    const sb = e.target.closest('[data-show]'), pb = e.target.closest('[data-print]');
    if (sb && guard()) { const r = FD.tampilkan(n, sb.dataset.show, by); if (r.ok) showTab('monitor'); report(r); }
    if (pb) printEntry(ATSC.load().fightList.find(x => x.id === pb.dataset.print));
  });
  function printEntry(e) {
    if (!e || !e.hasil) return;
    const w = window.open('', '_blank'); if (!w) { UI.toast('Pop-up diblokir browser. Izinkan pop-up untuk mencetak.', 'err'); return; }
    const win = e.hasil.winnerSide ? esc(e[e.hasil.winnerSide].nama) + ' — Sudut ' + (e.hasil.winnerSide === 'red' ? 'Merah' : 'Biru') : 'Seri / belum ada pemenang';
    w.document.write(`<!DOCTYPE html><html lang="id"><head><meta charset="utf-8"><title>Hasil Partai ${esc(e.partai)}</title><style>body{font-family:Arial,sans-serif;margin:32px;color:#000}h1{font-size:18px;margin:0}h2{margin:6px 0 18px;font-size:14px;font-weight:normal}table{border-collapse:collapse;width:100%;margin:12px 0}td,th{border:1px solid #000;padding:6px 10px;text-align:left}.t{font-size:20px;font-weight:bold}</style></head><body>
      <h1>AR-RANIRY TAPAK SUCI CHAMPIONSHIP IV</h1><h2>TINGKAT PROVINSI ACEH — Fight · Arena ${e.arena || '-'}</h2>
      <p><b>Partai ${esc(e.partai)}</b> · ${esc(e.kategori)} · ${esc(e.kelas)}<br>Tanggal: ${dateStr(e.tanggal)}</p>
      <table><tr><th>Sudut</th><th>Pesilat</th><th>Kontingen</th><th>Skor</th></tr>
      <tr><td>Merah</td><td>${esc(e.red.nama)}</td><td>${esc(e.red.kontingen)}</td><td>${e.hasil.red}</td></tr>
      <tr><td>Biru</td><td>${esc(e.blue.nama)}</td><td>${esc(e.blue.kontingen)}</td><td>${e.hasil.blue}</td></tr></table>
      <p class="t">PEMENANG: ${win}</p><p>Dasar keputusan: ${esc(e.hasil.basis)}</p><p>Dewan: ${esc(by)}</p><script>window.onload=()=>window.print()<\/script></body></html>`);
    w.document.close();
  }

  /* ---------------- BAGAN FIGHTER ---------------- */
  $('bgSel').onchange = () => { bgKey = ''; render(); };
  function renderBagan(s) {
    const keys = Object.keys(s.loting.draws), sig = keys.join('|');
    if ($('bgSel')._k !== sig) { const cur = $('bgSel').value; $('bgSel')._k = sig;
      $('bgSel').innerHTML = keys.map(k => `<option value="${esc(k)}">${esc(s.loting.draws[k].kategori)} — ${esc(s.loting.draws[k].kelas)}</option>`).join(''); if (keys.includes(cur)) $('bgSel').value = cur; }
    $('bgNone').hidden = keys.length > 0; $('bgSel').parentNode.hidden = !keys.length;
    const d = s.loting.draws[$('bgSel').value];
    UI.setHTML($('bgView'), d ? BAGAN.render(d, FD.pmap(s), s.fightList) : '');
  }

  function render() {
    let a = ATSC.getArena(n);
    if (ATSC_TIMER.needsSettle(a)) { ATSC_TIMER.settle(n); a = ATSC.getArena(n); }
    const s = ATSC.load();
    renderMonitor(a, s); renderResult(a); renderData(s); renderRiwayat(a, s); renderBagan(s);
  }
  showTab('monitor'); UI.every(render, 250);
})();
