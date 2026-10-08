import {
  DynamoDBClient,
  ScanCommand,
  ScanCommandOutput,
} from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  BatchWriteCommand,
} from "@aws-sdk/lib-dynamodb";
import { unmarshall } from "@aws-sdk/util-dynamodb";

// ============ CONFIGURATION ============
const TABLE_NAME = "user_login_devices"; // <-- ganti dengan nama table
const REGION = "ap-southeast-1";
// Partition key & sort key (sesuaikan dengan table kamu)
const PARTITION_KEY = "uuid"; // <-- ganti dengan nama partition key
const SORT_KEY = ""; // <-- ganti dengan nama sort key (kosongkan jika tidak ada)
// =======================================

const client = new DynamoDBClient({ region: REGION });
const docClient = DynamoDBDocumentClient.from(client);

async function scanAllItems(): Promise<Record<string, any>[]> {
  const items: Record<string, any>[] = [];
  let lastEvaluatedKey: Record<string, any> | undefined;

  do {
    const command = new ScanCommand({
      TableName: TABLE_NAME,
      ExclusiveStartKey: lastEvaluatedKey,
    });

    const response: ScanCommandOutput = await client.send(command);

    if (response.Items) {
      for (const item of response.Items) {
        items.push(unmarshall(item));
      }
    }

    lastEvaluatedKey = response.LastEvaluatedKey;
  } while (lastEvaluatedKey);

  return items;
}

async function deleteItems(items: Record<string, any>[]): Promise<number> {
  let deletedCount = 0;

  // BatchWrite supports max 25 items per request
  const batchSize = 25;

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);

    const deleteRequests = batch.map((item) => {
      const key: Record<string, any> = {
        [PARTITION_KEY]: item[PARTITION_KEY],
      };

      if (SORT_KEY && item[SORT_KEY] !== undefined) {
        key[SORT_KEY] = item[SORT_KEY];
      }

      return {
        DeleteRequest: { Key: key },
      };
    });

    const command = new BatchWriteCommand({
      RequestItems: {
        [TABLE_NAME]: deleteRequests,
      },
    });

    try {
      const response = await docClient.send(command);

      // Handle unprocessed items (retry)
      let unprocessed = response.UnprocessedItems?.[TABLE_NAME];
      let retryCount = 0;

      while (unprocessed && unprocessed.length > 0 && retryCount < 5) {
        retryCount++;
        console.log(
          `  Retrying ${unprocessed.length} unprocessed items (attempt ${retryCount})...`
        );

        // Exponential backoff
        await new Promise((resolve) =>
          setTimeout(resolve, Math.pow(2, retryCount) * 100)
        );

        const retryCommand = new BatchWriteCommand({
          RequestItems: {
            [TABLE_NAME]: unprocessed,
          },
        });

        const retryResponse = await docClient.send(retryCommand);
        unprocessed = retryResponse.UnprocessedItems?.[TABLE_NAME];
      }

      deletedCount += batch.length;
      console.log(
        `  Deleted batch ${Math.floor(i / batchSize) + 1} (${deletedCount}/${items.length} items)`
      );
    } catch (error: any) {
      console.error(
        `  Error deleting batch at index ${i}: ${error.message}`
      );
    }

    // Small delay to avoid throttling
    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  return deletedCount;
}

async function main() {
  console.log(`=== Delete All Data from DynamoDB Table ===`);
  console.log(`Table: ${TABLE_NAME}`);
  console.log(`Region: ${REGION}`);
  console.log(`Partition Key: ${PARTITION_KEY}`);
  console.log(`Sort Key: ${SORT_KEY || "(none)"}`);
  console.log(`============================================\n`);

  console.log("Scanning all items...");
  const items = await scanAllItems();
  console.log(`Found ${items.length} items to delete.\n`);

  if (items.length === 0) {
    console.log("Table is already empty. Nothing to delete.");
    return;
  }

  console.log("Deleting items...");
  const deletedCount = await deleteItems(items);

  console.log(`\nDone! Successfully deleted ${deletedCount}/${items.length} items.`);
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
