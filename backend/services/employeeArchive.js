class EmployeeStatusError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

async function changeEmployeeStatus({ db, employeeId, adminId, active, ip, userAgent }) {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const [admins] = await connection.query('SELECT position FROM admins WHERE id = ? FOR UPDATE', [adminId]);
    if (admins[0]?.position !== 'Superadmin') throw new EmployeeStatusError(403, 'Superadmin access required.');
    const [users] = await connection.query(
      'SELECT id, name, role, is_active, archived_at FROM users WHERE id = ? FOR UPDATE', [employeeId]
    );
    const employee = users[0];
    if (!employee) throw new EmployeeStatusError(404, 'Employee not found.');
    if (Boolean(employee.is_active) === active) {
      throw new EmployeeStatusError(409, active ? 'Employee is already active.' : 'Employee is already archived.');
    }
    if (!active) {
      const [sessions] = await connection.query(
        'SELECT user_id FROM employee_site_sessions WHERE user_id = ? LIMIT 1', [employeeId]
      );
      if (sessions.length) {
        throw new EmployeeStatusError(409, 'Close the open time-in before archiving this employee.');
      }
    }
    await connection.query(
      `UPDATE users SET is_active = ?, archived_at = ${active ? 'NULL' : 'UTC_TIMESTAMP()'} WHERE id = ?`,
      [active ? 1 : 0, employeeId]
    );
    const [updatedRows] = await connection.query(
      'SELECT id, name, role, created_at, is_active, archived_at FROM users WHERE id = ?', [employeeId]
    );
    const updated = updatedRows[0];
    await connection.query(`INSERT INTO audit_logs
      (user_id, user_type, action, entity_type, entity_id, old_values, new_values, ip_address, user_agent)
      VALUES (?, 'admin', ?, 'employee', ?, ?, ?, ?, ?)`, [
      adminId, active ? 'RESTORE' : 'ARCHIVE', employeeId,
      JSON.stringify({ is_active: Boolean(employee.is_active), archived_at: employee.archived_at }),
      JSON.stringify({ is_active: active, archived_at: updated.archived_at }), ip, userAgent
    ]);
    await connection.commit();
    return updated;
  } catch (error) {
    await connection.rollback().catch(() => {});
    throw error;
  } finally {
    connection.release();
  }
}

module.exports = { changeEmployeeStatus, EmployeeStatusError };
