const pool = require('../config/db');

async function requireSuperadmin(req, res, next) {
  try {
    await pool.ready;
    const [rows] = await pool.query('SELECT position FROM admins WHERE id = ?', [req.user?.id]);
    if (rows[0]?.position !== 'Superadmin') {
      return res.status(403).json({ error: 'Superadmin access required.' });
    }
    next();
  } catch (error) {
    console.error('Superadmin verification failed:', error);
    res.status(500).json({ error: 'Unable to verify Superadmin access.' });
  }
}

module.exports = { requireSuperadmin };
