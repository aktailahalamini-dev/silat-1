/* =====================================================================
   bagan.js — bagan gugur (single elimination): acak, posisi bye, dan tampilan.
   Dipakai halaman Loting (draf/simpan) dan Dewan (Bagan Fighter).
   draw = { key, kategori, kelas, size, slots[], winners{ "r.i": idPeserta }, champion }
   ===================================================================== */
const BAGAN = (() => {
  'use strict';
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const low = x => String(x == null ? '' : x).trim().toLowerCase();
  const keyOf = (kategori, kelas) => kategori + '|' + low(kelas);
  const nextPow2 = n => { let s = 2; while (s < n) s *= 2; return s; };
  /* urutan seed standar: seed 1 vs seed terakhir, dst. -> bye jatuh ke seed teratas */
  function seedPositions(size) { let a = [1]; while (a.length < size) { const m = a.length * 2 + 1; a = a.flatMap(x => [x, m - x]); } return a; }
  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const r = window.crypto && crypto.getRandomValues ? crypto.getRandomValues(new Uint32Array(1))[0] / 4294967296 : Math.random();
      const j = Math.floor(r * (i + 1)); [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
  function makeDraw(peserta, kategori, kelas) {
    const order = shuffle(peserta.map(p => p.id)), size = nextPow2(order.length), slots = new Array(size).fill(null);
    seedPositions(size).forEach((seed, idx) => { slots[idx] = seed <= order.length ? order[seed - 1] : null; });
    return { key: keyOf(kategori, kelas), kategori, kelas, size, slots, winners: {}, champion: null };
  }
  const rounds = d => Math.round(Math.log2(d.size));
  function winnerOf(d, r, i) {
    if (r === 0) {
      const a = d.slots[2 * i], b = d.slots[2 * i + 1];
      if (a && !b) return a; if (b && !a) return b; if (!a && !b) return null;
      return d.winners['0.' + i] || null;
    }
    return d.winners[r + '.' + i] || null;
  }
  const players = (d, r, i) => r === 0 ? [d.slots[2 * i], d.slots[2 * i + 1]] : [winnerOf(d, r - 1, 2 * i), winnerOf(d, r - 1, 2 * i + 1)];
  const roundName = (d, r) => { const left = rounds(d) - r; return left === 1 ? 'FINAL' : left === 2 ? 'SEMIFINAL' : left === 3 ? 'PEREMPAT FINAL' : 'BABAK ' + (r + 1); };

  function render(d, pm, entries) {
    const R = rounds(d), who = id => id && pm[id] ? `<b>${esc(pm[id].nama)}</b><small>${esc(pm[id].kontingen)}</small>` : '';
    let cols = '';
    for (let r = 0; r < R; r++) {
      let body = '';
      for (let i = 0; i < d.size / Math.pow(2, r + 1); i++) {
        const [x, y] = players(d, r, i), w = winnerOf(d, r, i);
        const e = (entries || []).find(t => t.ref && t.ref.key === d.key && t.ref.r === r && t.ref.i === i);
        const empty = r === 0 ? '<em>BYE</em>' : '<em>—</em>';
        const slot = id => `<div class="b-slot${id && w === id ? ' win' : ''}">${id ? who(id) : empty}</div>`;
        const tag = e ? `<span class="tag">P${esc(e.partai)}${e.status === 'sudah' && e.hasil ? ' · ' + e.hasil.red + ':' + e.hasil.blue : e.status === 'tampil' ? ' · tampil' : ''}</span>` : '';
        body += `<div class="b-match">${tag}${slot(x)}${slot(y)}</div>`;
      }
      cols += `<div class="b-col"><h4>${roundName(d, r)}</h4><div class="b-body">${body}</div></div>`;
    }
    const champ = winnerOf(d, R - 1, 0);
    cols += `<div class="b-col champ"><h4>JUARA</h4><div class="b-body"><div class="b-match"><div class="b-slot${champ ? ' win' : ''}">${champ ? who(champ) : '<em>—</em>'}</div></div></div></div>`;
    return `<div class="bracket">${cols}</div>`;
  }
  /* tombol perbesar/perkecil/muat layar untuk bagan yang sangat besar */
  function bindZoom() {
    document.querySelectorAll('.zoom-bar').forEach(bar => {
      const tg = document.getElementById(bar.dataset.zoomTarget); if (!tg) return;
      let z = 1; const zv = bar.querySelector('.zv');
      const set = v => { z = Math.max(.15, Math.min(2, v)); tg.style.zoom = z; if (zv) zv.textContent = Math.round(z * 100) + '%'; };
      bar.addEventListener('click', e => {
        const b = e.target.closest('[data-z]'); if (!b) return;
        if (b.dataset.z === 'in') set(z + .1); else if (b.dataset.z === 'out') set(z - .1); else if (b.dataset.z === 'reset') set(1);
        else { tg.style.zoom = 1; const br = tg.querySelector('.bracket'); set(br ? Math.min(1, tg.clientWidth / br.scrollWidth) : 1); }
      });
    });
  }
  if (typeof document !== 'undefined') { if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bindZoom); else bindZoom(); }
  return { keyOf, nextPow2, makeDraw, rounds, winnerOf, players, render, low, esc };
})();
