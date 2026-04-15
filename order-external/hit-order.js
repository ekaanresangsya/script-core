const fs = require('fs');
const crypto = require('crypto');

const API_URL = 'https://core-middleware.idn.media/api/v1/pay-in/external-transaction'; // change this to the actual API endpoint
// const CLIENT_ID = 'external-test-123'; // change this to the actual client ID
// const CLIENT_SECRET = 'Extern4lT3st123!'; // change this to the actual client secret
const CLIENT_ID = 'fnb-hv3cy7'; // change this to the actual client ID
const CLIENT_SECRET = 'Lp[6k1phO{AKFwPg'; // change this to the actual client secret

function generateVerifyKey(payload) {
    const compactJsonBody = JSON.stringify(payload);
    const data = compactJsonBody + CLIENT_SECRET;
    return crypto.createHash('sha256').update(data).digest('hex');
}

async function main() {
    const n = 5000; // change this to the number of requests you want to send
    const results = [];

    console.log(`Starting ${n} requests to ${API_URL}...`);

    const sku = 'SUBS-OVRXDGSVFEFG' // change this to the actual SKU

    const userIdentity = 'developer@idntimes.com'

    for (let i = 1; i <= n; i++) {
        const timestamp = Date.now();
        const uuid = crypto.randomUUID().toString();
        const transactionID = `order-developer-${timestamp}-${uuid}`;

        const payload = {
            "user_identity": userIdentity,
            "sku": sku,
            "transaction_id": transactionID
        };

        const verifyKey = generateVerifyKey(payload);

        console.log(`Sending request ${i}/${n}...`);
        console.log(`Transaction ID: ${transactionID}`);

        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    'X-Api-Key': '6bb2976e-6eef-46e2-814d-1d622a890540', // change this to the actual API key
                    'Client-Id': CLIENT_ID,
                    'Verify-Key': verifyKey
                },
                body: JSON.stringify(payload)
            });

            const data = await response.json().catch(err => ({ error: 'Invalid JSON response', raw: err.message }));

            const result = {
                requestID: i,
                payload: payload,
                verifyKeyGenerated: verifyKey,
                status: response.status,
                response: data,
                timestamp: new Date().toISOString()
            };

            results.push(result);
            console.log(`Status: ${response.status}`);
            console.log(`Response:`, data);
        } catch (error) {
            console.error(`Request ${i} failed:`, error.message);
            results.push({
                requestID: i,
                payload: payload,
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    }

    const dateNow = Date.now();
    const filename = `result-${dateNow}-${n}.json`;
    fs.writeFileSync(filename, JSON.stringify(results, null, 2));
    console.log(`Results saved to ${filename}`);
}

main();
