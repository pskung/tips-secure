import { APIEvent } from "@solidjs/start/server";
import { safeLog } from "~/lib/utils/logger";
import { timingSafeCompare } from "~/lib/utils/crypto";

export async function POST(event: APIEvent) {
  const timestamp = new Date().toISOString();
  try {
    const cloudflare = event.nativeEvent.context.cloudflare;
    const env = cloudflare.env;
    const store = env.DONATION_STORE;

    const authHeader = event.request.headers.get("Authorization");
    const expectedSecret = env.CRON_SECRET;

    if (
      !expectedSecret ||
      !authHeader ||
      !timingSafeCompare(authHeader, `Bearer ${expectedSecret}`)
    ) {
      return new Response(
        JSON.stringify({ error: "Unauthorized cron trigger" }),
        { status: 401 },
      );
    }

    let logChecked = 0;
    let logDeleted = 0;
    const now = Date.now();
    const sevenDaysAgo = now - 1000 * 60 * 60 * 24 * 7;

    // [โยกย้าย]: ใช้ API ค้นหากลุ่มคีย์ที่มี prefix เป็น "tx_log:" ใน Cloudflare KV
    const listResult = await store.list({ prefix: "tx_log:" });

    for (const key of listResult.keys) {
      logChecked++;
      const logKey = key.name;
      try {
        const parts = logKey.split(":");
        if (parts.length === 3) {
          const txTimestamp = Number(parts[1]);
          const transactionId = parts[2];

          if (!isNaN(txTimestamp) && txTimestamp < sevenDaysAgo) {
            // ทำการลบประวัติและล็อกธุรกรรมใน Cloudflare KV
            await store.delete(`processed_tx:${transactionId}`);
            await store.delete(logKey);
            logDeleted++;
          }
        }
      } catch (innerError) {
        safeLog(`Error deleting KV key: ${logKey}`, "WARN", innerError);
      }
    }

    safeLog(
      `Weekly Cleanup completed. Checked ${logChecked}, Deleted ${logDeleted}`,
      "INFO",
    );
    return new Response(
      JSON.stringify({
        success: true,
        checked: logChecked,
        deleted: logDeleted,
      }),
      { status: 200 },
    );
  } catch (error) {
    safeLog("Critical failure during weekly cleanup", "ERROR", error);
    return new Response(JSON.stringify({ error: "Failed" }), { status: 500 });
  }
}
