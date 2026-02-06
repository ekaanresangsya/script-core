# Custom Script Core

A collection of testing scripts for the Core Middleware API, designed for stress testing and validating external transaction endpoints.

## Description

This project provides automated testing tools to perform multiple concurrent requests to the Core Middleware pay-in API. The primary use case is to test the reliability, performance, and consistency of the external transaction endpoint under load.

The main script generates unique transaction IDs, creates cryptographic verify keys using SHA-256 hashing, and logs detailed results of each API call for analysis.

## Features

- **Automated Stress Testing**: Send multiple requests (configurable count) to test API performance
- **Security Verification**: Generate SHA-256 verify keys for request authentication
- **Detailed Logging**: Captures request/response data, status codes, and timestamps
- **Result Persistence**: Saves all test results to JSON files for later analysis
- **UUID-based Transactions**: Each request uses a unique transaction ID to prevent collisions

## Prerequisites

- **Node.js**: Version 14.x or higher (uses native `crypto` and `fetch` APIs)
- **Valid API Credentials**: Client ID and Client Secret from the middleware provider
- **Network Access**: Ability to reach `https://core-middleware.sateklopo.com`

## Installation & Setup

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd custom-script-core
   ```

2. **No dependencies to install**: This project uses only Node.js built-in modules (`fs`, `crypto`)

3. **Configure credentials**: Edit the script with your API credentials (see Configuration section)

## Configuration

Before running the scripts, you must configure the following variables in [order-external/hit-order.js](order-external/hit-order.js):

```javascript
const CLIENT_ID = 'client-id';        // Your client ID
const CLIENT_SECRET = 'client-secret'; // Your client secret (REQUIRED)
const API_URL = 'https://core-middleware.sateklopo.com/api/v1/pay-in/external-transaction';
```

### Test Parameters

You can also customize the test parameters:

- **`n`**: Number of requests to send (default: 50)
- **`sku`**: Product SKU to test (e.g., `'SUBS-ABCDEF12345'`)
- **`userIdentity`**: User email for testing (e.g., `'developer@idntimes.com'`)

## How to Run Locally

### Running the Order External Script

1. Navigate to the order-external directory:
   ```bash
   cd order-external
   ```

2. Run the script:
   ```bash
   node hit-order.js
   ```

3. Monitor the console output for real-time progress:
   ```
   Starting 50 requests to https://core-middleware.sateklopo.com/...
   Sending request 1/50...
   Transaction ID: order-developer-test-1770363753659-aa07751b-...
   Status: 202
   Response: { status: 202, data: { ... } }
   ```

4. Results will be saved to a timestamped JSON file in the project root:
   ```
   Results saved to result-1770363788742.json
   ```

## Directory Structure

```
custom-script-core/
├── README.md                      # This file - main project documentation
├── .gitignore                     # Git ignore rules (excludes result files)
├── order-external/                # Order external transaction testing
│   ├── hit-order.js              # Main stress test script
│   └── README.md                 # Script-specific documentation (Indonesian)
└── result-*.json                 # Test result files (git-ignored)
```

### Key Files

- **[order-external/hit-order.js](order-external/hit-order.js)**: Main testing script that sends multiple API requests
- **result-{timestamp}.json**: Generated output files containing detailed test results

## Output Format

Each test run generates a JSON file with the following structure:

```json
[
  {
    "requestID": 1,
    "payload": {
      "user_identity": "developer@idntimes.com",
      "sku": "SUBS-ABCDEF12345",
      "transaction_id": "order-developer-test-..."
    },
    "verifyKeyGenerated": "4bf25738d7396e62f277c50c601d61e02cc81047...",
    "status": 202,
    "response": {
      "status": 202,
      "data": {
        "order_id": "SAWE-...",
        "transaction_id": "order-developer-test-...",
        "partner_id": "client-id",
        "product": { ... },
        "status": "pending",
        "created_at": 1770363754026
      }
    },
    "timestamp": "2026-02-06T07:42:39.859Z"
  }
]
```

### Result Fields

- **requestID**: Sequential request number (1 to n)
- **payload**: The data sent in the API request
- **verifyKeyGenerated**: SHA-256 hash used for request verification
- **status**: HTTP status code from the API response
- **response**: Complete API response body
- **timestamp**: ISO 8601 timestamp of when the request completed

## Security Considerations

⚠️ **Important Security Notes**:

1. **Never commit credentials**: The `.gitignore` file is configured to ignore `.env` files
2. **Rotate secrets regularly**: Change `CLIENT_SECRET` periodically
3. **Verify key generation**: The script uses SHA-256 hashing with the format: `JSON.stringify(payload) + CLIENT_SECRET`
4. **HTTPS only**: All API calls use encrypted HTTPS connections
5. **Result files contain sensitive data**: Keep `result-*.json` files secure and don't expose them publicly

## API Details

### Endpoint
```
POST https://core-middleware.sateklopo.com/api/v1/pay-in/external-transaction
```

### Headers
- **Accept**: `application/json`
- **Content-Type**: `application/json`
- **X-Api-Key**: API key for authentication
- **Client-Id**: Your client identifier
- **Verify-Key**: SHA-256 hash of payload + client secret

### Payload Structure
```json
{
  "user_identity": "email@example.com",
  "sku": "PRODUCT-SKU-CODE",
  "transaction_id": "unique-transaction-identifier"
}
```

## Troubleshooting

### Common Issues

**"Invalid JSON response" error**:
- Check if the API endpoint is accessible
- Verify your network connection
- Ensure the API is not rate-limiting your requests

**"Verify Key" authentication failure**:
- Confirm `CLIENT_SECRET` is correctly set
- Ensure payload JSON is compact (no extra spaces)
- Check that the secret hasn't been rotated

**Script doesn't start**:
- Verify Node.js version: `node --version` (requires v14+)
- Check file permissions: `chmod +x order-external/hit-order.js`

## Contributing

When adding new test scripts:
1. Create a descriptive directory name (e.g., `order-external`)
2. Include a script-specific README.md with configuration details
3. Update this main README with the new script information
4. Ensure result files follow the `result-*.json` naming convention

## License

Internal use only - Core Team

## Contact & Support

For questions or issues related to this testing suite, contact the Core Team development group.

---

**Last Updated**: February 6, 2026
