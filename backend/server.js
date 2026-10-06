require('dotenv').config();
const express = require('express');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const db = require('./db');

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, '../frontend')));

const COOKIE = 'orgatrack_token';

function setSesi(res, id) {
  const token = jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });
  res.cookie(COOKIE, token, { httpOnly: true, sameSite: 'lax', maxAge: 7 * 864e5 });
}

async function wajibLogin(req, res, next) {
  try {
    const payload = jwt.verify(req.cookies[COOKIE] || '', process.env.JWT_SECRET);
    const [rows] = await db.query('SELECT id, nama, email FROM users WHERE id = ?', [payload.id]);
    if (!rows.length) throw new Error('tidak ada');
    req.user = rows[0];
    next();
  } catch {
    res.status(401).json({ error: 'Silakan login terlebih dahulu.' });
  }
}

app.post('/api/register', async (req, res) => {
  const nama = (req.body.nama || '').trim();
  const email = (req.body.email || '').trim().toLowerCase();
  const password = req.body.password || '';
  if (!nama || !email || !password)
    return res.status(400).json({ error: 'Nama, email, dan kata sandi wajib diisi.' });
  if (!/^\S+@\S+\.\S+$/.test(email))
    return res.status(400).json({ error: 'Format email tidak valid.' });
  if (password.length < 8)
    return res.status(400).json({ error: 'Kata sandi minimal 8 karakter.' });
  try {
    const [ada] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
    if (ada.length) return res.status(409).json({ error: 'Email sudah terdaftar. Silakan masuk.' });
    const hash = await bcrypt.hash(password, 10);
    const [r] = await db.query(
      'INSERT INTO users (nama, email, password, created_at) VALUES (?, ?, ?, NOW())',
      [nama, email, hash]
    );
    setSesi(res, r.insertId);
    res.status(201).json({ id: r.insertId, nama, email });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Gagal membuat akun.' });
  }
});

app.post('/api/login', async (req, res) => {
  const email = (req.body.email || '').trim().toLowerCase();
  const password = req.body.password || '';
  try {
    const [rows] = await db.query('SELECT id, nama, email, password FROM users WHERE email = ?', [email]);
    const ok = rows.length > 0 && (await bcrypt.compare(password, rows[0].password).catch(() => false));
    if (!ok) return res.status(401).json({ error: 'Email atau kata sandi salah.' });
    setSesi(res, rows[0].id);
    res.json({ id: rows[0].id, nama: rows[0].nama, email: rows[0].email });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Gagal login.' });
  }
});

app.post('/api/logout', (req, res) => {
  res.clearCookie(COOKIE);
  res.json({ ok: true });
});

app.get('/api/me', wajibLogin, (req, res) => res.json(req.user));

app.get('/api/events', wajibLogin, async (req, res) => {
  try {
    const [events] = await db.query(
      `SELECT e.id, e.nama, e.tanggal, e.lokasi, em.peran,
              COALESCE(t.total, 0)   AS total_tugas,
              COALESCE(t.selesai, 0) AS tugas_selesai
       FROM events e
       JOIN event_members em ON em.event_id = e.id
       LEFT JOIN (
         SELECT event_id, COUNT(*) AS total,
                SUM(status IN ('done','disetujui')) AS selesai
         FROM tasks GROUP BY event_id
       ) t ON t.event_id = e.id
       WHERE em.user_id = ? AND em.status = 'aktif'
       ORDER BY e.tanggal`,
      [req.user.id]
    );

    const ids = events.map(e => e.id);
    const anggota = {};
    if (ids.length) {
      const [rows] = await db.query(
        `SELECT em.event_id, u.nama
         FROM event_members em JOIN users u ON u.id = em.user_id
         WHERE em.status = 'aktif' AND em.event_id IN (?)
         ORDER BY em.id`,
        [ids]
      );
      rows.forEach(r => (anggota[r.event_id] ||= []).push(r.nama));
    }

    res.json(events.map(e => {
      const total = Number(e.total_tugas), selesai = Number(e.tugas_selesai);
      const daftar = anggota[e.id] || [];
      return {
        id: e.id, nama: e.nama, tanggal: e.tanggal, lokasi: e.lokasi, peran: e.peran,
           kode: e.peran === 'ketua' ? e.kode : null,
        total_tugas: total,
        tugas_selesai: selesai,
        status: total && selesai / total >= 0.2 ? 'Aktif' : 'Perencanaan',
        jumlah_anggota: daftar.length,
        anggota: daftar.slice(0, 5),
      };
    }));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Gagal mengambil data event' });
  }
});
// ===== BUAT EVENT =====
const HURUF = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // tanpa O, I, 0, 1 agar tidak membingungkan
function buatKode() {
  const { randomInt } = require('crypto');
  return Array.from({ length: 6 }, () => HURUF[randomInt(HURUF.length)]).join('');
}

app.post('/api/events', wajibLogin, async (req, res) => {
  const nama = (req.body.nama || '').trim();
  const tanggal = req.body.tanggal || '';
  const lokasi = (req.body.lokasi || '').trim();
  const deskripsi = (req.body.deskripsi || '').trim();
  if (!nama || !tanggal || !lokasi)
    return res.status(400).json({ error: 'Nama, tanggal, dan lokasi wajib diisi.' });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(tanggal))
    return res.status(400).json({ error: 'Format tanggal tidak valid.' });
  try {
    const [e] = await db.query(
      'INSERT INTO events (nama, tanggal, lokasi, deskripsi, dibuat_oleh, created_at) VALUES (?, ?, ?, ?, ?, NOW())',
      [nama, tanggal, lokasi, deskripsi, req.user.id]
    );
    await db.query(
      "INSERT INTO event_members (event_id, user_id, division_id, peran, status, joined_at) VALUES (?, ?, NULL, 'ketua', 'aktif', NOW())",
      [e.insertId, req.user.id]
    );
    await db.query('INSERT INTO divisions (event_id, nama) VALUES ?',
      [['Acara', 'Humas', 'Dokumentasi', 'Perlengkapan'].map(n => [e.insertId, n])]);

    let kode;
    for (let k = 0; k < 5; k++) {
      kode = buatKode();
      try {
        await db.query('INSERT INTO invitations (event_id, kode, dibuat_oleh) VALUES (?, ?, ?)',
          [e.insertId, kode, req.user.id]);
        break;
      } catch (err) { if (err.code !== 'ER_DUP_ENTRY') throw err; }
    }
    res.status(201).json({ id: e.insertId, nama, kode });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Gagal membuat event.' });
  }
});

// ===== GABUNG DENGAN KODE =====
async function cariUndangan(kode) {
  const [r] = await db.query(
    `SELECT i.event_id, e.nama, e.tanggal, e.lokasi, i.kedaluwarsa_pada
     FROM invitations i JOIN events e ON e.id = i.event_id WHERE i.kode = ?`,
    [String(kode || '').trim().toUpperCase()]
  );
  return r[0];
}

// Langkah 1: cek kode, tampilkan event-nya
app.post('/api/join/cek', wajibLogin, async (req, res) => {
  try {
    const u = await cariUndangan(req.body.kode);
    if (!u) return res.status(404).json({ error: 'Kode tidak ditemukan. Minta kode baru ke Ketua Panitia.' });
    if (u.kedaluwarsa_pada && new Date(u.kedaluwarsa_pada) < new Date())
      return res.status(410).json({ error: 'Kode sudah kedaluwarsa. Minta kode baru ke Ketua Panitia.' });
    const [m] = await db.query(
      "SELECT status FROM event_members WHERE event_id = ? AND user_id = ?", [u.event_id, req.user.id]);
    if (m[0] && m[0].status === 'aktif')
      return res.status(409).json({ error: 'Kamu sudah menjadi anggota event ini.' });
    res.json({ nama: u.nama, tanggal: u.tanggal, lokasi: u.lokasi });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Gagal memeriksa kode.' });
  }
});

