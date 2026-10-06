const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g,
  c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const EID = Number(new URLSearchParams(location.search).get('id'));
if (!EID) location.href = '/';

const PERAN = {
  ketua: 'Ketua Panitia', koordinator: 'Koordinator Divisi', bendahara: 'Bendahara',
  sekretaris: 'Sekretaris', anggota: 'Anggota Panitia',
};
const PILIHAN = ['koordinator', 'bendahara', 'sekretaris', 'anggota'];
const WARNA = ['#5B4BDB', '#FF7A59', '#2FB67C', '#E5A100', '#D6409F'];
const inisial = n => n.split(' ').slice(0, 2).map(k => k[0]).join('').toUpperCase();
const tgl = iso => String(iso).slice(0, 10);
const fmt = iso => new Date(tgl(iso) + 'T00:00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
const rp = n => 'Rp' + Number(n || 0).toLocaleString('id-ID');
const fmtDT = iso => new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
const fmtWaktu = iso => new Date(iso).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
const hari = iso => {
  const h = new Date(); h.setHours(0, 0, 0, 0);
  return Math.ceil((new Date(tgl(iso) + 'T00:00:00') - h) / 86400000);
};

let tt;
function toast(t) {
  const e = $('#toast'); e.textContent = t; e.classList.add('on');
  clearTimeout(tt); tt = setTimeout(() => e.classList.remove('on'), 2600);
}

async function api(url, method = 'GET', body) {
  const r = await fetch(url, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const d = await r.json().catch(() => ({}));
  if (r.status === 401) { location.href = '/login.html'; throw new Error('Perlu login.'); }
  if (!r.ok) throw Object.assign(new Error(d.error || 'Terjadi kesalahan.'), { status: r.status });
  return d;
}

function gagalMuat(err) {
  if (err.status === 403 || err.status === 404) { location.href = '/'; return; }
  toast(err.message);
}

// ===== TAB =====
const SEKSI = ['vDash', 'vPanitia', 'vTugas', 'vAnggaran', 'vRapat'];
function tampilTab(v) {
  document.querySelectorAll('#tabs2 button[data-v]').forEach(b => b.classList.toggle('on', b.dataset.v === v));
  SEKSI.forEach(s => { $('#' + s).hidden = s !== v; });
  if (v === 'vPanitia') muatPanitia();
  else if (v === 'vTugas') muatTugas();
  else if (v === 'vAnggaran') muatAnggaran();
  else if (v === 'vRapat') muatRapat();
  else muatDash();
}
$('#tabs2').onclick = e => {
  const b = e.target.closest('button[data-v]');
  if (b) tampilTab(b.dataset.v);
};

// ===== MODAL UMUM =====
const tutup = () => document.querySelectorAll('.ov').forEach(o => o.classList.remove('on'));
document.querySelectorAll('[data-tutup]').forEach(b => b.onclick = tutup);
document.querySelectorAll('.ov').forEach(o => o.onclick = e => { if (e.target === o) tutup(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') tutup(); });

// ===== DASHBOARD =====
async function muatDash() {
  const el = $('#vDash');
  el.classList.remove('go');
  try {
    const d = await api(`/api/events/${EID}`);
    document.title = `OrgaTrack – ${d.nama}`;
    $('#eNama').textContent = d.nama;
    $('#ePeran').textContent = PERAN[d.peran];
    $('#eMeta').textContent = `${fmt(d.tanggal)} • ${d.lokasi}${d.deskripsi ? ' • ' + d.deskripsi : ''}`;

    const t = d.tugas, selesai = t.done + t.disetujui;
    const persen = t.total ? Math.round(selesai / t.total * 100) : 0;
    const h = hari(d.tanggal);
    const waktu = h > 0 ? `H-${h} hari` : h === 0 ? 'Hari ini' : 'Sudah lewat';
    const ag = d.anggaran;

    const panelAnggaran = ag
      ? `<div class="panel ${ag.terlampaui ? 'bahaya' : ''}"><h2>Anggaran</h2>
          ${ag.rencana || ag.pemasukan ? `
            <p>Pemasukan <b>${rp(ag.pemasukan)}</b></p>
            <p>Pengeluaran disetujui <b>${rp(ag.pengeluaran)}</b></p>
            <p>Sisa saldo <b>${rp(ag.saldo)}</b></p>
            ${ag.terlampaui ? `<p><span class="tag merah">${ag.terlampaui} pos melebihi rencana</span></p>` : ''}`
          : '<p>Belum ada data anggaran. Buka tab Anggaran untuk mulai.</p>'}
        </div>`
      : '<div class="panel"><h2>Anggaran</h2><p>Ringkasan keuangan hanya terlihat oleh Bendahara dan Ketua. Kamu bisa mengajukan pengeluaran lewat tab Anggaran.</p></div>';

    const kh = d.kehadiran;
    const panelHadir = kh && kh.rapat
      ? `<div class="panel"><h2>Kehadiran rapat</h2>
          <p>Rapat terjadwal <b>${kh.rapat}</b> (${kh.selesai} sudah berlangsung)</p>
          ${kh.diundang
            ? `<p>Rata-rata kehadiran <b>${Math.round(kh.hadir / kh.diundang * 100)}%</b> (${kh.hadir}/${kh.diundang} undangan)</p>`
            : '<p>Belum ada rapat yang berlangsung.</p>'}
        </div>`
      : '<div class="panel"><h2>Kehadiran rapat</h2><p>Belum ada rapat. Jadwalkan rapat di tab Rapat.</p></div>';

    el.innerHTML = `
      <div class="grid3">
        <div class="panel"><small>Menuju hari acara</small><b class="angka">${waktu}</b></div>
        <div class="panel"><small>Anggota aktif</small><b class="angka">${d.jumlah_anggota}</b></div>
        <div class="panel ${t.terlambat ? 'bahaya' : ''}"><small>Tugas terlambat</small><b class="angka">${t.terlambat}</b></div>
      </div>
      <div class="panel besar">
        <div class="baris"><h2>Progres tugas</h2><span><b>${persen}%</b> (${selesai}/${t.total} selesai)</span></div>
        <div class="bar"><i style="--w:${persen}%;--c:${persen >= 60 ? 'var(--primary)' : '#FF7A59'}"></i></div>
        <div class="status4">
          <span>To Do: ${t.todo}</span><span>In Progress: ${t.proses}</span>
          <span>Done: ${t.done}</span><span>Disetujui: ${t.disetujui}</span>
        </div>
      </div>
      <div class="panel besar">
        <h2>Progres per divisi</h2>
        ${d.divisi.length ? d.divisi.map(v => {
          const p = v.total ? Math.round(v.selesai / v.total * 100) : 0;
          return `<div class="dv">
            <div class="baris"><b>${esc(v.nama)}</b>
              <span>${v.total ? `${v.selesai}/${v.total} selesai` : 'Belum ada tugas'}</span></div>
            <div class="bar"><i style="--w:${p}%;--c:${p >= 60 ? 'var(--primary)' : '#FF7A59'}"></i></div>
          </div>`;
        }).join('') : '<p class="kosong">Belum ada divisi. Buat divisi di tab Panitia &amp; Divisi.</p>'}
      </div>
      <div class="grid2">
        ${panelAnggaran}
        ${panelHadir}
      </div>`;
    setTimeout(() => el.classList.add('go'), 60);
  } catch (err) { gagalMuat(err); }
}

// ===== PANITIA & DIVISI =====
let EDIT_DIV = null;

async function muatPanitia() {
  const el = $('#vPanitia');
  try {
    const p = await api(`/api/events/${EID}/panitia`);
    const ketua = p.saya.peran === 'ketua';
    const nmDiv = Object.fromEntries(p.divisi.map(d => [d.id, d.nama]));

    const baris = p.anggota.map((m, k) => {
      const bisa = ketua && m.peran !== 'ketua';
      const sPeran = bisa
        ? `<select data-f="peran" aria-label="Peran ${esc(m.nama)}">${PILIHAN.map(r =>
            `<option value="${r}" ${r === m.peran ? 'selected' : ''}>${PERAN[r]}</option>`).join('')}</select>`
        : PERAN[m.peran];
      const sDiv = bisa
        ? `<select data-f="div" aria-label="Divisi ${esc(m.nama)}"><option value="">Belum ada divisi</option>${p.divisi.map(d =>
            `<option value="${d.id}" ${d.id === m.division_id ? 'selected' : ''}>${esc(d.nama)}</option>`).join('')}</select>`
        : esc(nmDiv[m.division_id] || '-');
      return `<tr data-uid="${m.user_id}">
        <td><div class="nm"><span class="av" style="background:${WARNA[k % 5]}">${esc(inisial(m.nama))}</span>${esc(m.nama)}${m.user_id === p.saya.id ? ' (kamu)' : ''}</div></td>
        <td>${sPeran}</td><td>${sDiv}</td></tr>`;
    }).join('');

    el.innerHTML = `
      ${p.kode ? `<div class="kode lebar"><span>Kode undangan <b>${esc(p.kode)}</b></span>
        <button type="button" class="salin" data-kode="${esc(p.kode)}">Salin</button></div>` : ''}
      <div class="panel besar">
        <div class="baris"><h2>Divisi</h2>${ketua ? '<button class="btn" id="tambahDiv">Tambah divisi</button>' : ''}</div>
        ${p.divisi.length ? `<ul class="daftar">${p.divisi.map(d => `
          <li><b>${esc(d.nama)}</b><span>${d.anggota} anggota • ${d.tugas} tugas</span>
            ${ketua ? `<button class="mini" data-act="ubah" data-did="${d.id}" data-nama="${esc(d.nama)}">Ubah</button>
              <button class="mini hapus" data-act="hapus" data-did="${d.id}" data-nama="${esc(d.nama)}">Hapus</button>` : ''}
          </li>`).join('')}</ul>` : '<p class="kosong">Belum ada divisi.</p>'}
      </div>
      <div class="panel besar">
        <h2>Anggota panitia</h2>
        <div class="geser"><table class="tbl">
          <thead><tr><th>Nama</th><th>Peran</th><th>Divisi</th></tr></thead><tbody>${baris}</tbody>
        </table></div>
        ${ketua ? '<p class="catatan">Ubah peran atau divisi lewat pilihan di tabel. Perubahan langsung tersimpan. Peran Ketua tidak bisa diubah.</p>' : ''}
      </div>`;
  } catch (err) { gagalMuat(err); }
}

$('#vPanitia').addEventListener('click', async e => {
  if (e.target.closest('#tambahDiv')) return bukaDiv(null, '');
  const s = e.target.closest('.salin');
  if (s) return navigator.clipboard.writeText(s.dataset.kode).then(() => toast('Kode disalin'));
  const b = e.target.closest('[data-act]');
  if (!b) return;
  if (b.dataset.act === 'ubah') return bukaDiv(b.dataset.did, b.dataset.nama);
  if (!confirm(`Hapus divisi "${b.dataset.nama}"?`)) return;
  try {
    await api(`/api/events/${EID}/divisi/${b.dataset.did}`, 'DELETE');
    toast('Divisi dihapus');
    muatPanitia();
  } catch (err) { toast(err.message); }
});

$('#vPanitia').addEventListener('change', async e => {
  const tr = e.target.closest('tr[data-uid]');
  if (!tr || !e.target.dataset.f) return;
  try {
    await api(`/api/events/${EID}/anggota/${tr.dataset.uid}`, 'PUT', {
      peran: tr.querySelector('[data-f=peran]').value,
      division_id: tr.querySelector('[data-f=div]').value || null,
    });
    toast('Perubahan disimpan');
    muatPanitia();
  } catch (err) { toast(err.message); muatPanitia(); }
});

function bukaDiv(did, nama) {
  EDIT_DIV = did;
  $('#tDiv').textContent = did ? 'Ubah nama divisi' : 'Tambah divisi';
  $('#fDiv').nama.value = nama;
  $('#eDiv').textContent = '';
  $('#ovDiv').classList.add('on');
  setTimeout(() => $('#fDiv').nama.focus(), 50);
}

$('#fDiv').onsubmit = async e => {
  e.preventDefault();
  const nama = e.target.nama.value;
  try {
    if (EDIT_DIV) await api(`/api/events/${EID}/divisi/${EDIT_DIV}`, 'PUT', { nama });
    else await api(`/api/events/${EID}/divisi`, 'POST', { nama });
    tutup();
    toast(EDIT_DIV ? 'Divisi diperbarui' : 'Divisi ditambahkan');
    muatPanitia();
  } catch (err) { $('#eDiv').textContent = err.message; }
};

// ===== TASK BOARD =====
const KOLOM = [['todo', 'To Do'], ['in_progress', 'In Progress'], ['done', 'Done']];
const PRIO = { rendah: 'Rendah', sedang: 'Sedang', tinggi: 'Tinggi' };
let TG = null;
let FILTER_DIV = '';
let TUGAS_AKTIF = null;

const kelola = (saya, divId) =>
  saya.peran === 'ketua' || (saya.peran === 'koordinator' && saya.division_id === divId);
const bolehBuat = () => TG.saya.peran === 'ketua' || (TG.saya.peran === 'koordinator' && TG.saya.division_id);

async function muatTugas() {
  try {
    const [t, p] = await Promise.all([api(`/api/events/${EID}/tugas`), api(`/api/events/${EID}/panitia`)]);
    TG = { saya: t.saya, tugas: t.tugas, divisi: p.divisi, anggota: p.anggota };
    gambarTugas();
  } catch (err) { gagalMuat(err); }
}

function kartuTugas(t) {
  return `<button type="button" class="tg" data-tid="${t.id}">
    <b>${esc(t.judul)}</b>
    <span class="mt">${esc(t.divisi)} • ${fmtDT(t.deadline)}</span>
    <span class="tags">
      <span class="tag p-${t.prioritas}">${PRIO[t.prioritas]}</span>
      ${t.terlambat ? '<span class="tag merah">Terlambat</span>' : ''}
      ${t.status === 'disetujui' ? '<span class="tag hijau">Disetujui</span>' : ''}
      ${t.catatan_revisi && t.status === 'in_progress' ? '<span class="tag kuning">Perlu revisi</span>' : ''}
    </span>
    <span class="pj"><span class="av" style="background:${WARNA[t.pj_id % 5]}">${esc(inisial(t.pj))}</span>${esc(t.pj)}</span>
  </button>`;
}

function gambarTugas() {
  const daftar = TG.tugas.filter(t => !FILTER_DIV || String(t.division_id) === FILTER_DIV);
  const filter = `<select id="fDivisi" aria-label="Filter divisi">
    <option value="">Semua divisi</option>
    ${TG.divisi.map(d => `<option value="${d.id}" ${String(d.id) === FILTER_DIV ? 'selected' : ''}>${esc(d.nama)}</option>`).join('')}
  </select>`;
  const kolom = KOLOM.map(([k, label]) => {
    const isi = daftar.filter(t => k === 'done' ? (t.status === 'done' || t.status === 'disetujui') : t.status === k);
    return `<div class="kol"><h3>${label} <span>${isi.length}</span></h3>
      <div class="kolisi">${isi.length ? isi.map(kartuTugas).join('') : '<p class="kosongmini">Belum ada tugas</p>'}</div></div>`;
  }).join('');
  $('#vTugas').innerHTML = `
    <div class="baris">${filter}${bolehBuat() ? '<button class="btn" id="tambahTugas">Buat tugas</button>' : ''}</div>
    <div class="papan">${kolom}</div>`;
}

$('#vTugas').addEventListener('click', e => {
  if (e.target.closest('#tambahTugas')) return bukaBuatTugas();
  const k = e.target.closest('.tg');
  if (k) bukaDetail(k.dataset.tid);
});
$('#vTugas').addEventListener('change', e => {
  if (e.target.id === 'fDivisi') { FILTER_DIV = e.target.value; gambarTugas(); }
});

// --- Buat tugas ---
function bukaBuatTugas() {
  const f = $('#fTugas');
  const divs = TG.saya.peran === 'ketua' ? TG.divisi : TG.divisi.filter(d => d.id === TG.saya.division_id);
  if (!divs.length) return toast('Buat divisi dulu di tab Panitia & Divisi.');
  f.reset();
  $('#eTugas').textContent = '';
  f.division_id.innerHTML = divs.map(d => `<option value="${d.id}">${esc(d.nama)}</option>`).join('');
  f.pj_id.innerHTML = TG.anggota.map(m => `<option value="${m.user_id}">${esc(m.nama)}</option>`).join('');
  f.prioritas.value = 'sedang';
  $('#ovTugas').classList.add('on');
  setTimeout(() => f.judul.focus(), 50);
}

$('#fTugas').onsubmit = async e => {
  e.preventDefault();
  const f = e.target;
  try {
    await api(`/api/events/${EID}/tugas`, 'POST', {
      judul: f.judul.value, deskripsi: f.deskripsi.value, division_id: f.division_id.value,
      penanggung_jawab_id: f.pj_id.value, deadline: f.deadline.value, prioritas: f.prioritas.value,
    });
    tutup();
    toast('Tugas dibuat di kolom To Do');
    muatTugas();
  } catch (err) { $('#eTugas').textContent = err.message; }
};

// --- Detail tugas ---
async function bukaDetail(tid) {
  const t = TG.tugas.find(x => x.id === Number(tid));
  if (!t) return;
  TUGAS_AKTIF = t;
  let cat = [];
  try { cat = (await api(`/api/events/${EID}/tugas/${t.id}/catatan`)).catatan; } catch (err) { toast(err.message); }
  gambarDetail(t, cat);
  $('#ovDetail').classList.add('on');
}

async function segarkan(tid) {
  await muatTugas();
  await bukaDetail(tid);
}

function gambarDetail(t, cat) {
  const kel = kelola(TG.saya, t.division_id);
  const boleh = t.pj_id === TG.saya.id || kel;
  const terkunci = t.status === 'disetujui';
  const tombolStatus = KOLOM.map(([k, l]) => {
    const aktif = t.status === k || (k === 'done' && terkunci);
    return `<button type="button" class="${aktif ? 'on' : ''}" data-st="${k}" ${!boleh || terkunci ? 'disabled' : ''}>${l}</button>`;
  }).join('');

  $('#detail').innerHTML = `
    <h3>${esc(t.judul)}</h3>
    <p class="sub">${esc(t.divisi)} • Penanggung jawab: ${esc(t.pj)} • Deadline ${fmtDT(t.deadline)}</p>
    <div class="tags">
      <span class="tag p-${t.prioritas}">${PRIO[t.prioritas]}</span>
      ${t.terlambat ? '<span class="tag merah">Terlambat</span>' : ''}
      ${terkunci ? '<span class="tag hijau">Disetujui</span>' : ''}
    </div>
    ${t.deskripsi ? `<p class="desk">${esc(t.deskripsi)}</p>` : ''}
    ${t.catatan_revisi && t.status === 'in_progress'
      ? `<div class="revisi"><b>Catatan revisi</b><span>${esc(t.catatan_revisi)}</span></div>` : ''}
    <div class="seg2" role="group" aria-label="Status tugas">${tombolStatus}</div>
    ${!boleh ? '<p class="catatan">Hanya penanggung jawab, Koordinator divisi, atau Ketua yang bisa mengubah status.</p>' : ''}
    ${terkunci ? '<p class="catatan">Tugas ini sudah disetujui dan tidak bisa diubah lagi.</p>' : ''}
    ${kel && t.status === 'done' ? `
      <div class="tinjau">
        <label>Catatan revisi (wajib jika dikembalikan)<textarea id="revTeks" rows="2" maxlength="500"></textarea></label>
        <p class="err" id="eTinjau" role="alert"></p>
        <div class="mrow"><button type="button" class="btn ghost" id="kembalikan">Kembalikan</button>
          <button type="button" class="btn" id="setuju">Setujui</button></div>
      </div>` : ''}
    <h4>Catatan progres</h4>
    <ul class="cat">${cat.length ? cat.map(c => `<li><b>${esc(c.nama)}</b><small>${fmtWaktu(c.created_at)}</small><span>${esc(c.catatan)}</span></li>`).join('')
      : '<li class="kosongmini">Belum ada catatan.</li>'}</ul>
    ${boleh ? `<div class="catform"><input id="catTeks" maxlength="500" placeholder="Tulis catatan progres" aria-label="Catatan progres">
      <button type="button" class="btn" id="kirimCat">Kirim</button></div>` : ''}
    <div class="mrow"><button type="button" class="btn ghost" data-tutup>Tutup</button></div>`;
}

$('#detail').addEventListener('click', async e => {
  const t = TUGAS_AKTIF;
  if (!t) return;
  if (e.target.closest('[data-tutup]')) return tutup();
  try {
    const st = e.target.closest('[data-st]');
    if (st) {
      if (st.dataset.st === t.status) return;
      await api(`/api/events/${EID}/tugas/${t.id}/status`, 'PATCH', { status: st.dataset.st });
      toast('Status diperbarui');
      return segarkan(t.id);
    }
    if (e.target.closest('#setuju')) {
      await api(`/api/events/${EID}/tugas/${t.id}/tinjau`, 'POST', { setuju: true });
      toast('Tugas disetujui');
      return segarkan(t.id);
    }
    if (e.target.closest('#kembalikan')) {
      const catatan = $('#revTeks').value;
      if (!catatan.trim()) { $('#eTinjau').textContent = 'Catatan revisi wajib diisi saat mengembalikan tugas.'; return; }
      await api(`/api/events/${EID}/tugas/${t.id}/tinjau`, 'POST', { setuju: false, catatan });
      toast('Tugas dikembalikan ke In Progress');
      return segarkan(t.id);
    }
    if (e.target.closest('#kirimCat')) {
      const catatan = $('#catTeks').value;
      if (!catatan.trim()) return toast('Catatan tidak boleh kosong.');
      await api(`/api/events/${EID}/tugas/${t.id}/catatan`, 'POST', { catatan });
      toast('Catatan disimpan');
      return segarkan(t.id);
    }
  } catch (err) { toast(err.message); }
});

$('#keluar').onclick = async () => {
  await fetch('/api/logout', { method: 'POST' });
  location.href = '/login.html';
};

muatDash();