const fs = require('fs');
const mysql = require('mysql2/promise');

const USERS_FILE = './users.json';
const LOG_FILE = './update-profile-log.json';

const DB_CONFIG = {
    host: 'account-master-statefulstackrd-rdsdatabase74c89a2a-6hxvnixkbjzg.cluster-cb4u2f58wgrm.ap-southeast-1.rds.amazonaws.com',       // change this
    port: 3306,              // change this
    user: 'idnadmin',           // change this
    password: 'mDJQ,fk-280,5GJ-42AqV6IFFi4x_f',           // change this
    database: 'idn_account'
};

function extractNumberFromEmail(email) {
    // extract number from "user301@joni.com" -> "301"
    const match = email.match(/user(\d+)@/);
    return match ? match[1] : null;
}

async function main() {
    // Load users
    const users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf-8'));
    console.log(`Loaded ${users.length} users from ${USERS_FILE}`);

    // Load existing log if file exists (to resume if interrupted)
    let log = [];
    if (fs.existsSync(LOG_FILE)) {
        try {
            log = JSON.parse(fs.readFileSync(LOG_FILE, 'utf-8'));
            console.log(`Resuming from existing ${LOG_FILE} with ${log.length} entries`);
        } catch (e) {
            console.log('Could not parse existing log file, starting fresh');
            log = [];
        }
    }

    // Skip users that have already been processed
    const processedUuids = new Set(log.filter(l => l.success).map(l => l.uuid));
    const remainingUsers = users.filter(u => !processedUuids.has(u.uuid));

    console.log(`Already processed: ${processedUuids.size}`);
    console.log(`Remaining: ${remainingUsers.length}`);
    console.log(`---`);

    // Connect to database
    const connection = await mysql.createConnection(DB_CONFIG);
    console.log('Connected to database');

    for (let i = 0; i < remainingUsers.length; i++) {
        const user = remainingUsers[i];
        const number = extractNumberFromEmail(user.user_identity);
        const progress = `[${processedUuids.size + i + 1}/${users.length}]`;

        if (!number) {
            console.error(`${progress} ✗ Could not extract number from: ${user.user_identity}`);
            log.push({ uuid: user.uuid, email: user.user_identity, success: false, error: 'Could not extract number', timestamp: new Date().toISOString() });
            fs.writeFileSync(LOG_FILE, JSON.stringify(log, null, 2));
            continue;
        }

        const phoneNumber = `810000000${number}`;
        const firstName = 'User';
        const lastName = number;

        console.log(`${progress} Updating: ${user.user_identity} (uuid: ${user.uuid})`);

        try {
            const query = `
                UPDATE idn_account.authenticates a
                JOIN idn_account.authenticate_profile ap ON a.id = ap.authenticate_id
                SET a.country_phone_code_id = 96,
                    a.phone_number = ?,
                    a.is_phone_valid = 1,
                    ap.first_name = ?,
                    ap.last_name = ?,
                    ap.biodata_description = "ini bio",
                    ap.avatar = "idnaccount/avatar/500/38468902adf90fdc8f33f06d265039b9.webp",
                    ap.gender = "laki-laki",
                    ap.city_id = 40475,
                    ap.birthdate = "1965-01-01"
                WHERE a.uuid = ?
            `;

            const [result] = await connection.execute(query, [phoneNumber, firstName, lastName, user.uuid]);

            // Insert pin
            let pinInserted = false;
            try {
                const pinQuery = `
                    INSERT INTO idn_reward.redeem_authentications(uuid, pin)
                    VALUES(?, '$argon2id$v=19$m=8192,t=2,p=4$hYKh/yiGeeasjXAWWPjhcw$BevCNTmot1nrTT+aAvAqXpcHrxZFQt3VdwUMgcq9F0w')
                `;
                await connection.execute(pinQuery, [user.uuid]);
                pinInserted = true;
                console.log(`  ✓ Pin inserted`);
            } catch (pinError) {
                if (pinError.message.includes('Duplicate') || pinError.message.includes('already exists')) {
                    console.log(`  - Pin already exists, skipped`);
                    pinInserted = true; // consider it success
                } else {
                    console.error(`  ✗ Pin insert error: ${pinError.message}`);
                }
            }

            const entry = {
                uuid: user.uuid,
                email: user.user_identity,
                phoneNumber,
                firstName,
                lastName,
                affectedRows: result.affectedRows,
                pinInserted,
                success: true,
                timestamp: new Date().toISOString()
            };

            log.push(entry);
            fs.writeFileSync(LOG_FILE, JSON.stringify(log, null, 2));
            console.log(`  ✓ Updated (affected rows: ${result.affectedRows})`);
        } catch (error) {
            const entry = {
                uuid: user.uuid,
                email: user.user_identity,
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            };

            log.push(entry);
            fs.writeFileSync(LOG_FILE, JSON.stringify(log, null, 2));
            console.error(`  ✗ Error: ${error.message}`);
        }
    }

    await connection.end();

    const successCount = log.filter(l => l.success).length;
    const failCount = log.filter(l => !l.success).length;

    console.log(`---`);
    console.log(`Done! Success: ${successCount}, Failed: ${failCount}`);
}

main();