// Langkah 2: terima atau tolak undangan
app.post('/api/join', wajibLogin, async (req, res) => {
  try {
    const u = await cariUndangan(req.body.kode);
    if (!u) return res.status(404).json({ error: 'Kode tidak ditemukan.' });
    if (u.kedaluwarsa_pada && new Date(u.kedaluwarsa_pada) < new Date())
      return res.status(410).json({ error: 'Kode sudah kedaluwarsa.' });
    const status = req.body.terima ? 'aktif' : 'ditolak';
    const [m] = await db.query(
      'SELECT id, status FROM event_members WHERE event_id = ? AND user_id = ?', [u.event_id, req.user.id]);
    if (m[0] && m[0].status === 'aktif')
      return res.status(409).json({ error: 'Kamu sudah menjadi anggota event ini.' });
    if (m[0]) {
      await db.query('UPDATE event_members SET status = ?, joined_at = ? WHERE id = ?',
        [status, status === 'aktif' ? new Date() : null, m[0].id]);
    } else {
      await db.query(
        "INSERT INTO event_members (event_id, user_id, division_id, peran, status, joined_at) VALUES (?, ?, NULL, 'anggota', ?, ?)",
        [u.event_id, req.user.id, status, status === 'aktif' ? new Date() : null]);
    }
    res.json({ ok: true, nama: u.nama, diterima: status === 'aktif' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Gagal memproses undangan.' });
  }
});
// ===== AKSES EVENT =====
const aman = (pesan, fn) => async (req, res) => {
  try { await fn(req, res); }
  catch (err) { console.error(err); res.status(500).json({ error: pesan }); }
};

// Hanya anggota aktif event yang boleh lewat
async function anggotaEvent(req, res, next) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: 'ID event tidak valid.' });
  try {
    const [r] = await db.query(
      "SELECT peran, division_id FROM event_members WHERE event_id = ? AND user_id = ? AND status = 'aktif'",
      [id, req.user.id]);
    if (!r.length) return res.status(403).json({ error: 'Kamu bukan anggota event ini.' });
    req.eventId = id; req.member = r[0];
    next();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Gagal memeriksa akses.' });
  }
}
function hanyaKetua(req, res, next) {
  if (req.member.peran !== 'ketua')
    return res.status(403).json({ error: 'Hanya Ketua Panitia yang boleh melakukan ini.' });
  next();
}

// ===== DASHBOARD EVENT (FR-07) =====
app.get('/api/events/:id', wajibLogin, anggotaEvent, aman('Gagal memuat dashboard.', async (req, res) => {
  const [[ev]] = await db.query('SELECT id, nama, tanggal, lokasi, deskripsi FROM events WHERE id = ?', [req.eventId]);
  if (!ev) return res.status(404).json({ error: 'Event tidak ditemukan.' });

  const [[t]] = await db.query(
    `SELECT COUNT(*) AS total,
            COALESCE(SUM(status = 'todo'), 0) AS todo,
            COALESCE(SUM(status = 'in_progress'), 0) AS proses,
            COALESCE(SUM(status = 'done'), 0) AS done,
            COALESCE(SUM(status = 'disetujui'), 0) AS disetujui,
            COALESCE(SUM(deadline < NOW() AND status NOT IN ('done','disetujui')), 0) AS terlambat
     FROM tasks WHERE event_id = ?`, [req.eventId]);

  const [divisi] = await db.query(
    `SELECT d.id, d.nama, COUNT(t.id) AS total,
            COALESCE(SUM(t.status IN ('done','disetujui')), 0) AS selesai
     FROM divisions d LEFT JOIN tasks t ON t.division_id = d.id
     WHERE d.event_id = ? GROUP BY d.id, d.nama ORDER BY d.id`, [req.eventId]);

  const [[m]] = await db.query(
    "SELECT COUNT(*) AS n FROM event_members WHERE event_id = ? AND status = 'aktif'", [req.eventId]);

  res.json({
        ...ev, peran: req.member.peran, jumlah_anggota: Number(m.n), anggaran: await ringkasanAnggaran(req.eventId),
    tugas: Object.fromEntries(Object.entries(t).map(([k, v]) => [k, Number(v)])),
    divisi: divisi.map(d => ({ id: d.id, nama: d.nama, total: Number(d.total), selesai: Number(d.selesai) })),
  });
}));

// ===== PANITIA & DIVISI =====
app.get('/api/events/:id/panitia', wajibLogin, anggotaEvent, aman('Gagal memuat panitia.', async (req, res) => {
  const [divisi] = await db.query(
    `SELECT d.id, d.nama,
       (SELECT COUNT(*) FROM event_members m WHERE m.division_id = d.id AND m.status = 'aktif') AS anggota,
       (SELECT COUNT(*) FROM tasks t WHERE t.division_id = d.id) AS tugas
     FROM divisions d WHERE d.event_id = ? ORDER BY d.id`, [req.eventId]);
  const [anggota] = await db.query(
    `SELECT m.user_id, u.nama, m.peran, m.division_id
     FROM event_members m JOIN users u ON u.id = m.user_id
     WHERE m.event_id = ? AND m.status = 'aktif'
     ORDER BY FIELD(m.peran,'ketua','koordinator','bendahara','sekretaris','anggota'), u.nama`, [req.eventId]);
  let kode = null;
  if (req.member.peran === 'ketua') {
    const [k] = await db.query('SELECT kode FROM invitations WHERE event_id = ? ORDER BY id DESC LIMIT 1', [req.eventId]);
    kode = k[0] ? k[0].kode : null;
  }
  res.json({
    saya: { id: req.user.id, peran: req.member.peran }, kode,
    divisi: divisi.map(d => ({ ...d, anggota: Number(d.anggota), tugas: Number(d.tugas) })),
    anggota,
  });
}));

function namaDivisi(req, res) {
  const nama = (req.body.nama || '').trim();
  if (!nama) { res.status(400).json({ error: 'Nama divisi wajib diisi.' }); return null; }
  if (nama.length > 100) { res.status(400).json({ error: 'Nama divisi maksimal 100 karakter.' }); return null; }
  return nama;
}

app.post('/api/events/:id/divisi', wajibLogin, anggotaEvent, hanyaKetua, aman('Gagal menambah divisi.', async (req, res) => {
  const nama = namaDivisi(req, res); if (!nama) return;
  const [ada] = await db.query('SELECT id FROM divisions WHERE event_id = ? AND nama = ?', [req.eventId, nama]);
  if (ada.length) return res.status(409).json({ error: 'Nama divisi sudah dipakai di event ini.' });
  const [r] = await db.query('INSERT INTO divisions (event_id, nama) VALUES (?, ?)', [req.eventId, nama]);
  res.status(201).json({ id: r.insertId, nama });
}));

app.put('/api/events/:id/divisi/:did', wajibLogin, anggotaEvent, hanyaKetua, aman('Gagal mengubah divisi.', async (req, res) => {
  const nama = namaDivisi(req, res); if (!nama) return;
  const did = Number(req.params.did);
  const [ada] = await db.query('SELECT id FROM divisions WHERE event_id = ? AND nama = ? AND id <> ?', [req.eventId, nama, did]);
  if (ada.length) return res.status(409).json({ error: 'Nama divisi sudah dipakai di event ini.' });
  const [r] = await db.query('UPDATE divisions SET nama = ? WHERE id = ? AND event_id = ?', [nama, did, req.eventId]);
  if (!r.affectedRows) return res.status(404).json({ error: 'Divisi tidak ditemukan.' });
  res.json({ ok: true });
}));

