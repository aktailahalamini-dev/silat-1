/* =====================================================================
   app.js — fungsi umum UI: query URL, toast, dialog konfirmasi, topbar,
   ticker (tanpa interval ganda), logo placeholder.
   ===================================================================== */
const UI = (() => {
            'use strict';
            const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
            const $ = id => document.getElementById(id);
            const arenaParam = () => { const n = parseInt(new URLSearchParams(location.search).get('arena'), 10); return n === 1 || n === 2 ? n : null; };
            const modeParam = () => (new URLSearchParams(location.search).get('mode') === 'seni' ? 'seni' : 'fight');
            const fmtTime = ts => ts ? new Date(ts).toLocaleTimeString('id-ID', { hour12: false }) : '—';
            const fmtDateTime = ts => ts ? new Date(ts).toLocaleString('id-ID', { hour12: false }) : '—';
            const setText = (el, t) => { if (el && el.textContent !== String(t)) el.textContent = t; };
            /* angka yang berubah "membal" sebentar (animasi) */
            const setNum = (el, t) => { if (el && el.textContent !== String(t)) { el.textContent = t;
                    el.classList.remove('bump');
                    void el.offsetWidth;
                    el.classList.add('bump'); } };
            const setHTML = (el, h) => { if (el && el._h !== h) { el._h = h;
                    el.innerHTML = h; } };

            /* Slot logo: gambar di assets/logos/. Jika file tidak ada, slot memakai teks cadangan CSS. */
            const logoSlot = (file, label) =>
                `<span class="logo-slot" data-label="${label}"><img src="assets/logos/${file}" alt="" onload="this.parentNode.classList.add('has-img')" onerror="this.remove()"></span>`;

            function toast(msg, type) {
                let box = $('toasts');
                if (!box) { box = document.createElement('div');
                    box.id = 'toasts';
                    box.setAttribute('aria-live', 'polite');
                    document.body.appendChild(box); }
                const t = document.createElement('div');
                t.className = 'toast ' + (type || 'info');
                t.textContent = msg;
                box.appendChild(t);
                setTimeout(() => t.remove(), 4200);
            }

            /* Dialog konfirmasi. opts: {title, html, okText, reason:{label, required}} -> Promise<{ok, reason}> */
            function confirmDialog(opts) {
                return new Promise(resolve => {
                            const ov = document.createElement('div');
                            ov.className = 'modal-ov';
                            ov.innerHTML = `<div class="modal" role="dialog" aria-modal="true" aria-labelledby="mdT">
        <h3 id="mdT">${esc(opts.title)}</h3><div class="modal-body">${opts.html || ''}</div>
        ${opts.reason ? `<label class="field"><span>${esc(opts.reason.label)}</span><textarea id="mdR" rows="2"></textarea></label><p class="err" id="mdE" hidden></p>` : ''}
        <div class="modal-act"><button class="btn btn-ghost" data-r="0">Batal</button><button class="btn btn-primary" data-r="1">${esc(opts.okText || 'Ya, lanjutkan')}</button></div></div>`;
      document.body.appendChild(ov);
      const close = r => { ov.remove(); document.removeEventListener('keydown', onKey); resolve(r); };
      const onKey = e => { if (e.key === 'Escape') close({ ok: false }); };
      document.addEventListener('keydown', onKey);
      ov.addEventListener('click', e => {
        const b = e.target.closest('[data-r]');
        if (!b) return;
        if (b.dataset.r === '0') return close({ ok: false });
        let reason = '';
        if (opts.reason) {
          reason = ov.querySelector('#mdR').value.trim();
          if (opts.reason.required && !reason) { const er = ov.querySelector('#mdE'); er.hidden = false; er.textContent = 'Alasan wajib diisi.'; return; }
        }
        close({ ok: true, reason });
      });
      ov.querySelector('[data-r="0"]').focus();
    });
  }

  /* Topbar halaman dalam. opts: {title, session, backHref} */
  function topbar(opts) {
    const s = opts.session;
    $('topbar').innerHTML = `${logoSlot('logo-left.png', 'L')}
      <div class="tb-title"><strong>AR-RANIRY TAPAK SUCI CHAMPIONSHIP IV</strong><span>TINGKAT PROVINSI ACEH</span></div>
      <div class="tb-right"><span class="tb-role">${esc(opts.title)}</span>${s ? `<span class="badge">${s.mode === 'seni' ? 'Seni' : 'Fight'} · Arena ${s.arena}</span><span class="tb-user">${esc(s.name)}</span><button class="btn btn-ghost" id="btnExit">KELUAR</button>` : ''}</div>`;
    const b = $('btnExit');
    if (b) b.onclick = () => { ATSC_AUTH.logout(); location.href = 'arena.html?arena=' + s.arena + '&mode=' + (s.mode || 'fight'); };
  }

  /* Satu ticker per halaman (tidak membuat interval ganda). Juga bereaksi pada perubahan tab lain. */
  let tickId = null;
  function every(fn, ms) {
    if (tickId) clearInterval(tickId);
    tickId = setInterval(fn, ms || 250);
    window.addEventListener('storage', e => { if (e.key === ATSC.KEY) fn(); });
    fn();
  }

  /* Latar: bayangan ringan status arena di halaman utama */
  function homeChips() {
    const mode = modeParam();
    document.querySelectorAll('[data-arena-chip]').forEach(el => {
      const n = +el.dataset.arenaChip;
      if (mode === 'seni' && typeof SENI !== 'undefined') {
        const a = SENI.getArena(n), st = SENI.effStatus(a);
        el.textContent = a.match ? `Peserta ${a.match.nomor} · ${SENI.STATUS[st]}` : SENI.STATUS.kosong; el.dataset.st = st; return;
      }
     if (typeof ATSC !== 'undefined') {
        const a = ATSC.getArena(n), st = ATSC.effStatus(a);
        el.textContent = a.match ? `Partai ${a.match.nomor} - ${ATSC.STATUS[st]}` : ATSC.STATUS.kosong; 
        el.dataset.st = st;
    }
    });
  }
  if (document.querySelector('[data-arena-chip]')) setInterval(homeChips, 1000), homeChips();

  return { esc, $, arenaParam, modeParam, setNum, fmtTime, fmtDateTime, setText, setHTML, logoSlot, toast, confirmDialog, topbar, every };
})();

/* efek riak pada tombol saat ditekan */
document.addEventListener('click', e => {
  const b = e.target.closest('.btn, .tech-btn, .pen-btn, .keypad button, .round-opt, .dw-nav button');
  if (!b || b.disabled) return;
  const r = b.getBoundingClientRect(), s = document.createElement('span');
  s.className = 'rip'; s.style.left = (e.clientX - r.left) + 'px'; s.style.top = (e.clientY - r.top) + 'px';
  b.appendChild(s); s.addEventListener('animationend', () => s.remove());
});