/* =====================================================================
   timer.js — Timer per arena berbasis TIMESTAMP (Date.now), bukan
   pengurangan interval. Tiap arena menyimpan timer sendiri sehingga
   jeda di Arena 1 tidak memengaruhi Arena 2.
   timer = { running, remainingMs (saat berhenti), endsAt (saat berjalan) }
   ===================================================================== */
const ATSC_TIMER = (() => {
  'use strict';
  const ok = msg => ({ ok: true, msg }), fail = msg => ({ ok: false, msg });
  const fmt = ms => {
    const s = Math.ceil(Math.max(0, ms) / 1000);
    return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
  };
  const remaining = (a, now = Date.now()) =>
    a.timer.running ? Math.max(0, a.timer.endsAt - now) : a.timer.remainingMs;
  const roundOf = a => ATSC.buildRounds(a.match)[a.match.roundIndex];
  const needsSettle = a => !!a.match && a.match.status === 'berlangsung' && a.timer.running && Date.now() >= a.timer.endsAt;

  function start(n, by) {
    return ATSC.update(n, a => {
      const m = a.match;
      if (!m) return fail('Belum ada partai.');
      if (!['siap', 'siap-babak'].includes(m.status)) return fail('Pertandingan tidak dalam keadaan siap dimulai.');
      if (a.timer.remainingMs <= 0) return fail('Waktu babak sudah 00:00.');
      a.timer = { running: true, remainingMs: a.timer.remainingMs, endsAt: Date.now() + a.timer.remainingMs };
      m.status = 'berlangsung';
      ATSC.audit(a, by, 'Timer', 'Mulai ' + roundOf(a).label);
      return ok('Pertandingan dimulai.');
    });
  }
  function pause(n, by) {
    return ATSC.update(n, a => {
      const m = a.match;
      if (!m || m.status !== 'berlangsung' || !a.timer.running) return fail('Timer tidak sedang berjalan.');
      a.timer = { running: false, remainingMs: Math.max(0, a.timer.endsAt - Date.now()), endsAt: null };
      m.status = 'dijeda';
      ATSC.audit(a, by, 'Timer', 'Jeda pada ' + fmt(a.timer.remainingMs));
      return ok('Pertandingan dijeda.');
    });
  }
  function resume(n, by) {
    return ATSC.update(n, a => {
      const m = a.match;
      if (!m || m.status !== 'dijeda') return fail('Pertandingan tidak sedang dijeda.');
      if (a.timer.remainingMs <= 0) return fail('Waktu babak sudah 00:00.');
      a.timer = { running: true, remainingMs: a.timer.remainingMs, endsAt: Date.now() + a.timer.remainingMs };
      m.status = 'berlangsung';
      ATSC.audit(a, by, 'Timer', 'Lanjut dari ' + fmt(a.timer.remainingMs));
      return ok('Pertandingan dilanjutkan.');
    });
  }
  /* Dipanggil halaman Dewan: waktu habis -> timer berhenti di 00:00, TANPA menetapkan pemenang. */
  function settle(n) {
    return ATSC.update(n, a => {
      if (!needsSettle(a)) return fail('');
      a.timer = { running: false, remainingMs: 0, endsAt: null };
      a.match.status = 'waktu-habis';
      ATSC.audit(a, 'Sistem', 'Timer', 'Waktu ' + roundOf(a).label + ' habis');
      return ok('Waktu habis.');
    });
  }
  function setRound(n, idx, by) {
    return ATSC.update(n, a => {
      const m = a.match;
      if (!m) return fail('Belum ada partai.');
      if (['selesai', 'final'].includes(m.status)) return fail('Pertandingan sudah diakhiri.');
      if (a.timer.running) return fail('Jeda timer terlebih dahulu sebelum mengganti babak.');
      const rounds = ATSC.buildRounds(m);
      if (!rounds[idx]) return fail('Babak tidak tersedia.');
      m.roundIndex = idx;
      a.timer = { running: false, remainingMs: rounds[idx].ms, endsAt: null };
      if (m.status !== 'siap') m.status = 'siap-babak';
      ATSC.audit(a, by, 'Babak', 'Pindah ke ' + rounds[idx].label);
      return ok('Babak diganti ke ' + rounds[idx].label + '.');
    });
  }
  function end(n, by) {
    return ATSC.update(n, a => {
      const m = a.match;
      if (!m || !['berlangsung', 'dijeda', 'waktu-habis', 'siap-babak'].includes(m.status)) return fail('Pertandingan belum berjalan atau sudah diakhiri.');
      a.timer = { running: false, remainingMs: remaining(a), endsAt: null };
      m.status = 'selesai';
      ATSC.audit(a, by, 'Pertandingan', 'Diakhiri oleh Dewan');
      return ok('Pertandingan diakhiri. Silakan tetapkan hasil resmi.');
    });
  }
  return { fmt, remaining, roundOf, needsSettle, start, pause, resume, settle, setRound, end };
})();