app.delete('/api/events/:id/divisi/:did', wajibLogin, anggotaEvent, hanyaKetua, aman('Gagal menghapus divisi.', async (req, res) => {
  const did = Number(req.params.did);
  const [[d]] = await db.query('SELECT id FROM divisions WHERE id = ? AND event_id = ?', [did, req.eventId]);
  if (!d) return res.status(404).json({ error: 'Divisi tidak ditemukan.' });
  const [[t]] = await db.query('SELECT COUNT(*) AS n FROM tasks WHERE division_id = ?', [did]);
  if (Number(t.n) > 0)
    return res.status(409).json({ error: `Divisi masih punya ${t.n} tugas. Pindahkan atau hapus tugasnya dulu.` });
  await db.query('UPDATE event_members SET division_id = NULL WHERE division_id = ?', [did]);
  await db.query('DELETE FROM divisions WHERE id = ?', [did]);
  res.json({ ok: true });
}));

// ===== ATUR PERAN & DIVISI ANGGOTA (FR-06) =====
app.put('/api/events/:id/anggota/:uid', wajibLogin, anggotaEvent, hanyaKetua, aman('Gagal menyimpan perubahan.', async (req, res) => {
  const uid = Number(req.params.uid);
  const { peran } = req.body;
  const divId = req.body.division_id ? Number(req.body.division_id) : null;
  if (!['koordinator', 'bendahara', 'sekretaris', 'anggota'].includes(peran))
    return res.status(400).json({ error: 'Peran tidak valid.' });
  const [t] = await db.query(
    "SELECT peran FROM event_members WHERE event_id = ? AND user_id = ? AND status = 'aktif'", [req.eventId, uid]);
  if (!t.length) return res.status(404).json({ error: 'Anggota tidak ditemukan.' });
  if (t[0].peran === 'ketua') return res.status(400).json({ error: 'Peran Ketua Panitia tidak bisa diubah.' });
  if (divId) {
    const [d] = await db.query('SELECT id FROM divisions WHERE id = ? AND event_id = ?', [divId, req.eventId]);
    if (!d.length) return res.status(400).json({ error: 'Divisi tidak valid.' });
  }
  await db.query('UPDATE event_members SET peran = ?, division_id = ? WHERE event_id = ? AND user_id = ?',
    [peran, divId, req.eventId, uid]);
  res.json({ ok: true });
}));
// ===== TASK BOARD =====
const PRIORITAS = ['rendah', 'sedang', 'tinggi'];
const kelolaDivisi = (m, divId) =>
  m.peran === 'ketua' || (m.peran === 'koordinator' && Number(m.division_id) === Number(divId));

async function ambilTugas(req, res) {
  const [r] = await db.query('SELECT * FROM tasks WHERE id = ? AND event_id = ?', [Number(req.params.tid), req.eventId]);
  if (!r.length) { res.status(404).json({ error: 'Tugas tidak ditemukan.' }); return null; }
  return r[0];
}

app.get('/api/events/:id/tugas', wajibLogin, anggotaEvent, aman('Gagal memuat tugas.', async (req, res) => {
  const [rows] = await db.query(
    `SELECT t.id, t.judul, t.deskripsi, t.division_id, d.nama AS divisi,
            t.penanggung_jawab_id AS pj_id, u.nama AS pj, t.deadline, t.prioritas, t.status, t.catatan_revisi,
            (t.deadline < NOW() AND t.status NOT IN ('done','disetujui')) AS terlambat
     FROM tasks t
     JOIN divisions d ON d.id = t.division_id
     JOIN users u ON u.id = t.penanggung_jawab_id
     WHERE t.event_id = ? ORDER BY t.deadline`, [req.eventId]);
  res.json({
    saya: { id: req.user.id, peran: req.member.peran, division_id: req.member.division_id },
    tugas: rows.map(r => ({ ...r, terlambat: Number(r.terlambat) === 1 })),
  });
}));

app.post('/api/events/:id/tugas', wajibLogin, anggotaEvent, aman('Gagal membuat tugas.', async (req, res) => {
  const judul = (req.body.judul || '').trim();
  const deskripsi = (req.body.deskripsi || '').trim();
  const divId = Number(req.body.division_id);
  const pj = Number(req.body.penanggung_jawab_id);
  const tanggal = req.body.deadline || '';
  const prioritas = req.body.prioritas || 'sedang';

  if (!judul || !divId || !pj || !tanggal)
    return res.status(400).json({ error: 'Judul, divisi, penanggung jawab, dan deadline wajib diisi.' });
  if (judul.length > 150) return res.status(400).json({ error: 'Judul maksimal 150 karakter.' });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(tanggal)) return res.status(400).json({ error: 'Format deadline tidak valid.' });
  if (!PRIORITAS.includes(prioritas)) return res.status(400).json({ error: 'Prioritas tidak valid.' });
  if (!kelolaDivisi(req.member, divId))
    return res.status(403).json({ error: 'Kamu tidak berhak membuat tugas di divisi ini.' });

  const [d] = await db.query('SELECT id FROM divisions WHERE id = ? AND event_id = ?', [divId, req.eventId]);
  if (!d.length) return res.status(400).json({ error: 'Divisi tidak valid.' });
  const [m] = await db.query(
    "SELECT 1 FROM event_members WHERE event_id = ? AND user_id = ? AND status = 'aktif'", [req.eventId, pj]);
  if (!m.length) return res.status(400).json({ error: 'Penanggung jawab harus anggota aktif event ini.' });

  const [r] = await db.query(
    `INSERT INTO tasks (event_id, division_id, judul, deskripsi, penanggung_jawab_id, deadline, prioritas, status, dibuat_oleh)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'todo', ?)`,
    [req.eventId, divId, judul, deskripsi, pj, `${tanggal} 23:59:00`, prioritas, req.user.id]);
  res.status(201).json({ id: r.insertId });
}));

// Pindah status: penanggung jawab, Koordinator divisi, atau Ketua
app.patch('/api/events/:id/tugas/:tid/status', wajibLogin, anggotaEvent, aman('Gagal mengubah status.', async (req, res) => {
  const t = await ambilTugas(req, res); if (!t) return;
  const baru = req.body.status;
  if (!['todo', 'in_progress', 'done'].includes(baru))
    return res.status(400).json({ error: 'Status tidak valid.' });
  if (t.penanggung_jawab_id !== req.user.id && !kelolaDivisi(req.member, t.division_id))
    return res.status(403).json({ error: 'Hanya penanggung jawab, Koordinator divisi, atau Ketua yang bisa mengubah status.' });
  if (t.status === 'disetujui')
    return res.status(409).json({ error: 'Tugas sudah disetujui dan tidak bisa diubah lagi.' });
  await db.query('UPDATE tasks SET status = ? WHERE id = ?', [baru, t.id]);
  res.json({ ok: true });
}));

