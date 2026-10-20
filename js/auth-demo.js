/* =====================================================================
   auth-demo.js — LOGIN DEMO (HANYA PROTOTYPE FRONTEND, TIDAK AMAN)
   Sandi tertulis di file ini sehingga siapa pun yang membuka file bisa
   membacanya. Login & hak akses yang aman harus dibuat di backend PHP.

   ╔══════════════════════════════════════════════════════════════════╗
   ║  CARA MENGGANTI SANDI: ubah teks di dalam tanda kutip pada blok  ║
   ║  SANDI di bawah ini, simpan file, lalu refresh (F5) browser.     ║
   ╚══════════════════════════════════════════════════════════════════╝
   Username (tetap, berdasarkan arena):
     Dewan Fight : a1dewan, a2dewan        Dewan Seni : a1senidewan, a2senidewan
     Juri Fight  : a1juri1 … a1juri4, a2juri1 … a2juri4
     Juri Seni   : a1senijuri1 … a1senijuri4, a2senijuri1 … a2senijuri4
     Loting      : loting
   ===================================================================== */
const SANDI = {
  dewanFight: 'dewan123',    // sandi Dewan Fight (Arena 1 & 2)
  dewanSeni:  'dewan123',    // sandi Dewan Seni  (Arena 1 & 2)
  juriFight:  'juri123',     // sandi semua Juri Fight
  juriSeni:   'juri123',     // sandi semua Juri Seni
  loting:     'loting123'    // sandi panitia Loting
};

const ATSC_AUTH = (() => {
  'use strict';
  const SKEY = 'atsc4.session';
  const USERS = [];
  [1, 2].forEach(ar => {
    USERS.push({ u: `a${ar}dewan`, p: SANDI.dewanFight, role: 'dewan', mode: 'fight', arena: ar, name: `Dewan Fight — Arena ${ar}` });
    USERS.push({ u: `a${ar}senidewan`, p: SANDI.dewanSeni, role: 'dewan', mode: 'seni', arena: ar, name: `Dewan Seni — Arena ${ar}` });
    for (let j = 1; j <= 4; j++) {
      USERS.push({ u: `a${ar}juri${j}`, p: SANDI.juriFight, role: 'juri', mode: 'fight', arena: ar, no: j, name: `Juri ${j} — Fight Arena ${ar}` });
      USERS.push({ u: `a${ar}senijuri${j}`, p: SANDI.juriSeni, role: 'juri', mode: 'seni', arena: ar, no: j, name: `Juri ${j} — Seni Arena ${ar}` });
    }
  });
  USERS.push({ u: 'loting', p: SANDI.loting, role: 'loting', mode: 'fight', arena: 0, name: 'Panitia Loting' });
  const current = () => { try { return JSON.parse(sessionStorage.getItem(SKEY)); } catch (e) { return null; } };
  function login(u, p, role, arena, mode = 'fight') {
    const user = USERS.find(x => x.u === u.trim().toLowerCase() && x.p === p);
    if (!user) return { ok: false, msg: 'Username atau password salah.' };
    if (user.role !== role) return { ok: false, msg: 'Akun ini bukan akun ' + (role === 'dewan' ? 'Dewan' : role === 'loting' ? 'Panitia Loting' : 'Juri') + '.' };
    if (user.mode !== mode) return { ok: false, msg: `Akun ini untuk ${user.mode === 'seni' ? 'Seni' : 'Fight'}, bukan ${mode === 'seni' ? 'Seni' : 'Fight'}.` };
    if (user.arena !== arena) return { ok: false, msg: `Akun ini hanya untuk Arena ${user.arena}, bukan Arena ${arena}.` };
    const s = { u: user.u, role: user.role, mode: user.mode, arena: user.arena, no: user.no || null, name: user.name };
    sessionStorage.setItem(SKEY, JSON.stringify(s));
    return { ok: true, session: s };
  }
  const logout = () => sessionStorage.removeItem(SKEY);
  function require(role, mode = 'fight') {
    const s = current();
    const want = parseInt(new URLSearchParams(location.search).get('arena'), 10);
    if (!s || s.role !== role || (s.mode || 'fight') !== mode || (role !== 'loting' && want && want !== s.arena)) {
      location.replace(`login.html?role=${role}&arena=${role === 'loting' ? 0 : want || (s ? s.arena : 1)}&mode=${mode}`);
      return null;
    }
    return s;
  }
  const can = (role, arena, mode = 'fight') => { const s = current(); return !!s && s.role === role && s.arena === arena && (s.mode || 'fight') === mode; };
  return { USERS, current, login, logout, require, can };
})();
