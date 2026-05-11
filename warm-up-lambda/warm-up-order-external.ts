const getTimeString = () => {
    return new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Jakarta' });
};

const hitApi = async () => {
    const url = 'https://external-api.idn.media/api/v1/order/telkomsel';
    const headers = {
        'Content-Type': 'application/json',
        'Authorization': 'Basic aWRuOmlEbl90IW1lNQ=='
    };
    const payload = {
        "message_id": "test-sangsya-003",
        "mo_request": {
            "incoming_message_id": "test-sangsya-inc-003",
            "trx_id": "test-sangsya-trx-003",
            "adn": "98888",
            "sender_msisdn": "6285736404913",
            "mo_content": "IDNGOLD6",
            "dcs": "08",
            "http_segment_number": "1",
            "http_segment_count": "1"
        }
    };

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(payload)
        });

        // We try to parse as JSON first, but if it fails we will get text
        const text = await response.text();
        let responseData;
        try {
            responseData = JSON.parse(text);
        } catch (e) {
            responseData = text;
        }

        console.log(`[${getTimeString()}] Status: ${response.status} | Response:`, responseData);
    } catch (error) {
        console.error(`[${getTimeString()}] Error hitting API:`, error);
    }
};

console.log(`[${getTimeString()}] Starting API warm-up script. Hitting every 1 minute...`);

// Hit immediately once
hitApi();

// Then every 1 minute (60 * 1000 ms)
setInterval(hitApi, 60000);