// Tinjau: setujui, atau kembalikan dengan catatan revisi
app.post('/api/events/:id/tugas/:tid/tinjau', wajibLogin, anggotaEvent, aman('Gagal meninjau tugas.', async (req, res) => {
  const t = await ambilTugas(req, res); if (!t) return;
  if (!kelolaDivisi(req.member, t.division_id))
    return res.status(403).json({ error: 'Hanya Koordinator divisi atau Ketua yang bisa meninjau tugas.' });
  if (t.status !== 'done')
    return res.status(409).json({ error: 'Hanya tugas berstatus Done yang bisa ditinjau.' });
  if (req.body.setuju) {
    await db.query("UPDATE tasks SET status = 'disetujui', catatan_revisi = NULL WHERE id = ?", [t.id]);
    return res.json({ ok: true, status: 'disetujui' });
  }
  const catatan = (req.body.catatan || '').trim();
  if (!catatan) return res.status(400).json({ error: 'Catatan revisi wajib diisi saat mengembalikan tugas.' });
  await db.query("UPDATE tasks SET status = 'in_progress', catatan_revisi = ? WHERE id = ?", [catatan, t.id]);
  res.json({ ok: true, status: 'in_progress' });
}));

// Catatan progres
app.get('/api/events/:id/tugas/:tid/catatan', wajibLogin, anggotaEvent, aman('Gagal memuat catatan.', async (req, res) => {
  const t = await ambilTugas(req, res); if (!t) return;
  const [rows] = await db.query(
    `SELECT a.id, a.catatan, a.created_at, u.nama
     FROM task_attachments a JOIN users u ON u.id = a.dibuat_oleh
     WHERE a.task_id = ? ORDER BY a.id DESC`, [t.id]);
  res.json({ catatan: rows });
}));

app.post('/api/events/:id/tugas/:tid/catatan', wajibLogin, anggotaEvent, aman('Gagal menyimpan catatan.', async (req, res) => {
  const t = await ambilTugas(req, res); if (!t) return;
  if (t.penanggung_jawab_id !== req.user.id && !kelolaDivisi(req.member, t.division_id))
    return res.status(403).json({ error: 'Hanya penanggung jawab, Koordinator divisi, atau Ketua yang bisa menambah catatan.' });
  const catatan = (req.body.catatan || '').trim();
  if (!catatan) return res.status(400).json({ error: 'Catatan tidak boleh kosong.' });
  if (catatan.length > 500) return res.status(400).json({ error: 'Catatan maksimal 500 karakter.' });
  await db.query('INSERT INTO task_attachments (task_id, catatan, dibuat_oleh, created_at) VALUES (?, ?, ?, NOW())',
    [t.id, catatan, req.user.id]);
  res.status(201).json({ ok: true });
}));
// ===== RAPAT & ABSENSI =====
// (tempel di atas app.listen, setelah blok BUDGET TRACKER; memakai fs, crypto, PRIORITAS dari blok sebelumnya)
const kelolaRapat = m => m.peran === 'ketua' || m.peran === 'sekretaris';
function hanyaPenyelenggara(req, res, next) {
  if (!kelolaRapat(req.member))
    return res.status(403).json({ error: 'Hanya Ketua atau Sekretaris yang boleh melakukan ini.' });
  next();
}

const KODE_HURUF = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // tanpa O, I, 0, 1 agar tidak membingungkan
function buatKode() {
  let k = '';
  for (let i = 0; i < 6; i++) k += KODE_HURUF[crypto.randomInt(KODE_HURUF.length)];
  return k;
}
const WAKTU_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

// Ringkasan kehadiran untuk dashboard (hanya rapat yang sudah dimulai yang dihitung untuk persentase)
async function ringkasanKehadiran(eventId) {
  const [[a]] = await db.query(
    'SELECT COUNT(*) AS n, COALESCE(SUM(waktu_mulai <= NOW()), 0) AS lewat FROM meetings WHERE event_id = ?', [eventId]);
  const [[b]] = await db.query(
    `SELECT COUNT(*) AS n FROM meeting_participants p JOIN meetings r ON r.id = p.meeting_id
     WHERE r.event_id = ? AND r.waktu_mulai <= NOW()`, [eventId]);
  const [[c]] = await db.query(
    `SELECT COUNT(*) AS n FROM (
       SELECT DISTINCT s.meeting_id, a.user_id FROM attendances a
       JOIN attendance_sessions s ON s.id = a.session_id
       JOIN meetings r ON r.id = s.meeting_id
       WHERE r.event_id = ? AND r.waktu_mulai <= NOW()) t`, [eventId]);
  return { rapat: Number(a.n), selesai: Number(a.lewat), diundang: Number(b.n), hadir: Number(c.n) };
}

async function barisRapat(eventId, userId, rid) {
  const aktif = 'FROM attendance_sessions s WHERE s.meeting_id = r.id AND s.berlaku_hingga > NOW() ORDER BY s.id DESC LIMIT 1';
  const [rows] = await db.query(
    `SELECT r.id, r.judul, DATE_FORMAT(r.waktu_mulai, '%Y-%m-%d %H:%i:%s') AS waktu_mulai,
            r.lokasi_atau_link, r.agenda, u.nama AS pembuat,
            (SELECT COUNT(*) FROM meeting_participants p WHERE p.meeting_id = r.id) AS peserta,
            (SELECT COUNT(DISTINCT a.user_id) FROM attendances a
               JOIN attendance_sessions s ON s.id = a.session_id WHERE s.meeting_id = r.id) AS hadir,
            (SELECT p.konfirmasi FROM meeting_participants p WHERE p.meeting_id = r.id AND p.user_id = ?) AS konfirmasi_saya,
            EXISTS(SELECT 1 FROM attendances a JOIN attendance_sessions s ON s.id = a.session_id
                   WHERE s.meeting_id = r.id AND a.user_id = ?) AS sudah_checkin,
            (SELECT TIMESTAMPDIFF(SECOND, NOW(), s.berlaku_hingga) ${aktif}) AS sisa_detik,
            (SELECT s.kode ${aktif}) AS kode_aktif,
            EXISTS(SELECT 1 FROM meeting_minutes n WHERE n.meeting_id = r.id) AS ada_notulen
     FROM meetings r JOIN users u ON u.id = r.dibuat_oleh
     WHERE r.event_id = ? ${rid ? 'AND r.id = ?' : ''}
     ORDER BY r.waktu_mulai DESC`,
    rid ? [userId, userId, eventId, rid] : [userId, userId, eventId]);
  return rows;
}

const bersihRapat = (r, kel) => ({
  ...r,
  peserta: Number(r.peserta),
  hadir: Number(r.hadir),
  sudah_checkin: Number(r.sudah_checkin) === 1,
  ada_notulen: Number(r.ada_notulen) === 1,
  sisa_detik: r.sisa_detik === null ? null : Number(r.sisa_detik),
  kode_aktif: kel ? r.kode_aktif : null, // kode hanya terlihat oleh Ketua dan Sekretaris
});

async function ambilRapat(req, res) {
  const [r] = await db.query('SELECT id, judul FROM meetings WHERE id = ? AND event_id = ?',
    [Number(req.params.rid), req.eventId]);
  if (!r.length) { res.status(404).json({ error: 'Rapat tidak ditemukan.' }); return null; }
  return r[0];
}

// Daftar rapat
app.get('/api/events/:id/rapat', wajibLogin, anggotaEvent, aman('Gagal memuat rapat.', async (req, res) => {
  const kel = kelolaRapat(req.member);
  const rows = await barisRapat(req.eventId, req.user.id);
  res.json({ saya: { id: req.user.id, peran: req.member.peran }, rapat: rows.map(r => bersihRapat(r, kel)) });
}));

