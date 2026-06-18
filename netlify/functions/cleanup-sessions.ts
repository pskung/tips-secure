import type { Config, Context } from "@netlify/functions";
import { getStore } from "@netlify/blobs";

export default async (req: Request, context: Context) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] Starting weekly transaction storage cleanup...`);

  try {
    const store = getStore("donation_store");
    let logChecked = 0;
    let logDeleted = 0;
    const now = Date.now();

    // 🟢 ปรับเปลี่ยนระยะเวลาหมดอายุประวัติธุรกรรมเหลือ 7 วัน ตามข้อตกลงนโยบาย
    const sevenDaysAgo = now - 1000 * 60 * 60 * 24 * 7;

    const deletePromises: Promise<any>[] = [];
    const deleteLimit = 50;

    for await (const entry of store.list({
      prefix: "tx_log:",
      paginate: true,
    })) {
      for (const blob of entry.blobs) {
        logChecked++;
        const logKey = blob.key;
        try {
          const parts = logKey.split(":");
          if (parts.length === 3) {
            const txTimestamp = Number(parts[1]);
            const transactionId = parts[2];

            if (!isNaN(txTimestamp) && txTimestamp < sevenDaysAgo) {
              deletePromises.push(
                (async () => {
                  await store.delete(`processed_tx:${transactionId}`);
                  await store.delete(logKey);
                  logDeleted++;
                })(),
              );

              if (deletePromises.length >= deleteLimit) {
                await Promise.all(deletePromises);
                deletePromises.length = 0;
              }
            }
          }
        } catch (innerError) {
          console.error(
            `Error queuing deletion for log key: ${logKey}`,
            innerError,
          );
        }
      }
    }

    if (deletePromises.length > 0) {
      await Promise.all(deletePromises);
    }

    console.log(
      `[${timestamp}] Weekly Cleanup completed. Checked ${logChecked}, Deleted ${logDeleted}`,
    );

    return new Response(
      JSON.stringify({
        success: true,
        transactions: { checked: logChecked, deleted: logDeleted },
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error(`[${timestamp}] Critical failure during cleanup`, error);
    return new Response(JSON.stringify({ error: "Failed" }), { status: 500 });
  }
};

export const config: Config = {
  // 🟢 ปรับแต่งเวลารันรายสัปดาห์ (รันอัตโนมัติเวลาเที่ยงคืนของทุกวันอาทิตย์)
  schedule: "0 0 * * 0",
};
