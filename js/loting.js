/* loting.js — dasbor Loting (panitia): pilih kelas + kategori, acak, simpan bagan.
   Bagan tersimpan otomatis menjadi Data Fighter & Bagan Fighter di Dewan. */
(() => {
  'use strict';
  const S = ATSC_AUTH.require('loting', 'fight');
  if (!S) return;
  const $ = UI.$, esc = UI.esc, low = BAGAN.low;
  let kat = 'Putra', draft = null, draftKey = '';
  $('btnExit').onclick = () => { ATSC_AUTH.logout(); location.href = 'pilih-arena.html?mode=fight'; };
  const guard = () => { if (!ATSC_AUTH.can('loting', 0)) { UI.toast('Sesi tidak sah.', 'err'); return false; } return true; };
  const showErr = (id, errs) => { const el = $(id); el.hidden = !errs || !errs.length; el.innerHTML = (errs || []).map(x => `<li>${esc(x)}</li>`).join(''); };
  const kelas = () => $('lotKelas').value.trim();
  const curKey = () => BAGAN.keyOf(kat, kelas());
  const group = (s, k) => s.loting.peserta.filter(p => p.kategori === k && low(p.kelas) === low(kelas()));

  function render() {
    const s = ATSC.load(), key = curKey(), cur = group(s, kat), saved = s.loting.draws[key];
    if (draftKey !== key) { draft = null; draftKey = key; }
    const locked = !!saved && FD.isLocked(s, key);
    const kl = [...new Set(s.loting.peserta.map(p => p.kelas))];
    UI.setHTML($('dl-kelas'), kl.map(k => `<option value="${esc(k)}">`).join(''));
    document.querySelectorAll('#katBtns [data-k]').forEach(b => b.classList.toggle('active', b.dataset.k === kat));

    UI.setHTML($('lotBoxes'), FD.KATS.map(k => { const g = group(s, k);
      return `<div class="lot-box${k === kat ? ' on' : ''}"><h3>${k.toUpperCase()} <small>${g.length} peserta</small></h3>${g.length ? `<ol>${g.map(p =>
        `<li><span><b>${esc(p.nama)}</b><small>${esc(p.kontingen)}</small></span><button class="btn btn-ghost" data-del="${esc(p.id)}" aria-label="Hapus ${esc(p.nama)}">✕</button></li>`).join('')}</ol>` : `<p class="muted">${kelas() ? 'Belum ada peserta.' : 'Pilih kelas dahulu.'}</p>`}</div>`; }).join(''));

    const note = $('lotNote');
    const msg = !kelas() ? 'Pilih atau ketik kelas terlebih dahulu.' : cur.length < 2 ? `Minimal 2 peserta pada ${kat} · ${kelas()} (sekarang ${cur.length}).`
      : locked ? 'Bagan sudah dipakai (ada partai yang ditampilkan/selesai) — tidak dapat diacak ulang.' : '';
    note.hidden = !msg; note.textContent = msg;
    const can = kelas() && cur.length >= 2 && !locked;
    $('mulaiBtn').disabled = !(can && !draft && !saved); $('acakBtn').disabled = !(can && (draft || saved)); $('simpanBtn').disabled = !(draft && can);

    const shown = draft || saved, pm = FD.pmap(s);
    UI.setText($('bagTitle'), shown ? `${shown.kategori} — ${shown.kelas}${draft ? ' · BELUM DISIMPAN' : ' · tersimpan'}` : '');
    UI.setHTML($('bagan'), shown ? BAGAN.render(shown, pm, s.fightList) : '<p class="muted">Klik MULAI LOOTING untuk membuat bagan.</p>');
  }
  const cfg = () => ({ babak: +$('lotBabak').value, durasiMenit: parseFloat($('lotDur').value), durasiTambahanMenit: parseFloat($('lotTam').value) || 0 });
  function draw() {
    if (!guard()) return;
    const s = ATSC.load(), cur = group(s, kat);
    draft = BAGAN.makeDraw(cur, kat, kelas()); draftKey = curKey(); render();
  }
  $('mulaiBtn').onclick = draw;
  $('acakBtn').onclick = draw;
  $('simpanBtn').onclick = async () => {
    if (!guard() || !draft) return;
    const c = cfg(); if (!(c.durasiMenit > 0)) { UI.toast('Timer per babak harus lebih dari 0.', 'err'); return; }
    const had = !!ATSC.load().loting.draws[draft.key];
    if (had) { const r = await UI.confirmDialog({ title: 'Ganti bagan tersimpan?', okText: 'Ganti', html: '<p>Bagan lama dan partai "Akan bertanding"-nya diganti hasil loting baru.</p>' }); if (!r.ok) return; }
    const r = FD.saveDraw(draft, c, S.name);
    UI.toast(r.msg, r.ok ? 'ok' : 'err'); if (r.ok) draft = null; render();
  };
  document.querySelectorAll('#katBtns [data-k]').forEach(b => b.onclick = () => { kat = b.dataset.k; render(); });
  $('lotKelas').addEventListener('input', render);
  $('lotBoxes').addEventListener('click', e => {
    const b = e.target.closest('[data-del]'); if (!b || !guard()) return;
    const r = FD.removePeserta(b.dataset.del); UI.toast(r.msg, r.ok ? 'ok' : 'err'); draft = null; render();
  });
  $('pForm').addEventListener('submit', e => {
    e.preventDefault(); if (!guard()) return;
    const r = FD.addPeserta({ nama: $('p-nama').value.trim(), kontingen: $('p-kont').value.trim(), kategori: $('p-kat').value, kelas: $('p-kelas').value.trim() });
    showErr('pErr', r.ok ? [] : r.errors); if (r.ok) { $('p-nama').value = ''; $('p-kont').value = ''; UI.toast(r.msg, 'ok'); draft = null; render(); }
  });
  $('b-go').onclick = () => {
    if (!guard()) return;
    const r = FD.importPeserta($('b-text').value); showErr('bErr', r.errors); UI.toast(r.msg, r.ok ? 'ok' : 'err');
    if (r.ok && !r.errors.length) $('b-text').value = ''; draft = null; render();
  };
  $('lotKelas').value = (ATSC.load().loting.peserta.find(p => p.kategori === 'Putra') || {}).kelas || '';
  UI.every(render, 1000);
})();