// Rekap kehadiran per anggota (harus di atas route :rid)
app.get('/api/events/:id/rapat/rekap', wajibLogin, anggotaEvent, hanyaPenyelenggara, aman('Gagal memuat rekap.', async (req, res) => {
  const e = req.eventId;
  const [rows] = await db.query(
    `SELECT u.id, u.nama,
       (SELECT COUNT(*) FROM meeting_participants p JOIN meetings r ON r.id = p.meeting_id
         WHERE r.event_id = ? AND p.user_id = u.id) AS diundang,
       (SELECT COUNT(DISTINCT s.meeting_id) FROM attendances a
         JOIN attendance_sessions s ON s.id = a.session_id JOIN meetings r ON r.id = s.meeting_id
         WHERE r.event_id = ? AND a.user_id = u.id) AS hadir,
       (SELECT COUNT(*) FROM meeting_participants p JOIN meetings r ON r.id = p.meeting_id
         WHERE r.event_id = ? AND p.user_id = u.id AND p.konfirmasi = 'izin') AS izin
     FROM event_members m JOIN users u ON u.id = m.user_id
     WHERE m.event_id = ? AND m.status = 'aktif' ORDER BY u.nama`, [e, e, e, e]);
  res.json({ rekap: rows.map(r => ({ ...r, diundang: Number(r.diundang), hadir: Number(r.hadir), izin: Number(r.izin) })) });
}));

// Detail rapat: peserta (hanya penyelenggara), notulensi, action item
app.get('/api/events/:id/rapat/:rid', wajibLogin, anggotaEvent, aman('Gagal memuat rapat.', async (req, res) => {
  const kel = kelolaRapat(req.member);
  const rid = Number(req.params.rid);
  const [r] = await barisRapat(req.eventId, req.user.id, rid);
  if (!r) return res.status(404).json({ error: 'Rapat tidak ditemukan.' });

  const out = { kelola: kel, rapat: bersihRapat(r, kel), peserta: null, notulen: null, aksi: [] };
  if (kel) {
    const [ps] = await db.query(
      `SELECT u.id, u.nama, p.konfirmasi,
         (SELECT DATE_FORMAT(MIN(a.waktu_checkin), '%Y-%m-%d %H:%i:%s') FROM attendances a
            JOIN attendance_sessions s ON s.id = a.session_id
            WHERE s.meeting_id = p.meeting_id AND a.user_id = p.user_id) AS checkin
       FROM meeting_participants p JOIN users u ON u.id = p.user_id
       WHERE p.meeting_id = ? ORDER BY u.nama`, [rid]);
    out.peserta = ps;
  }
  const [nr] = await db.query('SELECT id, pembahasan, keputusan FROM meeting_minutes WHERE meeting_id = ?', [rid]);
  if (nr.length) {
    out.notulen = { pembahasan: nr[0].pembahasan, keputusan: nr[0].keputusan };
    const [a] = await db.query(
      `SELECT ai.id, ai.deskripsi, ai.task_id, t.judul AS tugas
       FROM action_items ai LEFT JOIN tasks t ON t.id = ai.task_id
       WHERE ai.minute_id = ? ORDER BY ai.id`, [nr[0].id]);
    out.aksi = a;
  }
  res.json(out);
}));

// Jadwalkan rapat (Ketua atau Sekretaris)
app.post('/api/events/:id/rapat', wajibLogin, anggotaEvent, hanyaPenyelenggara, aman('Gagal menjadwalkan rapat.', async (req, res) => {
  const judul = (req.body.judul || '').trim();
  const waktu = req.body.waktu_mulai || '';
  const lokasi = (req.body.lokasi_atau_link || '').trim();
  const agenda = (req.body.agenda || '').trim();
  const peserta = [...new Set((Array.isArray(req.body.peserta) ? req.body.peserta : []).map(Number).filter(Boolean))];

  if (!judul || !waktu || !lokasi) return res.status(400).json({ error: 'Judul, waktu, dan lokasi atau link wajib diisi.' });
  if (judul.length > 150) return res.status(400).json({ error: 'Judul maksimal 150 karakter.' });
  if (lokasi.length > 255) return res.status(400).json({ error: 'Lokasi atau link maksimal 255 karakter.' });
  if (agenda.length > 2000) return res.status(400).json({ error: 'Agenda maksimal 2000 karakter.' });
  if (!WAKTU_RE.test(waktu)) return res.status(400).json({ error: 'Format waktu tidak valid.' });
  if (!peserta.length) return res.status(400).json({ error: 'Pilih minimal satu peserta.' });

  const [ok] = await db.query(
    "SELECT user_id FROM event_members WHERE event_id = ? AND status = 'aktif' AND user_id IN (?)", [req.eventId, peserta]);
  if (ok.length !== peserta.length) return res.status(400).json({ error: 'Peserta harus anggota aktif event ini.' });

  const [r] = await db.query(
    'INSERT INTO meetings (event_id, judul, waktu_mulai, lokasi_atau_link, agenda, dibuat_oleh) VALUES (?, ?, ?, ?, ?, ?)',
    [req.eventId, judul, waktu.replace('T', ' ') + ':00', lokasi, agenda, req.user.id]);
  await db.query('INSERT INTO meeting_participants (meeting_id, user_id) VALUES ?', [peserta.map(u => [r.insertId, u])]);
  res.status(201).json({ id: r.insertId });
}));

// Konfirmasi hadir atau izin (peserta)
app.post('/api/events/:id/rapat/:rid/konfirmasi', wajibLogin, anggotaEvent, aman('Gagal menyimpan konfirmasi.', async (req, res) => {
  const m = await ambilRapat(req, res); if (!m) return;
  const k = req.body.konfirmasi;
  if (!['hadir', 'izin'].includes(k)) return res.status(400).json({ error: 'Pilihan harus Hadir atau Izin.' });
  const [p] = await db.query('SELECT id FROM meeting_participants WHERE meeting_id = ? AND user_id = ?', [m.id, req.user.id]);
  if (!p.length) return res.status(403).json({ error: 'Kamu bukan peserta rapat ini.' });
  await db.query('UPDATE meeting_participants SET konfirmasi = ? WHERE id = ?', [k, p[0].id]);
  res.json({ ok: true });
}));

// Buka sesi absensi (menghasilkan kode dengan batas waktu)
app.post('/api/events/:id/rapat/:rid/absensi', wajibLogin, anggotaEvent, hanyaPenyelenggara, aman('Gagal membuka absensi.', async (req, res) => {
  const m = await ambilRapat(req, res); if (!m) return;
  const menit = Math.round(Number(req.body.menit) || 15);
  if (menit < 1 || menit > 180) return res.status(400).json({ error: 'Batas waktu harus 1 sampai 180 menit.' });
  const [a] = await db.query('SELECT id FROM attendance_sessions WHERE meeting_id = ? AND berlaku_hingga > NOW()', [m.id]);
  if (a.length) return res.status(409).json({ error: 'Sesi absensi masih aktif. Tutup dulu sebelum membuka yang baru.' });
  const kode = buatKode();
  await db.query(
    'INSERT INTO attendance_sessions (meeting_id, kode, berlaku_hingga, dibuka_oleh) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL ? MINUTE), ?)',
    [m.id, kode, menit, req.user.id]);
  res.status(201).json({ kode, menit });
}));

app.post('/api/events/:id/rapat/:rid/absensi/tutup', wajibLogin, anggotaEvent, hanyaPenyelenggara, aman('Gagal menutup absensi.', async (req, res) => {
  const m = await ambilRapat(req, res); if (!m) return;
  await db.query('UPDATE attendance_sessions SET berlaku_hingga = NOW() WHERE meeting_id = ? AND berlaku_hingga > NOW()', [m.id]);
  res.json({ ok: true });
}));

