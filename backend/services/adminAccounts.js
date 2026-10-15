const bcrypt = require('bcryptjs');

class AdminAccountError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

async function mutateAdmin({ db, actorId, targetId, changes, ip, userAgent }) {
  const id = Number(targetId);
  if (!Number.isSafeInteger(id) || id < 1) throw new AdminAccountError(400, 'Invalid administrator ID.');
  if (changes && (typeof changes.username !== 'string' || !changes.username.trim() || changes.username.trim().length > 100 ||
      !['Admin', 'Superadmin'].includes(changes.position) ||
      (changes.password != null && typeof changes.password !== 'string') ||
      (changes.password && changes.password.length < 8))) {
    throw new AdminAccountError(400, 'Enter a username, a valid position, and a password of at least 8 characters if changing it.');
  }
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    // Serialize deletion and demotion together so the last Superadmin is retained.
    const [admins] = await connection.query('SELECT id, username, position FROM admins ORDER BY id FOR UPDATE');
    if (admins.find(admin => Number(admin.id) === Number(actorId))?.position !== 'Superadmin') {
      throw new AdminAccountError(403, 'Superadmin access required.');
    }
    const target = admins.find(admin => Number(admin.id) === id);
    if (!target) throw new AdminAccountError(404, 'Admin account not found.');
    if (!changes && id === Number(actorId)) throw new AdminAccountError(400, 'You cannot delete your own active logged-in account.');
    if (target.position === 'Superadmin' && (!changes || changes.position !== 'Superadmin') &&
        admins.filter(admin => admin.position === 'Superadmin').length <= 1) {
      throw new AdminAccountError(400, 'Cannot delete or demote the last remaining Superadmin account.');
    }
    const username = changes?.username.trim();
    if (changes) {
      if (admins.some(admin => Number(admin.id) !== id && admin.username.toLowerCase() === username.toLowerCase())) {
        throw new AdminAccountError(409, 'Username already exists.');
      }
      const password = changes.password ? await bcrypt.hash(changes.password, 10) : null;
      await connection.query('UPDATE admins SET username = ?, position = ?, password = COALESCE(?, password) WHERE id = ?',
        [username, changes.position, password, id]);
    } else {
      await connection.query('DELETE FROM admins WHERE id = ?', [id]);
    }
    await connection.query(`INSERT INTO audit_logs
      (user_id, user_type, action, entity_type, entity_id, old_values, new_values, ip_address, user_agent)
      VALUES (?, 'admin', ?, 'admin', ?, ?, ?, ?, ?)`, [actorId, changes ? 'UPDATE_ADMIN' : 'DELETE_ADMIN', id,
      JSON.stringify(target), changes ? JSON.stringify({ username, position: changes.position }) : null, ip, userAgent]);
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally { connection.release(); }
}

module.exports = { mutateAdmin, AdminAccountError };
