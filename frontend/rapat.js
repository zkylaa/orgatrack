// ===== RAPAT & ABSENSI =====
let RP = null;
let RAPAT_AKTIF = null;
let AKSI_ID = null;
let TIMER_SESI = null;

const KONF = { belum: 'Belum konfirmasi', hadir: 'Akan hadir', izin: 'Izin' };
const jam = s => new Date(String(s).replace(' ', 'T')).toLocaleString('id-ID', {
  weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
});
const jamPendek = s => new Date(String(s).replace(' ', 'T')).toLocaleString('id-ID', {
  day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
});
const sudahLewat = s => new Date(String(s).replace(' ', 'T')) < new Date();
const kelolaR = () => RP.saya.peran === 'ketua' || RP.saya.peran === 'sekretaris';
const mmss = d => `${String(Math.floor(d / 60)).padStart(2, '0')}:${String(d % 60).padStart(2, '0')}`;

async function muatRapat() {
  try {
    const [r, p] = await Promise.all([api(`/api/events/${EID}/rapat`), api(`/api/events/${EID}/panitia`)]);
    RP = { saya: r.saya, rapat: r.rapat, anggota: p.anggota, divisi: p.divisi, rekap: null };
    if (kelolaR()) RP.rekap = (await api(`/api/events/${EID}/rapat/rekap`)).rekap;
    gambarRapat();
  } catch (err) { gagalMuat(err); }
}

function kartuRapat(r) {
  const lewat = sudahLewat(r.waktu_mulai);
  return `<button type="button" class="rp" data-rid="${r.id}">
    <b>${esc(r.judul)}</b>
    <span class="mt">${jam(r.waktu_mulai)} • ${esc(r.lokasi_atau_link)}</span>
    <span class="tags">
      ${r.sisa_detik !== null ? '<span class="tag hijau">Absensi dibuka</span>' : ''}
      ${r.konfirmasi_saya === 'hadir' ? '<span class="tag">Kamu: akan hadir</span>' : ''}
      ${r.konfirmasi_saya === 'izin' ? '<span class="tag kuning">Kamu: izin</span>' : ''}
      ${r.konfirmasi_saya === 'belum' && !lewat ? '<span class="tag merah">Belum konfirmasi</span>' : ''}
      ${r.sudah_checkin ? '<span class="tag hijau">Sudah check-in</span>' : ''}
      ${r.ada_notulen ? '<span class="tag">Ada notulensi</span>' : ''}
    </span>
    <span class="mt">${r.hadir}/${r.peserta} sudah check-in${lewat ? '' : ' • akan datang'}</span>
  </button>`;
}

function gambarRapat() {
  const kel = kelolaR();
  let h = `<div class="panel besar">
    <div class="baris"><h2>Jadwal rapat</h2>${kel ? '<button class="btn" id="tambahRapat">Jadwalkan rapat</button>' : ''}</div>
    ${RP.rapat.length ? `<div class="rplist">${RP.rapat.map(kartuRapat).join('')}</div>`
      : '<p class="kosong">Belum ada rapat terjadwal.</p>'}
  </div>`;

  if (kel && RP.rekap) {
    h += `<div class="panel besar"><h2>Rekap kehadiran</h2>
      ${RP.rekap.length ? `<div class="geser"><table class="tbl"><thead><tr>
        <th>Nama</th><th>Diundang</th><th>Hadir (check-in)</th><th>Izin</th></tr></thead><tbody>
        ${RP.rekap.map(r => `<tr><td>${esc(r.nama)}</td><td>${r.diundang}</td><td>${r.hadir}</td><td>${r.izin}</td></tr>`).join('')}
      </tbody></table></div>` : '<p class="kosong">Belum ada data.</p>'}
    </div>`;
  }
  $('#vRapat').innerHTML = h;
}

$('#vRapat').addEventListener('click', e => {
  if (e.target.closest('#tambahRapat')) return bukaJadwal();
  const k = e.target.closest('.rp');
  if (k) bukaRapat(k.dataset.rid);
});