// Check-in dengan kode
app.post('/api/events/:id/rapat/:rid/checkin', wajibLogin, anggotaEvent, aman('Gagal check-in.', async (req, res) => {
  const m = await ambilRapat(req, res); if (!m) return;
  const kode = String(req.body.kode || '').trim().toUpperCase();
  if (!kode) return res.status(400).json({ error: 'Masukkan kode absensi.' });

  const [p] = await db.query('SELECT id FROM meeting_participants WHERE meeting_id = ? AND user_id = ?', [m.id, req.user.id]);
  if (!p.length) return res.status(403).json({ error: 'Kamu bukan peserta rapat ini.' });
  const [sudah] = await db.query(
    `SELECT a.id FROM attendances a JOIN attendance_sessions s ON s.id = a.session_id
     WHERE s.meeting_id = ? AND a.user_id = ?`, [m.id, req.user.id]);
  if (sudah.length) return res.status(409).json({ error: 'Kamu sudah check-in di rapat ini.' });

  const [s] = await db.query(
    `SELECT id, (berlaku_hingga > NOW()) AS aktif FROM attendance_sessions
     WHERE meeting_id = ? AND kode = ? ORDER BY id DESC LIMIT 1`, [m.id, kode]);
  if (!s.length) return res.status(400).json({ error: 'Kode salah. Coba lagi.' });
  if (Number(s[0].aktif) !== 1) return res.status(400).json({ error: 'Kode sudah kedaluwarsa. Minta sesi baru ke panitia.' });

  await db.query('INSERT INTO attendances (session_id, user_id, waktu_checkin) VALUES (?, ?, NOW())', [s[0].id, req.user.id]);
  res.status(201).json({ ok: true });
}));

// Notulensi (Ketua atau Sekretaris)
app.put('/api/events/:id/rapat/:rid/notulen', wajibLogin, anggotaEvent, hanyaPenyelenggara, aman('Gagal menyimpan notulensi.', async (req, res) => {
  const m = await ambilRapat(req, res); if (!m) return;
  const pembahasan = (req.body.pembahasan || '').trim();
  const keputusan = (req.body.keputusan || '').trim();
  if (!pembahasan) return res.status(400).json({ error: 'Pembahasan wajib diisi.' });
  if (pembahasan.length > 5000 || keputusan.length > 5000)
    return res.status(400).json({ error: 'Maksimal 5000 karakter per kolom.' });
  await db.query(
    `INSERT INTO meeting_minutes (meeting_id, pembahasan, keputusan, dibuat_oleh) VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE pembahasan = VALUES(pembahasan), keputusan = VALUES(keputusan)`,
    [m.id, pembahasan, keputusan, req.user.id]);
  res.json({ ok: true });
}));

// Action item
async function ambilAksi(req, res) {
  const [r] = await db.query(
    `SELECT ai.id, ai.deskripsi, ai.task_id, r.judul AS rapat
     FROM action_items ai
     JOIN meeting_minutes n ON n.id = ai.minute_id
     JOIN meetings r ON r.id = n.meeting_id
     WHERE ai.id = ? AND r.id = ? AND r.event_id = ?`,
    [Number(req.params.aid), Number(req.params.rid), req.eventId]);
  if (!r.length) { res.status(404).json({ error: 'Action item tidak ditemukan.' }); return null; }
  return r[0];
}

app.post('/api/events/:id/rapat/:rid/action', wajibLogin, anggotaEvent, hanyaPenyelenggara, aman('Gagal menambah action item.', async (req, res) => {
  const m = await ambilRapat(req, res); if (!m) return;
  const deskripsi = (req.body.deskripsi || '').trim();
  if (!deskripsi) return res.status(400).json({ error: 'Isi action item wajib diisi.' });
  if (deskripsi.length > 255) return res.status(400).json({ error: 'Action item maksimal 255 karakter.' });
  const [n] = await db.query('SELECT id FROM meeting_minutes WHERE meeting_id = ?', [m.id]);
  if (!n.length) return res.status(409).json({ error: 'Simpan notulensi dulu sebelum menambah action item.' });
  await db.query('INSERT INTO action_items (minute_id, deskripsi) VALUES (?, ?)', [n[0].id, deskripsi]);
  res.status(201).json({ ok: true });
}));

app.delete('/api/events/:id/rapat/:rid/action/:aid', wajibLogin, anggotaEvent, hanyaPenyelenggara, aman('Gagal menghapus action item.', async (req, res) => {
  const a = await ambilAksi(req, res); if (!a) return;
  if (a.task_id) return res.status(409).json({ error: 'Action item ini sudah dijadikan tugas, jadi tidak bisa dihapus.' });
  await db.query('DELETE FROM action_items WHERE id = ?', [a.id]);
  res.json({ ok: true });
}));

// Jadikan action item sebagai tugas di Task Board
app.post('/api/events/:id/rapat/:rid/action/:aid/tugas', wajibLogin, anggotaEvent, hanyaPenyelenggara, aman('Gagal membuat tugas.', async (req, res) => {
  const a = await ambilAksi(req, res); if (!a) return;
  if (a.task_id) return res.status(409).json({ error: 'Action item ini sudah dijadikan tugas.' });

  const divId = Number(req.body.division_id);
  const pj = Number(req.body.penanggung_jawab_id);
  const tanggal = req.body.deadline || '';
  const prioritas = req.body.prioritas || 'sedang';
  if (!divId || !pj || !tanggal) return res.status(400).json({ error: 'Divisi, penanggung jawab, dan deadline wajib diisi.' });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(tanggal)) return res.status(400).json({ error: 'Format deadline tidak valid.' });
  if (!PRIORITAS.includes(prioritas)) return res.status(400).json({ error: 'Prioritas tidak valid.' });

  const [d] = await db.query('SELECT id FROM divisions WHERE id = ? AND event_id = ?', [divId, req.eventId]);
  if (!d.length) return res.status(400).json({ error: 'Divisi tidak valid.' });
  const [mm] = await db.query(
    "SELECT 1 FROM event_members WHERE event_id = ? AND user_id = ? AND status = 'aktif'", [req.eventId, pj]);
  if (!mm.length) return res.status(400).json({ error: 'Penanggung jawab harus anggota aktif event ini.' });

  const [t] = await db.query(
    `INSERT INTO tasks (event_id, division_id, judul, deskripsi, penanggung_jawab_id, deadline, prioritas, status, dibuat_oleh)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'todo', ?)`,
    [req.eventId, divId, a.deskripsi.slice(0, 150), `Dari notulensi rapat "${a.rapat}"`, pj, `${tanggal} 23:59:00`, prioritas, req.user.id]);
  const [u] = await db.query('UPDATE action_items SET task_id = ? WHERE id = ? AND task_id IS NULL', [t.insertId, a.id]);
  if (!u.affectedRows) { // keduluan permintaan lain: batalkan tugas yang barusan dibuat
    await db.query('DELETE FROM tasks WHERE id = ?', [t.insertId]);
    return res.status(409).json({ error: 'Action item ini sudah dijadikan tugas.' });
  }
  res.status(201).json({ task_id: t.insertId });
}));

// ===== BUDGET TRACKER =====
const fs = require('fs');
const crypto = require('crypto');
const multer = require('multer');

