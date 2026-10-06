const PERAN = {
  ketua: 'Ketua Panitia',
  koordinator: 'Koordinator Divisi',
  bendahara: 'Bendahara',
  sekretaris: 'Sekretaris',
  anggota: 'Anggota Panitia',
};

const GRADIEN = [
  'linear-gradient(135deg,#4B3BD0,#8B7DFF)',
  'linear-gradient(135deg,#E5532F,#FF9A6B)',
  'linear-gradient(135deg,#2E6BD6,#6CA8FF)',
  'linear-gradient(135deg,#1F9E7A,#5ED3A8)',
];
const WARNA_AVATAR = ['#5B4BDB', '#FF7A59', '#2FB67C', '#E5A100', '#D6409F'];

const $ = s => document.querySelector(s);

const esc = s => String(s ?? '').replace(/[&<>"']/g,
  c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const inisial = nama => nama.split(' ').slice(0, 2).map(k => k[0]).join('').toUpperCase();

function formatTanggal(iso) {
  return new Date(String(iso).slice(0, 10) + 'T00:00:00').toLocaleDateString('id-ID', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

function hitungHari(iso) {
  const hariIni = new Date();
  hariIni.setHours(0, 0, 0, 0);
  return Math.ceil((new Date(String(iso).slice(0, 10) + 'T00:00:00') - hariIni) / 86400000);
}

// ===== DAFTAR EVENT =====
async function muatEvent() {
  const grid = $('#grid');
  grid.classList.remove('go');
  try {
    const res = await fetch('/api/events');
    const events = await res.json();
    if (res.status === 401) { location.href = '/login.html'; return; }
    if (!res.ok) throw new Error(events.error);
    if (events.length === 0) {
      grid.innerHTML = '<p class="kosong">Belum ada kepanitiaan. Klik "Buat event" atau "Gabung dengan kode" di kanan atas.</p>';
      return;
    }

    grid.innerHTML = events.map((e, i) => {
      const persen = e.total_tugas ? Math.round(e.tugas_selesai / e.total_tugas * 100) : 0;
      const avatar = e.anggota.map((n, k) =>
        `<span class="av" style="background:${WARNA_AVATAR[k % 5]}">${esc(inisial(n))}</span>`).join('');
      const lebih = e.jumlah_anggota - e.anggota.length;
      return `
      <article class="card rise" data-id="${e.id}" style="--i:${i + 3}">
        <div class="cover" style="--g:${GRADIEN[i % GRADIEN.length]}">
          <div class="ct">
            <span class="badge">${PERAN[e.peran]}</span>
            <span class="badge">${e.status}</span>
          </div>
          <h3><a class="tautan" href="/event.html?id=${e.id}">${esc(e.nama)}</a></h3>
        </div>
        <div class="body">
          <div class="meta"><b>${formatTanggal(e.tanggal)}</b>
            <span class="hari">H-${hitungHari(e.tanggal)} hari</span></div>
          <div class="meta">${esc(e.lokasi)}</div>
          <div class="pr">
            <div><span>Kelengkapan tugas</span>
              <span><b>${persen}%</b> (${e.tugas_selesai}/${e.total_tugas} selesai)</span></div>
            <div class="bar"><i style="--w:${persen}%;--c:${persen >= 60 ? 'var(--primary)' : '#FF7A59'}"></i></div>
          </div>
          <div class="stack">${avatar}${lebih > 0 ? `<span class="av more">+${lebih}</span>` : ''}</div>
          ${e.kode ? `<div class="kode"><span>Kode undangan <b>${esc(e.kode)}</b></span>
            <button type="button" class="salin" data-kode="${esc(e.kode)}">Salin</button></div>` : ''}
        </div>
      </article>`;
    }).join('');

    setTimeout(() => grid.classList.add('go'), 60);
  } catch (err) {
    grid.textContent = 'Tidak bisa mengambil data: ' + err.message;
  }
}

// ===== USER & KELUAR =====
async function muatUser() {
  const r = await fetch('/api/me');
  if (!r.ok) { location.href = '/login.html'; return; }
  const u = await r.json();
  $('#nama').textContent = u.nama.split(' ')[0];
}
$('#keluar').onclick = async () => {
  await fetch('/api/logout', { method: 'POST' });
  location.href = '/login.html';
};

// ===== TOAST & MODAL =====
let tt;
function toast(t) {
  const e = $('#toast');
  e.textContent = t; e.classList.add('on');
  clearTimeout(tt); tt = setTimeout(() => e.classList.remove('on'), 2600);
}
const buka = id => { $(id).classList.add('on'); setTimeout(() => $(id).querySelector('input')?.focus(), 50); };
const tutup = () => document.querySelectorAll('.ov').forEach(o => o.classList.remove('on'));
document.querySelectorAll('[data-tutup]').forEach(b => b.onclick = tutup);
document.querySelectorAll('.ov').forEach(o => o.onclick = e => { if (e.target === o) tutup(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') tutup(); });

async function kirim(url, body) {
  const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const d = await r.json();
  if (!r.ok) throw new Error(d.error);
  return d;
}

// ===== BUAT EVENT =====
$('#btnBuat').onclick = () => { $('#eBuat').textContent = ''; $('#fBuat').reset(); buka('#ovBuat'); };
$('#fBuat').onsubmit = async e => {
  e.preventDefault();
  const f = e.target;
  try {
    const d = await kirim('/api/events', {
      nama: f.nama.value, tanggal: f.tanggal.value, lokasi: f.lokasi.value, deskripsi: f.deskripsi.value,
    });
    tutup();
    toast(`Event dibuat. Kode undangan: ${d.kode}`);
    muatEvent();
  } catch (err) { $('#eBuat').textContent = err.message; }
};

// ===== GABUNG DENGAN KODE =====
let kodeAktif = '';
$('#btnGabung').onclick = () => {
  $('#g1').hidden = false; $('#g2').hidden = true;
  $('#kode').value = ''; $('#eKode').textContent = '';
  buka('#ovGabung');
};
$('#cek').onclick = async () => {
  kodeAktif = $('#kode').value.trim().toUpperCase();
  $('#eKode').textContent = '';
  try {
    const d = await kirim('/api/join/cek', { kode: kodeAktif });
    $('#gNama').textContent = d.nama;
    $('#gMeta').textContent = `${formatTanggal(d.tanggal)} • ${d.lokasi}`;
    $('#eGabung').textContent = '';
    $('#g1').hidden = true; $('#g2').hidden = false;
  } catch (err) { $('#eKode').textContent = err.message; }
};
async function jawab(terima) {
  try {
    const d = await kirim('/api/join', { kode: kodeAktif, terima });
    tutup();
    toast(terima ? `Kamu bergabung ke ${d.nama}` : 'Undangan ditolak');
    if (terima) muatEvent();
  } catch (err) { $('#eGabung').textContent = err.message; }
}
$('#terima').onclick = () => jawab(true);
$('#tolak').onclick = () => jawab(false);

// ===== SALIN KODE & BUKA EVENT =====
$('#grid').addEventListener('click', e => {
  const b = e.target.closest('.salin');
  if (b) { navigator.clipboard.writeText(b.dataset.kode).then(() => toast('Kode disalin')); return; }
  if (e.target.closest('a, button')) return;
  const kartu = e.target.closest('.card[data-id]');
  if (kartu) location.href = '/event.html?id=' + kartu.dataset.id;
});

// ===== MULAI =====
muatUser();
muatEvent();