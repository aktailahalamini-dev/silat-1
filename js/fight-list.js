/* =====================================================================
   fight-list.js (FD) — Data Fighter (daftar partai global), peserta Loting,
   penyimpanan bagan, dan sinkronisasi hasil partai -> bagan.
   Daftar partai dipakai bersama oleh Dewan Arena 1 & 2; satu partai hanya
   bisa ditampilkan di satu arena (status akan -> tampil -> sudah).
   PROTOTYPE: tersimpan di localStorage; nanti pindah ke PHP + MySQL.
   ===================================================================== */
const FD = (() => {
  'use strict';
  const ok = (msg, extra) => Object.assign({ ok: true, msg }, extra), fail = msg => ({ ok: false, msg });
  const KATS = ['Putra', 'Putri', 'Usia Dini'];
  const low = BAGAN.low;
  const rid = p => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
  const normKat = k => KATS.find(x => low(x) === low(k)) || null;
  const pmap = s => { const m = {}; s.loting.peserta.forEach(p => { m[p.id] = p; }); return m; };
  const fighter = (pm, id) => pm[id] ? { id, nama: pm[id].nama, kontingen: pm[id].kontingen } : { id, nama: '?', kontingen: '' };
  const nextPartai = s => String(Math.max(0, ...s.fightList.map(e => parseInt(e.partai, 10) || 0)) + 1);
  const entryOf = (s, a) => a.match ? s.fightList.find(e => e.id === a.match.entryId) || null : null;
  const refEntry = (s, key, r, i) => s.fightList.find(e => e.ref && e.ref.key === key && e.ref.r === r && e.ref.i === i);

  /* ---------- Data Fighter ---------- */
  function checkEntry(s, d, ignoreId) {
    const e = [];
    if (!d.partai) e.push('Nomor partai wajib diisi.');
    else if (s.fightList.some(x => x.id !== ignoreId && low(x.partai) === low(d.partai))) e.push(`Nomor partai ${d.partai} sudah dipakai.`);
    if (!d.kategori) e.push('Kategori wajib diisi.'); if (!d.kelas) e.push('Kelas wajib diisi.');
    if (!d.red.nama) e.push('Nama pesilat merah wajib diisi.'); if (!d.red.kontingen) e.push('Kontingen merah wajib diisi.');
    if (!d.blue.nama) e.push('Nama pesilat biru wajib diisi.'); if (!d.blue.kontingen) e.push('Kontingen biru wajib diisi.');
    if (d.red.nama && low(d.red.nama) === low(d.blue.nama) && low(d.red.kontingen) === low(d.blue.kontingen)) e.push('Pesilat merah dan biru tidak boleh sama.');
    if (!(d.babak >= 1 && d.babak <= 3)) e.push('Jumlah babak harus 1–3.');
    if (!(d.durasiMenit > 0)) e.push('Timer (durasi babak) harus lebih dari 0.');
    if (!(d.durasiTambahanMenit >= 0)) e.push('Durasi tambahan tidak valid (0 = tidak ada).');
    return e;
  }
  const build = (d, old) => ({ partai: d.partai, babak: d.babak, kategori: d.kategori, kelas: d.kelas,
    red: { id: old ? old.red.id : null, nama: d.red.nama, kontingen: d.red.kontingen }, blue: { id: old ? old.blue.id : null, nama: d.blue.nama, kontingen: d.blue.kontingen },
    durasiMenit: d.durasiMenit, tambahan: d.durasiTambahanMenit > 0, durasiTambahanMenit: d.durasiTambahanMenit > 0 ? d.durasiTambahanMenit : 1 });
  const addEntry = (n, d, by) => ATSC.update(n, (a, s) => {
    const e = checkEntry(s, d); if (e.length) return { ok: false, msg: e[0], errors: e };
    s.fightList.push(Object.assign({ id: rid('E'), status: 'akan', arena: null, tanggal: null, hasil: null, ref: null, createdAt: Date.now() }, build(d)));
    ATSC.audit(a, by, 'Data fighter ditambah', `Partai ${d.partai}: ${d.red.nama} vs ${d.blue.nama}`); return ok('Data partai disimpan.');
  });
  const updateEntry = (n, id, d, by) => ATSC.update(n, (a, s) => {
    const x = s.fightList.find(t => t.id === id);
    if (!x) return fail('Partai tidak ditemukan.');
    if (x.status !== 'akan') return fail('Hanya partai berstatus "Akan bertanding" yang dapat diubah.');
    if (x.ref) Object.assign(d, { kategori: x.kategori, kelas: x.kelas, red: { nama: x.red.nama, kontingen: x.red.kontingen }, blue: { nama: x.blue.nama, kontingen: x.blue.kontingen } });
    const e = checkEntry(s, d, id); if (e.length) return { ok: false, msg: e[0], errors: e };
    Object.assign(x, build(d, x)); ATSC.audit(a, by, 'Data fighter diubah', `Partai ${d.partai}`); return ok('Perubahan disimpan.');
  });
  const removeEntry = (n, id, by) => ATSC.update(n, (a, s) => {
    const x = s.fightList.find(t => t.id === id);
    if (!x || x.status !== 'akan' || x.ref) return fail('Hanya partai manual berstatus "Akan" yang dapat dihapus (partai dari bagan dihapus dengan loting ulang).');
    s.fightList = s.fightList.filter(t => t.id !== id); ATSC.audit(a, by, 'Data fighter dihapus', 'Partai ' + x.partai); return ok('Partai dihapus.');
  });
  const tampilkan = (n, id, by) => ATSC.update(n, (a, s) => {
    if (a.match && a.match.status !== 'final') return fail('Selesaikan atau lepas partai yang sedang tampil dahulu.');
    const x = s.fightList.find(t => t.id === id);
    if (!x || x.status !== 'akan') return fail('Partai tidak tersedia.');
    if (x.arena && x.arena !== n) return fail('Partai ini ditugaskan ke Arena ' + x.arena + '.');
    ATSC.createMatch(a, ATSC.matchFromEntry(x), by); x.status = 'tampil'; x.arena = n;
    return ok('Partai ' + x.partai + ' ditampilkan di Arena ' + n + '.');
  });
  const lepas = (n, by) => ATSC.update(n, (a, s) => {
    if (!a.match || a.match.status !== 'siap') return fail('Hanya bisa dilepas sebelum pertandingan dimulai.');
    const x = s.fightList.find(t => t.id === a.match.entryId); if (x) { x.status = 'akan'; x.arena = null; }
    ATSC.audit(a, by, 'Partai dilepas', 'Partai ' + a.match.nomor); a.match = null; a.scores = ATSC.emptyScores(); a.result = null;
    a.timer = { running: false, remainingMs: 0, endsAt: null }; return ok('Partai dikembalikan ke daftar "Akan bertanding".');
  });
  const resetMatch = (n, reason, by) => ATSC.update(n, (a, s) => {
    const m = a.match; if (!m) return fail('Belum ada partai.');
    if (m.status === 'berlangsung') return fail('Jeda timer dahulu sebelum reset.');
    const x = s.fightList.find(t => t.id === m.entryId);
    if (x && x.ref && x.status === 'sudah') { const err = canSetWinner(s, x, null); if (err) return fail(err); setWinner(s, x, null); }
    if (x) { x.status = 'tampil'; x.tanggal = null; x.hasil = null; }
    a.scores = ATSC.emptyScores(); a.result = null; a.scoreLog = []; m.status = 'siap'; m.roundIndex = 0; m.uid = 'A' + n + '-' + Date.now();
    a.timer = { running: false, remainingMs: ATSC.buildRounds(m)[0].ms, endsAt: null };
    ATSC.audit(a, by, 'Reset partai', reason || 'Sebelum dimulai'); return ok('Pertandingan direset.');
  });
  function stats(s) {
    const t = s.fightList.length, sd = s.fightList.filter(e => e.status === 'sudah').length;
    return { total: t * 2, sudah: sd * 2, akan: (t - sd) * 2 };
  }

  /* ---------- peserta loting ---------- */
  function checkPeserta(s, d) {
    const e = [];
    if (!d.nama) e.push('Nama wajib diisi.'); if (!d.kontingen) e.push('Kontingen wajib diisi.');
    if (!normKat(d.kategori)) e.push('Kategori harus Putra, Putri, atau Usia Dini.'); if (!d.kelas) e.push('Kelas wajib diisi.');
    if (!e.length && s.loting.peserta.some(p => low(p.nama) === low(d.nama) && low(p.kontingen) === low(d.kontingen) && p.kategori === normKat(d.kategori) && low(p.kelas) === low(d.kelas))) e.push('Peserta sudah terdaftar.');
    return e;
  }
  const addPeserta = d => ATSC.mutate(s => {
    const e = checkPeserta(s, d); if (e.length) return { ok: false, msg: e[0], errors: e };
    s.loting.peserta.push({ id: rid('L'), nama: d.nama, kontingen: d.kontingen, kategori: normKat(d.kategori), kelas: d.kelas }); return ok('Peserta disimpan.');
  });
  /* satu baris: nama ; kontingen ; kategori ; kelas  (boleh tempel langsung dari Excel). TANPA batas jumlah. */
  function importPeserta(text) {
    return ATSC.mutate(s => {
      let added = 0; const errors = [];
      text.split(/\r?\n/).map(l => l.trim()).filter(Boolean).forEach((line, i) => {
        const [nama = '', kontingen = '', kategori = '', kelas = ''] = line.split(/[;\t]/).map(x => x.trim());
        const d = { nama, kontingen, kategori, kelas }, e = checkPeserta(s, d);
        if (e.length) { errors.push(`Baris ${i + 1}: ${e[0]}`); return; }
        s.loting.peserta.push({ id: rid('L'), nama, kontingen, kategori: normKat(kategori), kelas }); added++;
      });
      return { ok: added > 0, msg: `${added} peserta diimpor${errors.length ? `, ${errors.length} baris ditolak` : ''}.`, errors };
    });
  }
  const removePeserta = id => ATSC.mutate(s => {
    if (Object.values(s.loting.draws).some(d => d.slots.includes(id))) return fail('Peserta sudah masuk bagan yang tersimpan.');
    s.loting.peserta = s.loting.peserta.filter(p => p.id !== id); return ok('Peserta dihapus.');
  });

  /* ---------- bagan -> daftar partai ---------- */
  function syncEntries(s, d) {
    const pm = pmap(s), cfg = d.config || { babak: 2, durasiMenit: 2, durasiTambahanMenit: 1 };
    for (let r = 0; r < BAGAN.rounds(d); r++) {
      for (let i = 0; i < d.size / Math.pow(2, r + 1); i++) {
        const [x, y] = BAGAN.players(d, r, i), e = refEntry(s, d.key, r, i);
        if (x && y) {
          if (!e) s.fightList.push({ id: rid('E'), partai: nextPartai(s), babak: cfg.babak, kategori: d.kategori, kelas: d.kelas, red: fighter(pm, x), blue: fighter(pm, y),
            durasiMenit: cfg.durasiMenit, tambahan: cfg.durasiTambahanMenit > 0, durasiTambahanMenit: cfg.durasiTambahanMenit > 0 ? cfg.durasiTambahanMenit : 1,
            status: 'akan', arena: null, tanggal: null, hasil: null, ref: { key: d.key, r, i }, createdAt: Date.now() });
          else if (e.status === 'akan') { e.red = fighter(pm, x); e.blue = fighter(pm, y); }
        } else if (e && e.status === 'akan') s.fightList = s.fightList.filter(t => t !== e);
      }
    }
    d.champion = BAGAN.winnerOf(d, BAGAN.rounds(d) - 1, 0);
  }
  function canSetWinner(s, e, wid) {
    if (!e.ref) return null;
    const d = s.loting.draws[e.ref.key]; if (!d) return null;
    if ((d.winners[e.ref.r + '.' + e.ref.i] || null) === (wid || null)) return null;
    const ne = refEntry(s, e.ref.key, e.ref.r + 1, Math.floor(e.ref.i / 2));
    return ne && ne.status !== 'akan' ? 'Hasil tidak dapat diubah: partai babak berikutnya sudah ditampilkan/berjalan.' : null;
  }
  function setWinner(s, e, wid) {
    const d = s.loting.draws[e.ref.key]; if (!d) return;
    const k = e.ref.r + '.' + e.ref.i; if (wid) d.winners[k] = wid; else delete d.winners[k];
    syncEntries(s, d);
  }
  /* dipanggil results.confirm setelah hasil resmi ditetapkan / dikoreksi */
  function applyResult(s, a) {
    const e = entryOf(s, a); if (!e) return;
    const r = a.result;
    e.status = 'sudah'; e.tanggal = r.at; e.hasil = { red: r.scores.red, blue: r.scores.blue, winnerSide: r.winnerSide, basis: r.basis };
    if (e.ref) setWinner(s, e, r.winnerSide ? e[r.winnerSide].id || null : null);
  }
  function saveDraw(draw, config, by) {
    return ATSC.mutate(s => {
      const pm = pmap(s);
      if (!draw || draw.slots.filter(Boolean).length < 2) return fail('Minimal 2 peserta untuk bagan.');
      if (draw.slots.some(id => id && (!pm[id] || pm[id].kategori !== draw.kategori || low(pm[id].kelas) !== low(draw.kelas)))) return fail('Data peserta berubah. Ulangi loting.');
      if (s.loting.draws[draw.key]) {
        if (s.fightList.some(e => e.ref && e.ref.key === draw.key && e.status !== 'akan')) return fail('Bagan tidak dapat diganti: sudah ada partai yang ditampilkan/selesai.');
        s.fightList = s.fightList.filter(e => !(e.ref && e.ref.key === draw.key));
      }
      const d = Object.assign({}, draw, { winners: {}, champion: null, config, savedAt: Date.now(), by });
      s.loting.draws[draw.key] = d; syncEntries(s, d);
      return ok(`Bagan ${draw.kategori} — ${draw.kelas} disimpan. Partai otomatis masuk ke Data Fighter Dewan.`);
    });
  }
  const isLocked = (s, key) => s.fightList.some(e => e.ref && e.ref.key === key && e.status !== 'akan');

  return { KATS, normKat, nextPartai, entryOf, checkEntry, addEntry, updateEntry, removeEntry, tampilkan, lepas, resetMatch, stats,
    addPeserta, importPeserta, removePeserta, saveDraw, isLocked, canSetWinner, applyResult, pmap };
})();
