require('dotenv').config();
const bcrypt = require('bcryptjs');
const db = require('./db');
const [, , email, password] = process.argv;
(async () => {
  const hash = await bcrypt.hash(password, 10);
  const [r] = await db.query('UPDATE users SET password = ? WHERE email = ?', [hash, email]);
  console.log(r.affectedRows ? 'Password diperbarui.' : 'Email tidak ditemukan.');
  process.exit();
})();