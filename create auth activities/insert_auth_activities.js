const fs = require('fs');
const readline = require('readline');
const mysql = require('mysql2/promise');

// ===================== CONFIG =====================
const DB_CONFIG = {
  host: 'account-master-statefulstackrd-rdsdatabase74c89a2a-6hxvnixkbjzg.cluster-cb4u2f58wgrm.ap-southeast-1.rds.amazonaws.com', // ganti sesuai environment
  port: 3306,
  user: 'idnadmin',            // ganti sesuai environment
  password: 'mDJQ,fk-280,5GJ-42AqV6IFFi4x_f',   // ganti sesuai environment
  database: 'idn_account',
};

const CSV_FILE = './list_uuid.csv';

const PORTAL_ID = 6;
const ACTIVITY_TYPE_IDS = [2, 4];      // dipilih random per activity
const MIN_ACTIVITIES = 20;              // minimal activities per uuid
const MAX_ACTIVITIES = 30;             // maksimal activities per uuid

// rentang created_at: 1 September s/d 24 September (tahun mengikuti YEAR)
const YEAR = 2026;
const DATE_START = new Date(`${YEAR}-05-01T00:00:00.000Z`);
const DATE_END = new Date(`${YEAR}-09-24T23:59:59.999Z`);

// jumlah baris VALUES yang di-insert per query (bulk insert)
const BATCH_SIZE = 5000;

const PROGRESS_EVERY = 5000; // print progress tiap sekian uuid
// ==================================================

function randomInt(min, max) {
  // inclusive
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pickActivityType() {
  return ACTIVITY_TYPE_IDS[randomInt(0, ACTIVITY_TYPE_IDS.length - 1)];
}

const START_MS = DATE_START.getTime();
const END_MS = DATE_END.getTime();

// Format: 2026-09-24 11:35:41.247486  (microsecond, 6 digit)
function randomCreatedAt() {
  const ms = randomInt(START_MS, END_MS);
  const d = new Date(ms);
  const pad = (n, len = 2) => String(n).padStart(len, '0');
  const yyyy = d.getUTCFullYear();
  const MM = pad(d.getUTCMonth() + 1);
  const dd = pad(d.getUTCDate());
  const HH = pad(d.getUTCHours());
  const mm = pad(d.getUTCMinutes());
  const ss = pad(d.getUTCSeconds());
  // random microsecond (6 digit)
  const micro = pad(randomInt(0, 999999), 6);
  return `${yyyy}-${MM}-${dd} ${HH}:${mm}:${ss}.${micro}`;
}

function cleanUuid(raw) {
  // buang tanda kutip dan spasi
  return raw.replace(/^"|"$/g, '').replace(/"/g, '').trim();
}

const UUID_REGEX = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

async function main() {
  const connection = await mysql.createConnection({
    ...DB_CONFIG,
    // supaya bulk insert lancar
    multipleStatements: false,
  });
  console.log('Connected to database');

  const insertSqlPrefix =
    'INSERT INTO idn_account.authenticate_activities (uuid, activity_type_id, portal_id, created_at) VALUES ';

  let totalUuid = 0;
  let totalActivities = 0;
  let skipped = 0;

  // batch buffers
  let placeholders = [];
  let params = [];

  const startTime = Date.now();

  async function flushBatch() {
    if (placeholders.length === 0) return;
    const sql = insertSqlPrefix + placeholders.join(', ');
    await connection.query(sql, params);
    placeholders = [];
    params = [];
  }

  const rl = readline.createInterface({
    input: fs.createReadStream(CSV_FILE, { encoding: 'utf-8' }),
    crlfDelay: Infinity,
  });

  let isHeader = true;

  for await (const line of rl) {
    const trimmed = line.trim();
    if (trimmed === '') continue;

    // lewati baris header (kolom "uuid")
    if (isHeader) {
      isHeader = false;
      const headerVal = cleanUuid(trimmed).toLowerCase();
      if (headerVal === 'uuid') {
        continue;
      }
      // kalau ternyata baris pertama bukan header, jangan di-skip -> lanjut proses di bawah
    }

    const uuid = cleanUuid(trimmed);
    if (!UUID_REGEX.test(uuid)) {
      skipped++;
      continue;
    }

    totalUuid++;

    const nActivities = randomInt(MIN_ACTIVITIES, MAX_ACTIVITIES);
    for (let k = 0; k < nActivities; k++) {
      placeholders.push('(?, ?, ?, ?)');
      params.push(uuid, pickActivityType(), PORTAL_ID, randomCreatedAt());
      totalActivities++;

      // flush kalau sudah cukup besar (hitung berdasarkan jumlah baris)
      if (placeholders.length >= BATCH_SIZE) {
        await flushBatch();
      }
    }

    if (totalUuid % PROGRESS_EVERY === 0) {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(
        `[progress] uuid=${totalUuid.toLocaleString()} activities=${totalActivities.toLocaleString()} elapsed=${elapsed}s`
      );
    }
  }

  // flush sisa
  await flushBatch();

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log('\n========== SUMMARY ==========');
  console.log(`Total UUID diproses   : ${totalUuid.toLocaleString()}`);
  console.log(`Total activities insert: ${totalActivities.toLocaleString()}`);
  console.log(`UUID skipped (invalid) : ${skipped.toLocaleString()}`);
  console.log(`Waktu                  : ${elapsed}s`);

  await connection.end();
  console.log('Database connection closed');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