// --- Jadwalkan rapat ---
function bukaJadwal() {
  const f = $('#fRapat');
  f.reset();
  $('#eRapat').textContent = '';
  $('#pilihPeserta').innerHTML = RP.anggota.map(m =>
    `<label><input type="checkbox" name="peserta" value="${m.user_id}" checked>${esc(m.nama)}</label>`).join('');
  $('#ovRapat').classList.add('on');
  setTimeout(() => f.judul.focus(), 50);
}

$('#fRapat').onsubmit = async e => {
  e.preventDefault();
  const f = e.target;
  const peserta = [...f.querySelectorAll('input[name=peserta]:checked')].map(x => Number(x.value));
  try {
    await api(`/api/events/${EID}/rapat`, 'POST', {
      judul: f.judul.value, waktu_mulai: f.waktu.value, lokasi_atau_link: f.lokasi.value,
      agenda: f.agenda.value, peserta,
    });
    tutup();
    toast('Rapat dijadwalkan');
    muatRapat();
  } catch (err) { $('#eRapat').textContent = err.message; }
};

// --- Detail rapat ---
async function bukaRapat(rid) {
  try {
    RAPAT_AKTIF = await api(`/api/events/${EID}/rapat/${rid}`);
    gambarRapatDetail();
    $('#ovRapatDetail').classList.add('on');
  } catch (err) { toast(err.message); }
}

async function segarRapat(rid) {
  await muatRapat();
  await bukaRapat(rid);
}

