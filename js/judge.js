/* judge.js — remot juri (sesuai gambar remot). Tanpa tombol kirim: setiap ketukan langsung
   disimpan ke ATSC.scores[nomorJuri] pada arena sesi ini (juri lain tidak tertimpa).
   Poin sah di Live Score bila >= 2 juri menekan yang sama (lihat results.js). */
(() => {
  'use strict';
  const S = ATSC_AUTH.require('juri');
  if (!S) return;
  const n = S.arena, no = S.no, R = ATSC.RULES, $ = UI.$;
  UI.topbar({ title: 'JURI', session: S });
  $('jWho').textContent = `JURI ${no}`;

  const sideHTML = (key, label) => `<section class="jside ${key}" data-side="${key}"><h2>${label}</h2>
    <div class="tech-grid">${R.techButtons.map((b, i) => `<div class="tech">
      <button class="tech-btn" data-act="tech" data-side="${key}" data-i="${i}"><span class="tl">${b.label}</span><span class="tv">${b.show}</span><span class="tc" data-c="${i}">×0</span></button>
      <button class="tech-undo" data-act="undo" data-side="${key}" data-i="${i}" aria-label="Batalkan satu ${b.label}">−1</button></div>`).join('')}</div>
    <div class="pen-row">${R.penaltyBtns.map(b => `<button class="pen-btn" data-act="pen" data-side="${key}" data-f="${b.key}" data-i="${b.idx}" data-pen="${b.key}${b.idx}" title="${b.name}">${b.label}</button>`).join('')}</div>
    <div class="side-sum">Input Anda: <b data-sum>0</b> · Nilai sah (≥2 juri): <b data-ofc>0</b></div></section>`;
  $('redSide').innerHTML = sideHTML('red', 'SUDUT MERAH');
  $('blueSide').innerHTML = sideHTML('blue', 'SUDUT BIRU');

  const canScore = a => !!a.match && !['siap', 'final'].includes(a.match.status);

  function paint(a) {
    const m = a.match, st = ATSC.effStatus(a), ok = canScore(a);
    const nt = $('jNotice');
    if (!m) { nt.hidden = false; nt.textContent = 'Belum ada partai di arena ini. Menunggu Dewan.'; }
    else if (m.status === 'siap') { nt.hidden = false; nt.textContent = 'Menunggu Dewan memulai pertandingan.'; }
    else if (m.status === 'final') { nt.hidden = false; nt.textContent = 'Hasil resmi sudah ditetapkan. Penilaian ditutup.'; }
    else if (m.status === 'selesai') { nt.hidden = false; nt.textContent = 'Pertandingan diakhiri oleh Dewan.'; }
    else nt.hidden = true;
    UI.setText($('jPartai'), m ? m.nomor : '—'); UI.setText($('jKat'), m ? m.kategori : '');
    UI.setText($('jBabak'), m ? ATSC_TIMER.roundOf(a).label : '—');
    UI.setText($('jUrut'), m ? (m.juri[no - 1] || '') : '');
    UI.setText($('jTimer'), m ? ATSC_TIMER.fmt(ATSC_TIMER.remaining(a)) : '00:00');
    const sEl = $('jStatus'); UI.setText(sEl, ATSC.STATUS[st]); sEl.dataset.st = st;
    const rec = a.scores[no], sc = ATSC_RESULTS.compute(a);
    ['red', 'blue'].forEach(k => {
      const root = document.querySelector(`.jside.${k}`), d = rec[k];
      root.querySelectorAll('[data-c]').forEach(e => UI.setText(e, '×' + d.tech[+e.dataset.c]));
      root.querySelectorAll('.pen-btn').forEach(e => e.classList.toggle('on', d[e.dataset.f][+e.dataset.i]));
      UI.setText(root.querySelector('[data-sum]'), ATSC_RESULTS.ownOf(d));
      UI.setText(root.querySelector('[data-ofc]'), ATSC_RESULTS.fmtScore(sc[k].score));
      root.querySelectorAll('button').forEach(b => b.disabled = !ok);
    });
    const be = $('jSent');
    UI.setText(be, rec.revision > 0 ? 'Tersimpan otomatis' : 'Belum ada input');
    be.dataset.ok = rec.revision > 0 ? '1' : '0';
    UI.setText($('jTime'), UI.fmtTime(rec.submittedAt));
  }
  const render = () => paint(ATSC.getArena(n));

  document.querySelector('.j-sides').addEventListener('click', e => {
    const b = e.target.closest('button[data-act]'); if (!b || b.disabled) return;
    if (!ATSC_AUTH.can('juri', n)) { UI.toast('Sesi tidak sah untuk arena ini.', 'err'); return; }
    const side = b.dataset.side, i = +b.dataset.i;
    const done = ATSC.update(n, a => {
      if (!canScore(a)) return false;
      const rec = a.scores[no], d = rec[side];
      if (b.dataset.act === 'tech') d.tech[i]++;
      else if (b.dataset.act === 'undo') d.tech[i] = Math.max(0, d.tech[i] - 1);
      else if (b.dataset.act === 'pen') d[b.dataset.f][i] = !d[b.dataset.f][i];
      rec.submittedAt = Date.now(); rec.revision++;
      return true;
    });
    if (!done) UI.toast('Penilaian sedang ditutup.', 'err');
    render();
  });
  UI.every(render, 250);
})();