const UPLOAD_DIR = path.join(__dirname, 'uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });
const EXT_NOTA = { 'image/jpeg': '.jpg', 'image/png': '.png', 'application/pdf': '.pdf' };
const unggah = multer({
  storage: multer.diskStorage({
    destination: UPLOAD_DIR,
    filename: (req, file, cb) => cb(null, crypto.randomBytes(16).toString('hex') + (EXT_NOTA[file.mimetype] || '')),
  }),
  limits: { fileSize: 2 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => cb(null, !!EXT_NOTA[file.mimetype]),
}).single('nota');

function terimaNota(req, res, next) {
  unggah(req, res, err => {
    if (!err) return next();
    res.status(400).json({ error: err.code === 'LIMIT_FILE_SIZE' ? 'Ukuran nota maksimal 2 MB.' : 'Gagal mengunggah nota.' });
  });
}

const MAKS_UANG = 999999999999;
const angkaUang = v => Math.round(Number(v));
const uangBerhak = m => m.peran === 'ketua' || m.peran === 'bendahara';
function hanyaKeuangan(req, res, next) {
  if (!uangBerhak(req.member))
    return res.status(403).json({ error: 'Hanya Bendahara atau Ketua yang boleh melakukan ini.' });
  next();
}

async function ringkasanAnggaran(eventId) {
  const [[r]] = await db.query('SELECT COALESCE(SUM(jumlah_rencana),0) AS n FROM budget_items WHERE event_id = ?', [eventId]);
  const [[m]] = await db.query('SELECT COALESCE(SUM(nominal),0) AS n FROM incomes WHERE event_id = ?', [eventId]);
  const [[k]] = await db.query(
    `SELECT COALESCE(SUM(CASE WHEN x.status = 'disetujui' THEN x.nominal END), 0) AS keluar,
            COALESCE(SUM(x.status = 'menunggu'), 0) AS menunggu
     FROM expenses x JOIN budget_items b ON b.id = x.budget_item_id WHERE b.event_id = ?`, [eventId]);
  const [[o]] = await db.query(
    `SELECT COUNT(*) AS n FROM (
       SELECT b.id FROM budget_items b
       JOIN expenses x ON x.budget_item_id = b.id AND x.status = 'disetujui'
       WHERE b.event_id = ? GROUP BY b.id, b.jumlah_rencana HAVING SUM(x.nominal) > b.jumlah_rencana) t`, [eventId]);
  const rencana = Number(r.n), pemasukan = Number(m.n), pengeluaran = Number(k.keluar);
  return { rencana, pemasukan, pengeluaran, saldo: pemasukan - pengeluaran, menunggu: Number(k.menunggu), terlampaui: Number(o.n) };
}

// Satu endpoint untuk halaman Anggaran. Isinya menyesuaikan peran.
app.get('/api/events/:id/anggaran', wajibLogin, anggotaEvent, aman('Gagal memuat anggaran.', async (req, res) => {
  const keu = uangBerhak(req.member);
  const [pos] = await db.query(
    `SELECT b.id, b.nama_pos, b.division_id, d.nama AS divisi, b.jumlah_rencana,
            COALESCE(SUM(CASE WHEN x.status = 'disetujui' THEN x.nominal END), 0) AS realisasi,
            COALESCE(SUM(CASE WHEN x.status = 'menunggu' THEN x.nominal END), 0) AS menunggu
     FROM budget_items b
     LEFT JOIN divisions d ON d.id = b.division_id
     LEFT JOIN expenses x ON x.budget_item_id = b.id
     WHERE b.event_id = ?
     GROUP BY b.id, b.nama_pos, b.division_id, d.nama, b.jumlah_rencana ORDER BY b.id`, [req.eventId]);

  const out = { keuangan: keu, saya: { id: req.user.id, peran: req.member.peran } };
  out.pos = keu
    ? pos.map(p => ({ id: p.id, nama_pos: p.nama_pos, division_id: p.division_id, divisi: p.divisi,
        rencana: Number(p.jumlah_rencana), realisasi: Number(p.realisasi), menunggu: Number(p.menunggu) }))
    : pos.map(p => ({ id: p.id, nama_pos: p.nama_pos }));

  const [kel] = await db.query(
    `SELECT x.id, DATE_FORMAT(x.tanggal, '%Y-%m-%d') AS tanggal, x.nominal, x.keterangan, x.status,
            x.catatan_verifikasi, b.nama_pos, u.nama AS pengaju
     FROM expenses x
     JOIN budget_items b ON b.id = x.budget_item_id
     JOIN users u ON u.id = x.diajukan_oleh
     WHERE b.event_id = ? ${keu ? '' : 'AND x.diajukan_oleh = ?'}
     ORDER BY x.id DESC`, keu ? [req.eventId] : [req.eventId, req.user.id]);
  out.pengeluaran = kel.map(x => ({ ...x, nominal: Number(x.nominal) }));

  if (keu) {
    const [masuk] = await db.query(
      `SELECT i.id, i.sumber, i.nominal, DATE_FORMAT(i.tanggal, '%Y-%m-%d') AS tanggal, u.nama AS pencatat
       FROM incomes i JOIN users u ON u.id = i.dicatat_oleh
       WHERE i.event_id = ? ORDER BY i.tanggal DESC, i.id DESC`, [req.eventId]);
    out.pemasukan = masuk.map(i => ({ ...i, nominal: Number(i.nominal) }));
    out.ringkasan = await ringkasanAnggaran(req.eventId);
    const [dv] = await db.query('SELECT id, nama FROM divisions WHERE event_id = ? ORDER BY id', [req.eventId]);
    out.divisi = dv;
  }
  res.json(out);
}));

// --- Pos anggaran ---
async function bacaPos(req, res) {
  const nama = (req.body.nama_pos || '').trim();
  const jumlah = angkaUang(req.body.jumlah_rencana);
  const divId = req.body.division_id ? Number(req.body.division_id) : null;
  if (!nama) { res.status(400).json({ error: 'Nama pos wajib diisi.' }); return null; }
  if (nama.length > 100) { res.status(400).json({ error: 'Nama pos maksimal 100 karakter.' }); return null; }
  if (!(jumlah > 0) || jumlah > MAKS_UANG) { res.status(400).json({ error: 'Nominal rencana harus lebih dari 0.' }); return null; }
  if (divId) {
    const [d] = await db.query('SELECT id FROM divisions WHERE id = ? AND event_id = ?', [divId, req.eventId]);
    if (!d.length) { res.status(400).json({ error: 'Divisi tidak valid.' }); return null; }
  }
  return { nama, jumlah, divId };
}

app.post('/api/events/:id/pos', wajibLogin, anggotaEvent, hanyaKeuangan, aman('Gagal menyimpan pos.', async (req, res) => {
  const p = await bacaPos(req, res); if (!p) return;
  const [r] = await db.query(
    'INSERT INTO budget_items (event_id, division_id, nama_pos, jumlah_rencana) VALUES (?, ?, ?, ?)',
    [req.eventId, p.divId, p.nama, p.jumlah]);
  res.status(201).json({ id: r.insertId });
}));

app.put('/api/events/:id/pos/:pid', wajibLogin, anggotaEvent, hanyaKeuangan, aman('Gagal mengubah pos.', async (req, res) => {
  const p = await bacaPos(req, res); if (!p) return;
  const [r] = await db.query(
    'UPDATE budget_items SET nama_pos = ?, jumlah_rencana = ?, division_id = ? WHERE id = ? AND event_id = ?',
    [p.nama, p.jumlah, p.divId, Number(req.params.pid), req.eventId]);
  if (!r.affectedRows) return res.status(404).json({ error: 'Pos tidak ditemukan.' });
  res.json({ ok: true });
}));

app.delete('/api/events/:id/pos/:pid', wajibLogin, anggotaEvent, hanyaKeuangan, aman('Gagal menghapus pos.', async (req, res) => {
  const pid = Number(req.params.pid);
  const [a] = await db.query('SELECT id FROM budget_items WHERE id = ? AND event_id = ?', [pid, req.eventId]);
  if (!a.length) return res.status(404).json({ error: 'Pos tidak ditemukan.' });
  const [[x]] = await db.query('SELECT COUNT(*) AS n FROM expenses WHERE budget_item_id = ?', [pid]);
  if (Number(x.n) > 0)
    return res.status(409).json({ error: `Pos ini sudah punya ${x.n} pengajuan pengeluaran, jadi tidak bisa dihapus.` });
  await db.query('DELETE FROM budget_items WHERE id = ?', [pid]);
  res.json({ ok: true });
}));

// --- Pemasukan ---
app.post('/api/events/:id/pemasukan', wajibLogin, anggotaEvent, hanyaKeuangan, aman('Gagal mencatat pemasukan.', async (req, res) => {
  const sumber = (req.body.sumber || '').trim();
  const nominal = angkaUang(req.body.nominal);
  const tanggal = req.body.tanggal || '';
  if (!sumber || !tanggal) return res.status(400).json({ error: 'Sumber, nominal, dan tanggal wajib diisi.' });
  if (sumber.length > 100) return res.status(400).json({ error: 'Sumber maksimal 100 karakter.' });
  if (!(nominal > 0) || nominal > MAKS_UANG) return res.status(400).json({ error: 'Nominal harus lebih dari 0.' });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(tanggal)) return res.status(400).json({ error: 'Format tanggal tidak valid.' });
  await db.query('INSERT INTO incomes (event_id, sumber, nominal, tanggal, dicatat_oleh) VALUES (?, ?, ?, ?, ?)',
    [req.eventId, sumber, nominal, tanggal, req.user.id]);
  res.status(201).json({ ok: true });
}));

app.delete('/api/events/:id/pemasukan/:iid', wajibLogin, anggotaEvent, hanyaKeuangan, aman('Gagal menghapus pemasukan.', async (req, res) => {
  const [r] = await db.query('DELETE FROM incomes WHERE id = ? AND event_id = ?', [Number(req.params.iid), req.eventId]);
  if (!r.affectedRows) return res.status(404).json({ error: 'Pemasukan tidak ditemukan.' });
  res.json({ ok: true });
}));

// --- Pengeluaran (diajukan semua anggota) ---
app.post('/api/events/:id/pengeluaran', wajibLogin, anggotaEvent, terimaNota, aman('Gagal mengajukan pengeluaran.', async (req, res) => {
  const gagal = (kode, pesan) => { if (req.file) fs.unlink(req.file.path, () => {}); return res.status(kode).json({ error: pesan }); };
  const posId = Number(req.body.budget_item_id);
  const nominal = angkaUang(req.body.nominal);
  const tanggal = req.body.tanggal || '';
  const keterangan = (req.body.keterangan || '').trim();

  if (!posId || !tanggal || !keterangan) return gagal(400, 'Pos, tanggal, nominal, dan keterangan wajib diisi.');
  if (!(nominal > 0) || nominal > MAKS_UANG) return gagal(400, 'Nominal harus lebih dari 0.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(tanggal)) return gagal(400, 'Format tanggal tidak valid.');
  if (keterangan.length > 255) return gagal(400, 'Keterangan maksimal 255 karakter.');
  if (!req.file) return gagal(400, 'Foto nota wajib diunggah (JPG, PNG, atau PDF, maksimal 2 MB).');
  const [p] = await db.query('SELECT id FROM budget_items WHERE id = ? AND event_id = ?', [posId, req.eventId]);
  if (!p.length) return gagal(400, 'Pos anggaran tidak valid.');

  await db.query(
    `INSERT INTO expenses (budget_item_id, diajukan_oleh, tanggal, nominal, keterangan, bukti_nota, status)
     VALUES (?, ?, ?, ?, ?, ?, 'menunggu')`,
    [posId, req.user.id, tanggal, nominal, keterangan, req.file.filename]);
  res.status(201).json({ ok: true });
}));

app.post('/api/events/:id/pengeluaran/:xid/verifikasi', wajibLogin, anggotaEvent, hanyaKeuangan, aman('Gagal memverifikasi.', async (req, res) => {
  const xid = Number(req.params.xid);
  const [r] = await db.query(
    `SELECT x.id, x.status, x.budget_item_id FROM expenses x
     JOIN budget_items b ON b.id = x.budget_item_id WHERE x.id = ? AND b.event_id = ?`, [xid, req.eventId]);
  if (!r.length) return res.status(404).json({ error: 'Pengeluaran tidak ditemukan.' });
  if (r[0].status !== 'menunggu') return res.status(409).json({ error: 'Pengeluaran ini sudah diverifikasi.' });

  const setuju = !!req.body.setuju;
  const catatan = (req.body.catatan || '').trim();
  if (!setuju && !catatan) return res.status(400).json({ error: 'Catatan wajib diisi saat menolak pengeluaran.' });
  if (catatan.length > 500) return res.status(400).json({ error: 'Catatan maksimal 500 karakter.' });

  const [u] = await db.query(
    `UPDATE expenses SET status = ?, catatan_verifikasi = ?, diverifikasi_oleh = ?, diverifikasi_pada = NOW()
     WHERE id = ? AND status = 'menunggu'`,
    [setuju ? 'disetujui' : 'ditolak', catatan || null, req.user.id, xid]);
  if (!u.affectedRows) return res.status(409).json({ error: 'Pengeluaran ini sudah diverifikasi.' });

  let peringatan = null;
  if (setuju) {
    const [[p]] = await db.query(
      `SELECT b.nama_pos, b.jumlah_rencana, COALESCE(SUM(x.nominal), 0) AS realisasi
       FROM budget_items b LEFT JOIN expenses x ON x.budget_item_id = b.id AND x.status = 'disetujui'
       WHERE b.id = ? GROUP BY b.id, b.nama_pos, b.jumlah_rencana`, [r[0].budget_item_id]);
    if (p && Number(p.realisasi) > Number(p.jumlah_rencana))
      peringatan = `Peringatan: realisasi pos "${p.nama_pos}" melebihi rencana anggaran.`;
  }
  res.json({ ok: true, peringatan });
}));

// Foto nota: hanya pengaju, Bendahara, dan Ketua event itu
app.get('/api/events/:id/pengeluaran/:xid/nota', wajibLogin, anggotaEvent, aman('Gagal memuat nota.', async (req, res) => {
  const [r] = await db.query(
    `SELECT x.bukti_nota, x.diajukan_oleh FROM expenses x
     JOIN budget_items b ON b.id = x.budget_item_id WHERE x.id = ? AND b.event_id = ?`,
    [Number(req.params.xid), req.eventId]);
  if (!r.length) return res.status(404).json({ error: 'Pengeluaran tidak ditemukan.' });
  if (!uangBerhak(req.member) && r[0].diajukan_oleh !== req.user.id)
    return res.status(403).json({ error: 'Kamu tidak berhak melihat nota ini.' });
  const berkas = path.join(UPLOAD_DIR, path.basename(r[0].bukti_nota));
  if (!fs.existsSync(berkas)) return res.status(404).json({ error: 'Berkas nota tidak ditemukan.' });
  res.set('X-Content-Type-Options', 'nosniff');
  res.sendFile(berkas);
}));
app.listen(process.env.PORT, () => {
  console.log(`Server jalan di http://localhost:${process.env.PORT}`);
});