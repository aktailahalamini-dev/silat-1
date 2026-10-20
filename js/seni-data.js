/* =====================================================================
   seni-data.js — data, timer (HITUNG MAJU), daftar peserta, dan hasil SENI.
   Terpisah dari FIGHT (kunci localStorage berbeda); Arena 1 & 2 independen.
   PROTOTYPE: localStorage tidak sinkron antar perangkat. Nanti ganti
   load/save/update dengan fetch() ke PHP + MySQL.
   ===================================================================== */
const SENI = (() => {
  'use strict';
  const KEY = 'atsc4.seni.v2';

  /* ---- ATURAN PROTOTYPE (SESUAIKAN DENGAN REGLEMEN SENI RESMI) ----------
     min/max/maxDigits : batas nilai yang boleh dikirim juri (keypad angka).
     Nilai komponen = rata-rata juri yang sudah mengirim; total = jumlah 3 komponen.
     Nilai Wirasa/Wirama/Wiraga tampil di Live Score SEGERA setelah juri menekan KIRIM.
     publishOnConfirm  : true  -> TOTAL KESELURUHAN baru tampil setelah Dewan menekan KIRIM.
                         false -> total juga tampil langsung.
     Pengurangan nilai berdasarkan waktu diatur Dewan di menu Pengaturan.          */
  const RULES = {
    judgeCount: 4, min: 0, max: 100, maxDigits: 3, publishOnConfirm: true,
    components: [{ key: 'wirasa', label: 'WIRASA' }, { key: 'wirama', label: 'WIRAMA' }, { key: 'wiraga', label: 'WIRAGA' }]
  };
  const STATUS = {
    kosong: 'BELUM ADA PESERTA', siap: 'PENAMPILAN BELUM DIMULAI', berlangsung: 'PENAMPILAN BERLANGSUNG',
    dijeda: 'PENAMPILAN DIJEDA', 'waktu-habis': 'BATAS WAKTU TERCAPAI',
    selesai: 'PENAMPILAN SELESAI', final: 'SKOR AKHIR RESMI'
  };
  const PSTATUS = { akan: 'Akan', tampil: 'Sedang tampil', sudah: 'Sudah' };
  const ok = (msg, extra) => Object.assign({ ok: true, msg }, extra), fail = msg => ({ ok: false, msg });
  const clone = o => JSON.parse(JSON.stringify(o));
  const r2 = x => Math.round(x * 100) / 100;
  const fmtNum = x => String(Number(Number(x).toFixed(2)));
  const newId = () => 'P' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  let cr = null, co = null;

  const freshTimer = () => ({ running: false, elapsedMs: 0, startedAt: null });
  function emptyScores() {
    const s = {};
    for (let j = 1; j <= RULES.judgeCount; j++) { s[j] = {}; RULES.components.forEach(c => { s[j][c.key] = { v: null, at: null, rev: 0 }; }); }
    return s;
  }
  const newArena = n => ({ id: n, peserta: [], match: null, timer: freshTimer(), scores: emptyScores(), result: null, audit: [] });
  function audit(a, by, action, detail) {
    a.audit.unshift({ at: Date.now(), by: by || 'Sistem', action, detail: detail || '' });
    if (a.audit.length > 120) a.audit.length = 120;
  }
  const mkPeserta = d => ({ id: newId(), nama: d.nama, kontingen: d.kontingen, kategori: d.kategori, durasiMenit: d.durasiMenit,
    status: 'akan', tanggal: null, nilai: null, detail: null });

  /* ---- penyimpanan ---- */
  function seed() {
    const mk = (n, list) => { const a = newArena(n); list.forEach(d => a.peserta.push(mkPeserta(d)));
      audit(a, 'Sistem', 'Data contoh', list.length + ' peserta'); return a; };
    const s = { version: 2, settings: { penalty: [] }, arenas: {
      1: mk(1, [{ nama: 'Muhammad Iqbal', kontingen: 'Tapak Suci Banda Aceh', kategori: 'Seni Tunggal Putra', durasiMenit: 3 },
                { nama: 'Cut Rahmi', kontingen: 'Tapak Suci Pidie', kategori: 'Seni Tunggal Putri', durasiMenit: 3 },
                { nama: 'Zulfikar', kontingen: 'Tapak Suci Aceh Besar', kategori: 'Seni Tunggal Putra', durasiMenit: 3 }]),
      2: mk(2, [{ nama: 'Aisyah & Zahra', kontingen: 'Tapak Suci Bireuen', kategori: 'Seni Ganda Putri', durasiMenit: 4 },
                { nama: 'Rizal & Fajar', kontingen: 'Tapak Suci Lhokseumawe', kategori: 'Seni Ganda Putra', durasiMenit: 4 }]) } };
    return s;
  }
  function load() {
    const raw = localStorage.getItem(KEY);
    if (raw && raw === cr) return co;
    let o = null; if (raw) { try { o = JSON.parse(raw); } catch (e) { o = null; } }
    if (!o || !o.arenas || !o.arenas[1] || !o.arenas[2]) { o = seed(); save(o); return o; }
    if (!o.settings) { o.settings = { penalty: [] }; save(o); return o; }
    cr = raw; co = o; return o;
  }
  function save(s) { const raw = JSON.stringify(s); localStorage.setItem(KEY, raw); cr = raw; co = s; }
  const getArena = n => load().arenas[n];
  function update(n, fn) { const s = clone(load()); const out = fn(s.arenas[n], s); save(s); return out; }
  function effStatus(a) {
    const st = a.match ? a.match.status : 'kosong';
    return st;  // timer seni terus menghitung maju; pengurangan nilai mengikuti pengaturan waktu
  }

  /* ---- timer HITUNG MAJU berbasis timestamp ---- */
  const limitMs = a => (a.match && a.match.durasiMenit > 0 ? Math.round(a.match.durasiMenit * 60000) : 0);
  const rawElapsed = (a, now = Date.now()) => a.timer.running ? a.timer.elapsedMs + (now - a.timer.startedAt) : a.timer.elapsedMs;
  const elapsed = (a, now) => rawElapsed(a, now);
  const over = a => limitMs(a) > 0 && elapsed(a) > limitMs(a);   // penanda saja
  const fmt = ms => { const s = Math.floor(Math.max(0, ms) / 1000); return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'); };
  const needsSettle = () => false;   // tidak ada berhenti otomatis pada seni
  const run = a => { a.timer = { running: true, elapsedMs: a.timer.elapsedMs, startedAt: Date.now() }; a.match.status = 'berlangsung'; };

  const start = (n, by) => update(n, a => {
    if (!a.match || a.match.status !== 'siap') return fail('Penampilan tidak dalam keadaan siap dimulai.');
    run(a); audit(a, by, 'Timer', 'Mulai penampilan'); return ok('Penampilan dimulai.');
  });
  const pause = (n, by) => update(n, a => {
    if (!a.match || a.match.status !== 'berlangsung') return fail('Timer tidak sedang berjalan.');
    a.timer = { running: false, elapsedMs: elapsed(a), startedAt: null }; a.match.status = 'dijeda';
    audit(a, by, 'Timer', 'Jeda pada ' + fmt(a.timer.elapsedMs)); return ok('Penampilan dijeda.');
  });
  const resume = (n, by) => update(n, a => {
    if (!a.match || a.match.status !== 'dijeda') return fail('Penampilan tidak sedang dijeda.');
    run(a); audit(a, by, 'Timer', 'Lanjut dari ' + fmt(a.timer.elapsedMs)); return ok('Penampilan dilanjutkan.');
  });
  const settle = n => update(n, a => {
    if (!needsSettle(a)) return fail('');
    a.timer = { running: false, elapsedMs: limitMs(a), startedAt: null }; a.match.status = 'waktu-habis';
    audit(a, 'Sistem', 'Timer', 'Batas waktu tercapai'); return ok('Batas waktu tercapai.');
  });

  /* ---- daftar peserta ---- */
  function check(d, ignoreId) {
    const e = [], st = load();
    if (!d.nama) e.push('Nama wajib diisi.'); if (!d.kontingen) e.push('Kontingen wajib diisi.'); if (!d.kategori) e.push('Kategori wajib diisi.');
    if (!(d.durasiMenit >= 0)) e.push('Batas waktu tidak valid (isi 0 bila tanpa batas).');
    const key = [d.nama, d.kontingen, d.kategori].join('|').toLowerCase();
    [1, 2].forEach(i => { if (st.arenas[i].peserta.some(p => p.id !== ignoreId && [p.nama, p.kontingen, p.kategori].join('|').toLowerCase() === key)) e.push(`Peserta sudah terdaftar di Arena ${i}.`); });
    return e;
  }
  const addPeserta = (n, d, by) => {
    const e = check(d); if (e.length) return { ok: false, msg: e[0], errors: e };
    return update(n, a => { a.peserta.push(mkPeserta(d)); audit(a, by, 'Peserta ditambah', d.nama); return ok('Peserta disimpan.'); });
  };
  const updatePeserta = (n, id, d, by) => {
    const e = check(d, id); if (e.length) return { ok: false, msg: e[0], errors: e };
    return update(n, a => {
      const p = a.peserta.find(x => x.id === id);
      if (!p) return fail('Peserta tidak ditemukan.');
      if (p.status === 'sudah') return fail('Peserta yang sudah tampil tidak dapat diubah (gunakan Koreksi).');
      if (p.status === 'tampil' && a.match && a.match.status !== 'siap') return fail('Data terkunci karena penampilan sudah dimulai.');
      Object.assign(p, { nama: d.nama, kontingen: d.kontingen, kategori: d.kategori, durasiMenit: d.durasiMenit });
      if (p.status === 'tampil' && a.match) Object.assign(a.match, { nama: d.nama, kontingen: d.kontingen, kategori: d.kategori, durasiMenit: d.durasiMenit });
      audit(a, by, 'Peserta diubah', d.nama); return ok('Perubahan disimpan.');
    });
  };
  const removePeserta = (n, id, by) => update(n, a => {
    const p = a.peserta.find(x => x.id === id);
    if (!p || p.status !== 'akan') return fail('Hanya peserta berstatus "Akan" yang dapat dihapus.');
    a.peserta = a.peserta.filter(x => x.id !== id); audit(a, by, 'Peserta dihapus', p.nama); return ok('Peserta dihapus.');
  });
  /* Impor banyak: satu baris = nama ; kontingen ; kategori ; batas menit (opsional) */
  function importPeserta(n, text, by) {
    let added = 0; const errors = [];
    text.split(/\r?\n/).map(l => l.trim()).filter(Boolean).forEach((line, i) => {
      const [nama = '', kontingen = '', kategori = '', mnt] = line.split(/[;\t]/).map(x => x.trim());
      const d = { nama, kontingen, kategori, durasiMenit: mnt === undefined || mnt === '' ? 3 : parseFloat(mnt) };
      const e = check(d); if (e.length) { errors.push(`Baris ${i + 1}: ${e[0]}`); return; }
      update(n, a => { a.peserta.push(mkPeserta(d)); }); added++;
    });
    if (added) update(n, a => { audit(a, by, 'Impor peserta', added + ' peserta'); });
    return { ok: added > 0, msg: `${added} peserta diimpor${errors.length ? `, ${errors.length} baris ditolak` : ''}.`, errors };
  }
  /* Tampilkan peserta "akan" sebagai peserta aktif di arena ini */
  const tampilkan = (n, id, by) => update(n, a => {
    if (a.match && a.match.status !== 'final') return fail('Selesaikan atau lepas peserta yang sedang tampil dahulu.');
    const p = a.peserta.find(x => x.id === id);
    if (!p || p.status !== 'akan') return fail('Peserta tidak tersedia.');
    a.match = { uid: 'S' + n + '-' + Date.now(), arena: n, pid: p.id, nomor: String(a.peserta.indexOf(p) + 1), kategori: p.kategori, nama: p.nama,
      kontingen: p.kontingen, durasiMenit: p.durasiMenit, status: 'siap' };
    a.scores = emptyScores(); a.result = null; a.timer = freshTimer(); p.status = 'tampil';
    audit(a, by, 'Peserta ditampilkan', p.nama); return ok('Peserta ditampilkan di arena.');
  });
  const lepas = (n, by) => update(n, a => {
    if (!a.match || a.match.status !== 'siap') return fail('Hanya bisa dilepas sebelum penampilan dimulai.');
    const p = a.peserta.find(x => x.id === a.match.pid); if (p) p.status = 'akan';
    audit(a, by, 'Peserta dilepas', a.match.nama); a.match = null; return ok('Peserta dikembalikan ke daftar "Akan".');
  });
  const reset = (n, reason, by) => update(n, a => {
    const m = a.match; if (!m) return fail('Belum ada peserta.');
    if (m.status === 'berlangsung') return fail('Jeda timer dahulu sebelum reset.');
    const p = a.peserta.find(x => x.id === m.pid);
    if (p) { p.status = 'tampil'; p.tanggal = null; p.nilai = null; p.detail = null; }
    a.scores = emptyScores(); a.result = null; a.timer = freshTimer(); m.status = 'siap'; m.uid = 'S' + n + '-' + Date.now();
    audit(a, by, 'Reset penampilan', reason || 'Sebelum dimulai'); return ok('Penampilan direset.');
  });
  const stats = a => ({ total: a.peserta.length, sudah: a.peserta.filter(p => p.status === 'sudah').length, akan: a.peserta.filter(p => p.status !== 'sudah').length });

  /* ---- skor ---- */
  /* Pengurangan waktu: baris {menit, detik, kurang} = "jika waktu >= menit:detik, kurangi nilai sebesar `kurang`".
     Nilai `kurang` adalah pengurangan TOTAL pada ambang itu (tidak ditambah-tambah); baris terbesar yang terpenuhi dipakai. */
  function calcPenalty(sec, rows) {
    let best = 0;
    (rows || []).forEach(r => { if (sec >= r.menit * 60 + r.detik && r.kurang > best) best = r.kurang; });
    return best;
  }
  function compute(a, fresh) {
    const js = Object.values(a.scores);
    const comps = RULES.components.map(c => {
      const vals = js.map(j => j[c.key].v).filter(v => v !== null);
      return { key: c.key, label: c.label, count: vals.length, avg: vals.length ? r2(vals.reduce((x, y) => x + y, 0) / vals.length) : 0 };
    });
    const sum = r2(comps.reduce((t, c) => t + c.avg, 0));
    const frozen = !fresh && a.match && a.match.status === 'final' && a.result && typeof a.result.penalty === 'number';
    const penalty = frozen ? a.result.penalty : calcPenalty(Math.floor(elapsed(a) / 1000), load().settings.penalty);
    return { comps, sum, penalty, total: Math.max(0, r2(sum - penalty)), complete: js.filter(j => RULES.components.every(c => j[c.key].v !== null)).length };
  }
  const getSettings = () => load().settings;
  function setPenalty(n, rows, by) {
    const clean = [];
    for (const r of rows) {
      const m = parseInt(r.menit, 10), d = parseInt(r.detik, 10), k = parseFloat(r.kurang);
      if (!(m >= 0) || !(d >= 0 && d <= 59) || !(k >= 0)) return fail('Baris tidak valid: menit ≥ 0, detik 0–59, pengurangan ≥ 0.');
      clean.push({ menit: m, detik: d, kurang: k });
    }
    clean.sort((x, y) => x.menit * 60 + x.detik - (y.menit * 60 + y.detik));
    return update(n, (a, st) => {
      st.settings.penalty = clean;
      audit(a, by, 'Pengaturan pengurangan waktu', clean.length ? clean.map(r => `≥ ${fmt((r.menit * 60 + r.detik) * 1000)} = −${r.kurang}`).join('; ') : '(kosong)');
      return ok('Pengaturan pengurangan waktu disimpan.');
    });
  }
  /* Tombol KIRIM Dewan: hentikan timer, tetapkan skor akhir resmi, tampilkan di Live Score.
     Bila sudah final -> KOREKSI (wajib alasan). data: {reason} */
  const confirm = (n, data, by) => update(n, a => {
    const m = a.match; if (!m) return fail('Belum ada peserta.');
    if (m.status === 'siap') return fail('Mulai penampilan terlebih dahulu.');
    const correcting = m.status === 'final';
    if (correcting && !data.reason) return fail('Alasan koreksi wajib diisi.');
    if (!correcting) { a.timer = { running: false, elapsedMs: elapsed(a), startedAt: null }; }
    const sc = compute(a, true), prev = a.result;
    a.result = { total: sc.total, penalty: sc.penalty, elapsedMs: a.timer.elapsedMs, comps: sc.comps.map(c => ({ key: c.key, avg: c.avg })), by, at: Date.now(), correctionReason: correcting ? data.reason : '' };
    m.status = 'final';
    const p = a.peserta.find(x => x.id === m.pid);
    if (p) { p.status = 'sudah'; p.tanggal = Date.now(); p.nilai = sc.total;
      p.detail = { penalty: sc.penalty, sum: sc.sum, elapsedMs: a.timer.elapsedMs, comps: sc.comps.map(c => ({ label: c.label, avg: c.avg })), judges: Object.keys(a.scores).map(j => ({ no: +j, vals: RULES.components.map(c => a.scores[j][c.key].v) })) }; }
    audit(a, by, correcting ? 'Koreksi skor akhir' : 'Skor akhir dikirim', (correcting ? `Alasan: ${data.reason}. Sebelumnya: ${prev ? fmtNum(prev.total) : '-'}. ` : '') + 'Total ' + fmtNum(sc.total));
    return ok(correcting ? 'Koreksi disimpan.' : 'Skor akhir dikirim ke Live Score.');
  });

  return { KEY, RULES, STATUS, PSTATUS, clone, newArena, emptyScores, audit, load, save, getArena, update, effStatus,
    fmt, elapsed, over, limitMs, needsSettle, calcPenalty, getSettings, setPenalty, start, pause, resume, settle, addPeserta, updatePeserta, removePeserta, importPeserta,
    tampilkan, lepas, reset, stats, compute, confirm, fmtNum };
})();
