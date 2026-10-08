const fs = require('fs');

const API_URL = 'https://core-middleware.sateklopo.com/api/v1/point/total-point';
const API_KEY = '6bb2976e-6eef-46e2-814d-1d622a890540';
const USERS_FILE = './users.json';
const LOG_FILE = './total-point-log.json';
const DELAY_MS = 10;

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

    for (let i = 0; i < remainingUsers.length; i++) {
        const user = remainingUsers[i];
        const progress = `[${processedUuids.size + i + 1}/${users.length}]`;

        console.log(`${progress} Hitting total-point for: ${user.user_identity} (${user.uuid})`);

        try {
            const response = await fetch(API_URL, {
                method: 'GET',
                headers: {
                    'x-api-key': API_KEY,
                    'uuid': user.uuid
                }
            });

            const data = await response.json();

            const entry = {
                uuid: user.uuid,
                email: user.user_identity,
                status: response.status,
                response: data,
                success: true,
                timestamp: new Date().toISOString()
            };

            log.push(entry);
            fs.writeFileSync(LOG_FILE, JSON.stringify(log, null, 2));
            console.log(`  ✓ Status: ${response.status}`, JSON.stringify(data));
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

        // Delay between requests
        if (i < remainingUsers.length - 1) {
            await new Promise(resolve => setTimeout(resolve, DELAY_MS));
        }
    }

    const successCount = log.filter(l => l.success).length;
    const failCount = log.filter(l => !l.success).length;

    console.log(`---`);
    console.log(`Done! Success: ${successCount}, Failed: ${failCount}`);
}

main();
