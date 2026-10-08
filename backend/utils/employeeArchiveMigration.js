async function migrateEmployeeArchive(pool) {
  const [columns] = await pool.query('SHOW COLUMNS FROM users');
  const names = new Set(columns.map(column => column.Field));
  for (const [name, definition] of [
    ['is_active', 'TINYINT(1) NOT NULL DEFAULT 1'],
    ['archived_at', 'DATETIME NULL']
  ]) {
    if (names.has(name)) continue;
    try {
      await pool.query(`ALTER TABLE users ADD COLUMN ${name} ${definition}`);
    } catch (error) {
      if (error.code !== 'ER_DUP_FIELDNAME') throw error;
    }
  }
}

module.exports = { migrateEmployeeArchive };
