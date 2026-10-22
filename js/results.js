/* =====================================================================
   results.js — hitung skor resmi sementara & penetapan hasil oleh Dewan.
   Hanya Dewan yang dapat menetapkan pemenang. Skor tertinggi HANYA
   informasi; pemenang tidak ditentukan otomatis.
   ===================================================================== */
const ATSC_RESULTS = (() => {
    'use strict';
    const R = () => ATSC.RULES;
    const r1 = x => Math.round(x * 10) / 10;
    const fmtScore = x => (Number.isInteger(x) ? String(x) : x.toFixed(1));
    /* nilai ke-q terbesar: sebuah nilai "diakui" bila >= q juri mencapainya */
    const lvl = (vals, q) => { const s = vals.slice().sort((x, y) => y - x); return s.length >= q ? s[q - 1] : 0; };
    const techOf = side => side.tech.reduce((t, c, i) => t + c * R().techButtons[i].pts, 0);

    const penOf = side => R().penaltyBtns.reduce((t, b) => t + (side[b.key][b.idx] ? b.pts : 0), 0);
    /* Nilai milik satu juri sendiri (belum tentu sah) */
    const ownOf = side => techOf(side) + penOf(side);

    /* Poin teknik SAH: untuk tiap tombol nilai, hitung jumlah tekan yang dicapai oleh
       minimal `quorum` juri (default 2). Teguran/peringatan menyala bila >= quorum juri menekannya. */
    function computeSide(a, key) {
        // Pelindung: Mengabaikan data juri yang kosong (null/undefined) agar tidak crash
        const js = Object.values(a.scores || {}).filter(j => j !== null && j !== undefined);
        const q = R().quorum;

        const tech = R().techButtons.reduce((t, b, i) => {
            // Pastikan j[key] dan j[key].tech ada sebelum dibaca
            return t + lvl(js.map(j => (j && j[key] && j[key].tech) ? j[key].tech[i] : 0), q) * b.pts;
        }, 0);

        const flag = f => [0, 1].map(k => {
            // Pastikan j[key][f] ada sebelum dibaca
            return lvl(js.map(j => (j && j[key] && j[key][f] && j[key][f][k]) ? 1 : 0), q) === 1;
        });

        const t = flag('t'),
            p = flag('p');
        const penTotal = R().penaltyBtns.reduce((x, b) => x + ((b.key === 't' ? t : p)[b.idx] ? b.pts : 0), 0);
        return { tech, t, p, penTotal, score: r1(tech + penTotal), judges: js.filter(j => j && j.submittedAt).length };
    }
    const compute = a => ({
        red: computeSide(a, 'red'),
        blue: computeSide(a, 'blue'),
        submitted: Object.values(a.scores || {}).filter(j => j && j.submittedAt).length
    });

    /* Dewan menetapkan / mengoreksi hasil resmi. data: {winnerSide:'red'|'blue'|null, basis, notes, reason} */
    function confirm(n, data, by) {
        return ATSC.update(n, (a, s) => {
            const m = a.match;
            if (!m) return { ok: false, msg: 'Belum ada partai.' };
            const correcting = m.status === 'final';
            if (!correcting && m.status !== 'selesai') return { ok: false, msg: 'Akhiri pertandingan terlebih dahulu.' };
            if (!data.basis) return { ok: false, msg: 'Dasar keputusan wajib dipilih.' };
            if (data.basis === 'Diskualifikasi lawan' && !data.winnerSide) return { ok: false, msg: 'Diskualifikasi memerlukan pemenang (merah atau biru).' };
            if (!data.winnerSide && !data.notes) return { ok: false, msg: 'Untuk hasil seri / belum ada pemenang, isi catatan.' };
            if (correcting && !data.reason) return { ok: false, msg: 'Alasan koreksi wajib diisi.' };
            const ent = typeof FD !== 'undefined' ? FD.entryOf(s, a) : null;
            if (ent) { const wid = data.winnerSide ? ent[data.winnerSide].id || null : null; const err = FD.canSetWinner(s, ent, wid); if (err) return { ok: false, msg: err }; }
            const sc = compute(a),
                prev = a.result;
            a.result = {
                type: data.winnerSide ? 'menang-' + data.winnerSide : 'seri',
                winnerSide: data.winnerSide || null,
                basis: data.basis,
                notes: data.notes || '',
                scores: { red: sc.red.score, blue: sc.blue.score },
                by,
                at: Date.now(),
                correctionReason: correcting ? data.reason : ''
            };
            m.status = 'final';
            if (ent) FD.applyResult(s, a);
            if (correcting) ATSC.audit(a, by, 'Koreksi hasil', `Alasan: ${data.reason}. Sebelumnya: ${describe(a, prev)}`);
            else ATSC.audit(a, by, 'Hasil resmi', describe(a, a.result));
            return { ok: true, msg: correcting ? 'Koreksi hasil disimpan.' : 'Hasil resmi ditetapkan.' };
        });
    }

    function describe(a, r) {
        if (!r) return '-';
        return r.winnerSide ? `${a.match[r.winnerSide].nama} (Sudut ${r.winnerSide === 'red' ? 'Merah' : 'Biru'}), dasar: ${r.basis}` : `Seri/belum ada pemenang, dasar: ${r.basis}`;
    }
    return { compute, fmtScore, confirm, describe, techOf, ownOf };
})();