function gambarRapatDetail() {
  const { rapat: r, peserta, notulen, aksi, kelola } = RAPAT_AKTIF;
  const peserta_saya = r.konfirmasi_saya !== null;
  const lewat = sudahLewat(r.waktu_mulai);
  const lokasi = /^https?:\/\//i.test(r.lokasi_atau_link)
    ? `<a href="${esc(r.lokasi_atau_link)}" target="_blank" rel="noopener noreferrer">${esc(r.lokasi_atau_link)}</a>`
    : esc(r.lokasi_atau_link);
  const aktif = r.sisa_detik !== null;

  let h = `<h3>${esc(r.judul)}</h3>
    <p class="sub">${jam(r.waktu_mulai)} • ${lokasi}</p>
    ${r.agenda ? `<p class="desk"><b>Agenda:</b> ${esc(r.agenda)}</p>` : ''}`;

  if (peserta_saya) {
    h += `<h4>Konfirmasi kehadiran</h4>
      <div class="seg2" role="group" aria-label="Konfirmasi kehadiran">
        <button type="button" data-kf="hadir" class="${r.konfirmasi_saya === 'hadir' ? 'on' : ''}">Hadir</button>
        <button type="button" data-kf="izin" class="${r.konfirmasi_saya === 'izin' ? 'on' : ''}">Izin</button>
      </div>`;
  } else {
    h += '<p class="catatan">Kamu tidak terdaftar sebagai peserta rapat ini.</p>';
  }

  // Absensi
  h += '<div class="absen"><b>Absensi</b>';
  if (peserta_saya) {
    h += r.sudah_checkin
      ? '<span class="tag hijau">Kamu sudah check-in</span>'
      : `<div class="rpform"><input id="kodeIn" maxlength="10" placeholder="Masukkan kode absensi" aria-label="Kode absensi" autocomplete="off">
          <button type="button" class="btn" id="kirimKode">Check-in</button></div>
         <p class="err" id="eKode" role="alert"></p>`;
  }
  if (aktif) h += `<p class="catatan">Sesi absensi dibuka. Sisa waktu <b id="sisaSesi">${mmss(r.sisa_detik)}</b></p>`;
  else if (!kelola) h += '<p class="catatan">Sesi absensi sedang ditutup.</p>';
  if (kelola) {
    if (aktif) {
      h += `<div class="kodebesar">Kode check-in<b>${esc(r.kode_aktif)}</b></div>
        <div class="mrow"><button type="button" class="btn ghost" id="tutupSesi">Tutup sesi</button></div>`;
    } else {
      h += `<div class="rpform"><label class="inl">Berlaku
          <select id="menitSesi">
            <option value="5">5 menit</option><option value="10">10 menit</option>
            <option value="15" selected>15 menit</option><option value="30">30 menit</option>
            <option value="60">60 menit</option>
          </select></label>
          <button type="button" class="btn" id="bukaSesi">Buka sesi absensi</button></div>`;
    }
  }
  h += '</div>';

  if (kelola && peserta) {
    h += `<h4>Peserta (${peserta.length})</h4><div class="geser"><table class="tbl"><thead><tr>
      <th>Nama</th><th>Konfirmasi</th><th>Check-in</th></tr></thead><tbody>
      ${peserta.map(p => `<tr><td>${esc(p.nama)}</td><td>${KONF[p.konfirmasi]}</td>
        <td>${p.checkin ? jamPendek(p.checkin) : '-'}</td></tr>`).join('')}
    </tbody></table></div>`;
  }

  // Notulensi
  h += '<h4>Notulensi</h4>';
  if (kelola) {
    h += `<label>Pembahasan<textarea id="nPemb" rows="3" maxlength="5000">${esc(notulen ? notulen.pembahasan : '')}</textarea></label>
      <label>Keputusan<textarea id="nKep" rows="2" maxlength="5000">${esc(notulen ? notulen.keputusan : '')}</textarea></label>
      <p class="err" id="eNot" role="alert"></p>
      <div class="mrow"><button type="button" class="btn" id="simpanNot">Simpan notulensi</button></div>`;
  } else if (notulen) {
    h += `<p class="desk"><b>Pembahasan:</b> ${esc(notulen.pembahasan)}</p>
      ${notulen.keputusan ? `<p class="desk"><b>Keputusan:</b> ${esc(notulen.keputusan)}</p>` : ''}`;
  } else {
    h += `<p class="catatan">${lewat ? 'Notulensi belum diisi.' : 'Notulensi diisi setelah rapat.'}</p>`;
  }

  // Action item
  if (notulen || aksi.length) {
    h += `<h4>Action item</h4><ul class="cat">${aksi.length ? aksi.map(a => `<li>
        <span>${esc(a.deskripsi)}</span>
        ${a.task_id ? `<small>Sudah jadi tugas: ${esc(a.tugas || '#' + a.task_id)}</small>` : ''}
        ${kelola && !a.task_id ? `<span><button type="button" class="mini" data-aksi-tugas="${a.id}" data-teks="${esc(a.deskripsi)}">Jadikan tugas</button>
          <button type="button" class="mini hapus" data-aksi-hapus="${a.id}">Hapus</button></span>` : ''}
      </li>`).join('') : '<li class="kosongmini">Belum ada action item.</li>'}</ul>`;
  }
  if (kelola && notulen) {
    h += `<div class="catform"><input id="aksiTeksIn" maxlength="255" placeholder="Tulis action item baru" aria-label="Action item">
      <button type="button" class="btn" id="tambahAksi">Tambah</button></div>`;
  } else if (kelola && !notulen) {
    h += '<p class="catatan">Simpan notulensi dulu untuk menambah action item.</p>';
  }

  h += '<div class="mrow"><button type="button" class="btn ghost" data-tutup>Tutup</button></div>';
  $('#detailRapat').innerHTML = h;

  clearInterval(TIMER_SESI);
  if (aktif) {
    let sisa = r.sisa_detik;
    TIMER_SESI = setInterval(() => {
      const el = $('#sisaSesi');
      if (!el || !$('#ovRapatDetail').classList.contains('on')) return clearInterval(TIMER_SESI);
      sisa -= 1;
      if (sisa <= 0) { clearInterval(TIMER_SESI); segarRapat(r.id); return; }
      el.textContent = mmss(sisa);
    }, 1000);
  }
}

