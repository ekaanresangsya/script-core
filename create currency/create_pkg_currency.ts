import fs from "fs";
import path from "path";

const API_URL = "https://package-api.idn.media/api/v1/package/currencies";
const HEADERS = {
  "x-api-key": "b775ff71-0c4f-43c1-884c-0b5d4df48144",
  // uuid: "a943172e-1d37-4ded-8499-4b2f24286f26",
  uuid: "96a7bf7e-33d7-485f-95c6-9031bd1eb5d2",
  "Content-Type": "application/json",
};

interface CurrencyData {
  amount: number;
  original_price: number;
  price: number;
}

interface ApiResponse {
  status: number;
  data: any;
}

function parseDataFile(filePath: string): CurrencyData[] {
  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.trim().split("\n");

  const dataLines = lines.filter(
    (line) =>
      line.includes("|") &&
      !line.includes("+") &&
      !line.includes("amount") &&
      !line.includes("original_price")
  );

  return dataLines.map((line) => {
    const cols = line
      .split("|")
      .map((col) => col.trim())
      .filter((col) => col !== "");

    return {
      amount: parseInt(cols[0]),
      original_price: parseInt(cols[1]),
      price: parseInt(cols[2]),
    };
  });
}

async function createCurrency(data: CurrencyData): Promise<ApiResponse> {
  const body = {
    name: `${data.amount} Gold`,
    amount: data.amount,
    currency_code: "GOLD",
    original_price: data.original_price,
    price: data.price,
    price_currency_code: "IDR",
    product_id: "",
    status: "active",
    is_active: true,
    portal: "idn-games",
    // platform_id: [
    //   "b8325c43-1a0e-11ee-afbf-00155d9dddcf",
    //   "b83256ac-1a0e-11ee-afbf-00155d9dddcf",
    // ],
  };

  const response = await fetch(API_URL, {
    method: "POST",
    headers: HEADERS,
    body: JSON.stringify(body),
  });

  const responseData = await response.json();
  return {
    status: response.status,
    data: responseData,
  };
}

async function main() {
  const dataFilePath = path.resolve(__dirname, "data");
  const logFilePath = path.resolve(
    __dirname,
    `result-${Date.now()}.json`
  );

  const currencies = parseDataFile(dataFilePath);
  console.log(`Found ${currencies.length} currencies to create\n`);

  const results: { input: CurrencyData; response: ApiResponse }[] = [];

  for (const currency of currencies) {
    console.log(`Creating currency: ${currency.amount} Gold...`);

    try {
      const response = await createCurrency(currency);
      results.push({ input: currency, response });

      console.log(
        `  -> Status: ${response.status} | ${JSON.stringify(response.data)}\n`
      );
    } catch (error: any) {
      const errorResult = {
        input: currency,
        response: { status: 0, data: { error: error.message } },
      };
      results.push(errorResult);
      console.error(`  -> Error: ${error.message}\n`);
    }

    // delay 500ms between requests
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  // save log
  const logData = {
    timestamp: new Date().toISOString(),
    total: currencies.length,
    results,
  };

  fs.writeFileSync(logFilePath, JSON.stringify(logData, null, 2));
  console.log(`\nLog saved to: ${logFilePath}`);
}

main();
