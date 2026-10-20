/* seni-judge.js — remot juri seni: keypad angka per komponen + tombol KIRIM per komponen.
   Juri hanya menulis ke SENI.scores[nomorJuri] pada arena sesinya. */
(() => {
  'use strict';
  const S = ATSC_AUTH.require('juri', 'seni');
  if (!S) return;
  const n = S.arena, no = S.no, R = SENI.RULES, C = R.components, $ = UI.$;
  UI.topbar({ title: 'JURI — SENI', session: S });
  $('sjWho').textContent = no;
  const entry = {}; C.forEach(c => entry[c.key] = '');

  $('sjCols').innerHTML = C.map(c => `<section class="sj-col" data-k="${c.key}"><h2>${c.label}</h2>
    <div class="sj-disp empty" data-disp>—</div>
    <div class="keypad">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(d => `<button data-act="d" data-v="${d}">${d}</button>`).join('')}
      <span></span><button data-act="d" data-v="0">0</button><button class="kx" data-act="x" aria-label="Hapus">X</button></div>
    <button class="btn btn-primary big" data-act="send">KIRIM</button><div class="sj-info" data-info></div></section>`).join('');

  const canScore = a => !!a.match && !['siap', 'final'].includes(a.match.status);

  function paint(a) {
    const m = a.match, st = SENI.effStatus(a), ok = canScore(a);
    const nt = $('sjNotice');
    const msg = !m ? 'Belum ada peserta di arena ini. Menunggu Dewan.' : m.status === 'siap' ? 'Menunggu Dewan memulai penampilan.' : m.status === 'final' ? 'Skor akhir sudah dikonfirmasi. Penilaian ditutup.' : '';
    nt.hidden = !msg; nt.textContent = msg;
    UI.setText($('sjNo'), m ? m.nomor : '—'); UI.setText($('sjKat'), m ? m.kategori : '');
    UI.setText($('sjNama'), m ? m.nama : '—'); UI.setText($('sjKont'), m ? m.kontingen : '');
    UI.setText($('sjTimer'), m ? SENI.fmt(SENI.elapsed(a)) : '00:00');
    const sEl = $('sjStatus'); UI.setText(sEl, SENI.STATUS[st]); sEl.dataset.st = st;
    C.forEach(c => {
      const root = document.querySelector(`.sj-col[data-k="${c.key}"]`), rec = a.scores[no][c.key];
      const disp = root.querySelector('[data-disp]');
      UI.setText(disp, entry[c.key] || '—'); disp.classList.toggle('empty', !entry[c.key]);
      UI.setText(root.querySelector('[data-info]'), rec.rev ? `Terkirim: ${rec.v} · ${UI.fmtTime(rec.at)}${rec.rev > 1 ? ` (kiriman ke-${rec.rev})` : ''}` : 'Belum dikirim');
      root.querySelectorAll('button').forEach(b => b.disabled = !ok);
    });
  }
  const render = () => paint(SENI.getArena(n));

  $('sjCols').addEventListener('click', async e => {
    const b = e.target.closest('button[data-act]'); if (!b || b.disabled) return;
    const k = b.closest('.sj-col').dataset.k;
    if (!ATSC_AUTH.can('juri', n, 'seni')) { UI.toast('Sesi tidak sah untuk arena ini.', 'err'); return; }
    if (b.dataset.act === 'x') entry[k] = '';
    else if (b.dataset.act === 'd') {
      const next = entry[k] + b.dataset.v;
      if (next.length <= R.maxDigits && Number(next) <= R.max) entry[k] = String(Number(next)) === next || next === '0' ? next : String(Number(next));
      else UI.toast(`Nilai maksimum ${R.max}.`, 'err');
    } else if (b.dataset.act === 'send') {
      const v = entry[k] === '' ? NaN : Number(entry[k]);
      if (!(v >= R.min && v <= R.max)) { UI.toast(`Isi nilai ${R.min}–${R.max} dahulu.`, 'err'); return; }
      const prev = SENI.getArena(n).scores[no][k];
      if (prev.rev > 0) {
        const c = await UI.confirmDialog({ title: 'Kirim ulang nilai?', html: `<p>Nilai ${k.toUpperCase()} Anda sebelumnya (<b>${prev.v}</b>) akan diganti menjadi <b>${v}</b>.</p>`, okText: 'Kirim ulang' });
        if (!c.ok) return;
      }
      const res = SENI.update(n, a => {
        if (!canScore(a)) return fail('Penilaian sedang ditutup.');
        const rec = a.scores[no][k]; rec.v = v; rec.at = Date.now(); rec.rev++;
        SENI.audit(a, S.name, 'Nilai dikirim', `${k.toUpperCase()} = ${v} (kiriman ke-${rec.rev})`);
        return { ok: true };
      });
      if (res.ok) { entry[k] = ''; UI.toast(`Nilai ${k.toUpperCase()} terkirim.`, 'ok'); } else UI.toast(res.msg, 'err');
    }
    render();
  });
  const fail = msg => ({ ok: false, msg });
  UI.every(render, 250);
})();