$('#detailRapat').addEventListener('click', async e => {
  const d = RAPAT_AKTIF;
  if (!d) return;
  const rid = d.rapat.id;
  if (e.target.closest('[data-tutup]')) return tutup();
  try {
    const kf = e.target.closest('[data-kf]');
    if (kf) {
      await api(`/api/events/${EID}/rapat/${rid}/konfirmasi`, 'POST', { konfirmasi: kf.dataset.kf });
      toast('Konfirmasi disimpan');
      return segarRapat(rid);
    }
    if (e.target.closest('#kirimKode')) {
      const kode = $('#kodeIn').value.trim();
      if (!kode) { $('#eKode').textContent = 'Masukkan kode absensi.'; return; }
      try {
        await api(`/api/events/${EID}/rapat/${rid}/checkin`, 'POST', { kode });
      } catch (err) { $('#eKode').textContent = err.message; return; }
      toast('Check-in berhasil');
      return segarRapat(rid);
    }
    if (e.target.closest('#bukaSesi')) {
      const r = await api(`/api/events/${EID}/rapat/${rid}/absensi`, 'POST', { menit: $('#menitSesi').value });
      toast(`Sesi absensi dibuka. Kode ${r.kode}`);
      return segarRapat(rid);
    }
    if (e.target.closest('#tutupSesi')) {
      await api(`/api/events/${EID}/rapat/${rid}/absensi/tutup`, 'POST', {});
      toast('Sesi absensi ditutup');
      return segarRapat(rid);
    }
    if (e.target.closest('#simpanNot')) {
      const pembahasan = $('#nPemb').value;
      if (!pembahasan.trim()) { $('#eNot').textContent = 'Pembahasan wajib diisi.'; return; }
      await api(`/api/events/${EID}/rapat/${rid}/notulen`, 'PUT', { pembahasan, keputusan: $('#nKep').value });
      toast('Notulensi disimpan');
      return segarRapat(rid);
    }
    if (e.target.closest('#tambahAksi')) {
      const deskripsi = $('#aksiTeksIn').value;
      if (!deskripsi.trim()) return toast('Isi action item tidak boleh kosong.');
      await api(`/api/events/${EID}/rapat/${rid}/action`, 'POST', { deskripsi });
      toast('Action item ditambahkan');
      return segarRapat(rid);
    }
    const hapus = e.target.closest('[data-aksi-hapus]');
    if (hapus) {
      if (!confirm('Hapus action item ini?')) return;
      await api(`/api/events/${EID}/rapat/${rid}/action/${hapus.dataset.aksiHapus}`, 'DELETE');
      toast('Action item dihapus');
      return segarRapat(rid);
    }
    const jadi = e.target.closest('[data-aksi-tugas]');
    if (jadi) return bukaAksi(jadi.dataset.aksiTugas, jadi.dataset.teks);
  } catch (err) { toast(err.message); }
});

// --- Action item menjadi tugas ---
function bukaAksi(aid, teks) {
  AKSI_ID = aid;
  const f = $('#fAksi');
  f.reset();
  $('#eAksi').textContent = '';
  $('#aksiTeks').textContent = teks;
  if (!RP.divisi.length) return toast('Buat divisi dulu di tab Panitia & Divisi.');
  f.division_id.innerHTML = RP.divisi.map(d => `<option value="${d.id}">${esc(d.nama)}</option>`).join('');
  f.pj_id.innerHTML = RP.anggota.map(m => `<option value="${m.user_id}">${esc(m.nama)}</option>`).join('');
  f.prioritas.value = 'sedang';
  $('#ovAksi').classList.add('on');
}

$('#batalAksi').onclick = () => $('#ovAksi').classList.remove('on');

$('#fAksi').onsubmit = async e => {
  e.preventDefault();
  const f = e.target;
  const rid = RAPAT_AKTIF.rapat.id;
  try {
    await api(`/api/events/${EID}/rapat/${rid}/action/${AKSI_ID}/tugas`, 'POST', {
      division_id: f.division_id.value, penanggung_jawab_id: f.pj_id.value,
      deadline: f.deadline.value, prioritas: f.prioritas.value,
    });
    $('#ovAksi').classList.remove('on');
    toast('Tugas dibuat di Task Board');
    segarRapat(rid);
  } catch (err) { $('#eAksi').textContent = err.message; }
};