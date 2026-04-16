const fs = require('fs');
const crypto = require('crypto');

// const API_URL = 'https://core-middleware.idn.media/api/v1/pay-in/external-transaction'; // change this to the actual API endpoint
// const API_KEY = '6bb2976e-6eef-46e2-814d-1d622a890540'; // change this to the actual API key
// const CLIENT_ID = 'fnb-hv3cy7'; // change this to the actual client ID
// const CLIENT_SECRET = 'Lp[6k1phO{AKFwPg'; // change this to the actual client secret
// const PACKAGE_SKU = 'SUBS-OVRXDGSVFEFG' // change this to the actual SKU
// const PURCHASE_LIMIT = 0; // change this to the number of purchases you want to simulate

const API_URL = 'https://core-middleware.sateklopo.com/api/v1/pay-in/external-transaction'; // change this to the actual API endpoint
const API_KEY = '6bb2976e-6eef-46e2-814d-1d622a890540'; // change this to the actual API key
const CLIENT_ID = 'vocagame-rc9mr'; // change this to the actual client ID
const CLIENT_SECRET = 'iLK)jgNE?Z:8c8eH'; // change this to the actual client secret
const PACKAGE_SKU = 'SUBS-VZIFOBMJTVYE' // change this to the actual SKU
const PURCHASE_LIMIT = 1; // change this to the number of purchases you want to simulate

function generateVerifyKey(payload) {
    const compactJsonBody = JSON.stringify(payload);
    const data = compactJsonBody + CLIENT_SECRET;
    return crypto.createHash('sha256').update(data).digest('hex');
}

async function main() {
    const n = PURCHASE_LIMIT;
    const results = [];

    console.log(`Starting ${n} requests to ${API_URL}...`);

    const userIdentity = 'developer@idntimes.com'

    for (let i = 1; i <= n; i++) {
        const timestamp = Date.now();
        const uuid = crypto.randomUUID().toString();
        const transactionID = `order-developer-${timestamp}-${uuid}`;

        const payload = {
            "user_identity": userIdentity,
            "sku": PACKAGE_SKU,
            "transaction_id": transactionID
        };

        const verifyKey = generateVerifyKey(payload);

        console.log(`Sending request ${i}/${n}...`);
        console.log(`Transaction ID: ${transactionID}`);

        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: {
                    'X-Api-Key': API_KEY,
                    'Client-Id': CLIENT_ID,
                    'Verify-Key': verifyKey,
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
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

        // Add delay between requests to avoid rate limiting, except after the last request
        if (i < n) {
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }

    const dateNow = Date.now();
    const filename = `result-${dateNow}-${n}.json`;
    fs.writeFileSync(filename, JSON.stringify(results, null, 2));
    console.log(`Results saved to ${filename}`);
}

main();
