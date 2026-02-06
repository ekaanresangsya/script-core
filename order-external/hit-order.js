const fs = require('fs');
const crypto = require('crypto');

const API_URL = 'https://core-middleware.idn.media/api/v1/pay-in/external-transaction';
const CLIENT_ID = 'idn-app-5Feb2026'; // from curl
const CLIENT_SECRET = 'idn-app-5Feb2026'; // User needs to fill this

function generateVerifyKey(payload) {
    const compactJsonBody = JSON.stringify(payload);
    const data = compactJsonBody + CLIENT_SECRET;
    return crypto.createHash('sha256').update(data).digest('hex');
}

async function main() {
    const n = 99;
    const results = [];

    console.log(`Starting ${n} requests to ${API_URL}...`);

    const user_identity = 'developer@idntimes.com'
    const sku = 'SUBS-VLPLNMTFPTTB'

    for (let i = 0; i < n; i++) {
        const timestamp = Date.now();
        const transaction_id = `order-developer-test-${timestamp}`;

        const payload = {
            "user_identity": user_identity,
            "sku": sku,
            "transaction_id": transaction_id
        };

        const verify_key = generateVerifyKey(payload);

        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'accept': 'application/json',
                    'x-api-key': '6bb2976e-6eef-46e2-814d-1d622a890540',
                    'Client-Id': CLIENT_ID,
                    'Verify-Key': verify_key
                },
                body: JSON.stringify(payload)
            });

            const data = await response.json().catch(err => ({ error: 'Invalid JSON response', raw: err.message }));

            const result = {
                request_index: i + 1,
                payload: payload,
                verify_key_generated: verify_key,
                status: response.status,
                response: data,
                timestamp: new Date().toISOString()
            };

            results.push(result);
            console.log(`Request ${i + 1}/${n}: Status ${response.status}`);

        } catch (error) {
            console.error(`Request ${i + 1} failed:`, error.message);
            results.push({
                request_index: i + 1,
                payload: payload,
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    }

    const filename = `result-${Date.now()}.json`;
    fs.writeFileSync(filename, JSON.stringify(results, null, 2));
    console.log(`Results saved to ${filename}`);
}

main();
