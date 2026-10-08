const fs = require('fs');
const { execSync } = require('child_process');

const API_URL = 'http://localhost:3002/api/v1/user/cognito';
const EMAILS_FILE = './emails.txt';
const OUTPUT_FILE = './users.json';
const DELAY_MS = 1; // delay between requests to avoid rate limiting

// Cognito config
const USER_POOL_ID = 'ap-southeast-1_Cnoxh8PeS';
const PASSWORD = 'Idntimes1234!';

async function setPassword(email) {
    const command = `aws cognito-idp admin-set-user-password --user-pool-id ${USER_POOL_ID} --username "${email}" --password "${PASSWORD}" --permanent`;
    execSync(command, { stdio: 'pipe' });
}

async function main() {
    // Read emails from file
    const emailsRaw = fs.readFileSync(EMAILS_FILE, 'utf-8');
    const emails = emailsRaw.split('\n').filter(email => email.trim() !== '');

    // Load existing results if file exists (to resume if interrupted)
    let users = [];
    if (fs.existsSync(OUTPUT_FILE)) {
        try {
            users = JSON.parse(fs.readFileSync(OUTPUT_FILE, 'utf-8'));
            console.log(`Resuming from existing ${OUTPUT_FILE} with ${users.length} entries`);
        } catch (e) {
            console.log('Could not parse existing users.json, starting fresh');
            users = [];
        }
    }

    // Skip emails that have already been processed
    const processedEmails = new Set(users.map(u => u.user_identity));
    const remainingEmails = emails.filter(email => !processedEmails.has(email));

    console.log(`Total emails: ${emails.length}`);
    console.log(`Already processed: ${processedEmails.size}`);
    console.log(`Remaining: ${remainingEmails.length}`);
    console.log(`---`);

    for (let i = 0; i < remainingEmails.length; i++) {
        const email = remainingEmails[i];
        const progress = `[${processedEmails.size + i + 1}/${emails.length}]`;

        console.log(`${progress} Hitting API for: ${email}`);

        try {
            // Step 1: Hit cognito API
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ user_identity: email })
            });

            const data = await response.json();

            if (data.status === 200 && data.data && data.data.uuid) {
                console.log(`  ✓ uuid: ${data.data.uuid}`);

                // Step 2: Set password in Cognito
                try {
                    setPassword(email);
                    console.log(`  ✓ Password set successfully`);
                } catch (pwError) {
                    console.error(`  ✗ Failed to set password: ${pwError.message}`);
                }

                const entry = {
                    uuid: data.data.uuid,
                    user_identity: data.data.user_identity || email
                };

                users.push(entry);

                // Save immediately after each successful request
                fs.writeFileSync(OUTPUT_FILE, JSON.stringify(users, null, 2));
            } else {
                console.error(`  ✗ Unexpected response:`, JSON.stringify(data));
            }
        } catch (error) {
            console.error(`  ✗ Error for ${email}:`, error.message);
        }

        // Delay between requests
        if (i < remainingEmails.length - 1) {
            await new Promise(resolve => setTimeout(resolve, DELAY_MS));
        }
    }

    console.log(`---`);
    console.log(`Done! Total users saved: ${users.length}`);
}

main();
