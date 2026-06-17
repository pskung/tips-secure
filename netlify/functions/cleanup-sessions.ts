import type { Config, Context } from "@netlify/functions";
import * as blobs from "@netlify/blobs";

const getStore = (blobs as any).getStore;

export default async (req: Request, context: Context) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] Starting monthly transaction storage cleanup...`);

  try {
    const store = getStore("donation_store");
    let logChecked = 0;
    let logDeleted = 0;
    const now = Date.now();
    const thirtyDaysAgo = now - 1000 * 60 * 60 * 24 * 30; // 30 วัน

    const deletePromises: Promise<any>[] = [];
    const deleteLimit = 50;

    // ล้างประวัติธุรกรรมโดเนทที่เก่าเกิน 30 วันเท่านั้น (ไม่มีคิวเซสชันของแอดมินมาเกะกะระบบอีกต่อไปค่ะ)
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

            if (!isNaN(txTimestamp) && txTimestamp < thirtyDaysAgo) {
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
      `[${timestamp}] Cleanup completed. Checked ${logChecked}, Deleted ${logDeleted}`,
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
  schedule: "0 0 1 * *",
};
