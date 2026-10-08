const fs = require('fs');
const mysql = require('mysql2/promise');

// ===================== CONFIG =====================
const DB_CONFIG = {
  host: 'account-production-statefulsta-rdsdatabase74c89a2a-2wnofam37xec.cluster-cm3ecix197sc.ap-southeast-1.rds.amazonaws.com',       // ganti sesuai environment
  port: 3306,
  user: 'sangsya',           // ganti sesuai environment
  password: 'ASyChOEFtwea',           // ganti sesuai environment
  database: 'idn_account',
};

const CSV_FILE = './list-users.csv';
const OUTPUT_FILE = `./result-${Date.now()}.json`;
const CUTOFF_DATE = '2026-07-21 15:00:00';
const DELAY_MS = 100; // delay antar query
// ==================================================

async function main() {
  const connection = await mysql.createConnection(DB_CONFIG);
  console.log('Connected to database');

  // Baca CSV
  const csvRaw = fs.readFileSync(CSV_FILE, 'utf-8');
  const rows = csvRaw
    .split('\n')
    .map(line => line.trim())
    .filter(line => line !== '')
    .map(line => {
      const [short_id, uuid] = line.split(',');
      return { short_id: short_id.trim(), uuid: uuid.trim() };
    });

  console.log(`Total data dari CSV: ${rows.length}`);
  console.log('---');

  const results = [];

  for (let i = 0; i < rows.length; i++) {
    const { short_id: csvShortId, uuid } = rows[i];
    const progress = `[${i + 1}/${rows.length}]`;

    console.log(`${progress} Processing UUID: ${uuid} | CSV short_id: ${csvShortId}`);

    try {
      // Query 1: Cek data uuid di database
      const [dbRows] = await connection.execute(
        `SELECT a.id, a.uuid, a.short_id, a.email, a.phone_number, aa.created_at, aa.activity_type_id, aa.portal_id
         FROM idn_account.authenticates a
         JOIN idn_account.authenticate_activities aa ON a.uuid = aa.uuid
         WHERE 1=1
           AND a.uuid = ?
           AND aa.activity_type_id = 2
         ORDER BY aa.created_at DESC
         LIMIT 1`,
        [uuid]
      );

      if (dbRows.length === 0) {
        console.log(`  ⚠ Data tidak ditemukan di database`);
        results.push({
          csv_short_id: csvShortId,
          uuid,
          status: 'tidak ditemukan',
          detail: 'UUID tidak ada di database atau tidak ada activity_type_id = 2',
        });
        continue;
      }

      const dbRecord = dbRows[0];
      const dbShortId = dbRecord.short_id;
      const createdAt = new Date(dbRecord.created_at);

      // Cek apakah short_id nya benar
      if (dbShortId === csvShortId) {
        console.log(`  ✓ short_id sudah sesuai: ${dbShortId}`);
        results.push({
          csv_short_id: csvShortId,
          uuid,
          db_short_id: dbShortId,
          status: 'sudah sesuai',
          email: dbRecord.email,
          created_at: dbRecord.created_at,
        });
        continue;
      }

      // short_id berbeda
      console.log(`  ✗ short_id berbeda! CSV: ${csvShortId} | DB: ${dbShortId}`);

      // Query 2: Cek apakah short_id dari CSV sudah digunakan user lain
      const [existingRows] = await connection.execute(
        `SELECT a.id, a.short_id
         FROM idn_account.authenticates a
         WHERE a.short_id = ?`,
        [csvShortId]
      );

      if (existingRows.length > 0) {
        console.log(`  ⚠ short_id "${csvShortId}" sudah digunakan oleh user lain (id: ${existingRows[0].id})`);
        results.push({
          csv_short_id: csvShortId,
          uuid,
          db_short_id: dbShortId,
          status: 'short_id sudah digunakan',
          detail: `short_id "${csvShortId}" sudah digunakan oleh user id: ${existingRows[0].id}`,
          email: dbRecord.email,
          created_at: dbRecord.created_at,
        });
        continue;
      }

      // Cek created_at
      const cutoffDate = new Date(CUTOFF_DATE);

      if (createdAt >= cutoffDate) {
        // created_at lebih dari atau sama dengan cutoff -> tetap
        console.log(`  → created_at (${dbRecord.created_at}) >= cutoff → tetap`);
        results.push({
          csv_short_id: csvShortId,
          uuid,
          db_short_id: dbShortId,
          status: 'tetap',
          detail: `created_at (${dbRecord.created_at}) >= ${CUTOFF_DATE}, tidak perlu update`,
          email: dbRecord.email,
          created_at: dbRecord.created_at,
        });
      } else {
        // created_at kurang dari cutoff -> update short_id dengan short_id dari CSV
        console.log(`  → created_at (${dbRecord.created_at}) < cutoff → UPDATE short_id ke "${csvShortId}"`);

        await connection.execute(
          `UPDATE idn_account.authenticates
           SET short_id = ?
           WHERE uuid = ?`,
          [csvShortId, uuid]
        );

        console.log(`  ✓ Updated! short_id: ${dbShortId} → ${csvShortId}`);
        results.push({
          csv_short_id: csvShortId,
          uuid,
          db_short_id_before: dbShortId,
          db_short_id_after: csvShortId,
          status: 'updated',
          detail: `short_id diupdate dari "${dbShortId}" ke "${csvShortId}"`,
          email: dbRecord.email,
          created_at: dbRecord.created_at,
        });
      }
    } catch (error) {
      console.error(`  ✗ Error: ${error.message}`);
      results.push({
        csv_short_id: csvShortId,
        uuid,
        status: 'error',
        detail: error.message,
      });
    }

    // Delay antar request
    if (i < rows.length - 1) {
      await new Promise(resolve => setTimeout(resolve, DELAY_MS));
    }
  }

  // Summary
  const summary = {
    total: results.length,
    sudah_sesuai: results.filter(r => r.status === 'sudah sesuai').length,
    updated: results.filter(r => r.status === 'updated').length,
    tetap: results.filter(r => r.status === 'tetap').length,
    short_id_sudah_digunakan: results.filter(r => r.status === 'short_id sudah digunakan').length,
    tidak_ditemukan: results.filter(r => r.status === 'tidak ditemukan').length,
    error: results.filter(r => r.status === 'error').length,
  };

  console.log('\n========== SUMMARY ==========');
  console.log(JSON.stringify(summary, null, 2));

  // Save results
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify({ summary, results }, null, 2));
  console.log(`\nResults saved to ${OUTPUT_FILE}`);

  await connection.end();
  console.log('Database connection closed');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
