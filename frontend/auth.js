const $ = s => document.querySelector(s);
let mode = 'masuk';

function setMode(m) {
  mode = m;
  $('#tMasuk').classList.toggle('on', m === 'masuk');
  $('#tDaftar').classList.toggle('on', m === 'daftar');
  $('#lNama').hidden = m === 'masuk';
  $('#judul').textContent = m === 'masuk' ? 'Masuk ke OrgaTrack' : 'Buat akun baru';
  $('#kirim').textContent = m === 'masuk' ? 'Masuk' : 'Daftar';
  $('#form').password.autocomplete = m === 'masuk' ? 'current-password' : 'new-password';
  $('#err').textContent = '';
}
$('#tMasuk').onclick = () => setMode('masuk');
$('#tDaftar').onclick = () => setMode('daftar');

$('#form').onsubmit = async e => {
  e.preventDefault();
  const f = e.target;
  $('#err').textContent = '';
  $('#kirim').disabled = true;
  try {
    const res = await fetch(mode === 'masuk' ? '/api/login' : '/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nama: f.nama.value, email: f.email.value, password: f.password.value }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    location.href = '/';
  } catch (err) {
    $('#err').textContent = err.message;
  } finally {
    $('#kirim').disabled = false;
  }
};

// Kalau sudah login, langsung ke beranda
fetch('/api/me').then(r => { if (r.ok) location.href = '/'; });