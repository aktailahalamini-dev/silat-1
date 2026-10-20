/* seni-live.js — Live Score seni (publik, hanya baca). */
(() => {
  'use strict';
  const n = UI.arenaParam();
  if (!n) { location.replace('index.html'); return; }
  const $ = UI.$, C = SENI.RULES.components;
  document.title = `Live Score Seni Arena ${n} — ATSC IV`;
  $('arenaTag').textContent = `SENI · ARENA ${n} · LIVE SCORE`;
  $('fsBtn').onclick = () => document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen && document.documentElement.requestFullscreen();
  $('snPanels').innerHTML = C.map(c => `<section class="sn-panel"><h2>${c.label}</h2><div class="big" id="v-${c.key}">0</div><small id="n-${c.key}"></small></section>`).join('');

  function render() {
    const a = SENI.getArena(n), m = a.match, st = SENI.effStatus(a);
    const sEl = $('snStatus'); UI.setText(sEl, SENI.STATUS[st]); sEl.dataset.st = st;
    const sc = SENI.compute(a);
    UI.setText($('snKat'), m ? m.kategori.toUpperCase() : 'KATEGORI SENI');
    const show = !SENI.RULES.publishOnConfirm || st === 'final';
    UI.setText($('snNama'), m ? m.nama : '—'); UI.setText($('snKont'), m ? m.kontingen : '');
    UI.setText($('snTimer'), m ? SENI.fmt(SENI.elapsed(a)) : '00:00');
    sc.comps.forEach(c => { UI.setNum($('v-' + c.key), m ? SENI.fmtNum(c.avg) : '0'); UI.setText($('n-' + c.key), m ? `${c.count}/${SENI.RULES.judgeCount} juri` : ''); });
    UI.setNum($('snTotal'), m && show ? SENI.fmtNum(sc.total) : '0');
    UI.setText($('snPen'), m && show && sc.penalty > 0 ? `(pengurangan waktu −${SENI.fmtNum(sc.penalty)})` : '');
    $('snTimer').classList.toggle('low', !!m && SENI.over(a));
  }
  UI.every(render, 200);
})();
