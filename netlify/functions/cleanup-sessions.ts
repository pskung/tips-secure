import type { Config, Context } from "@netlify/functions";
import * as blobs from "@netlify/blobs";

const getStore = (blobs as any).getStore;

export default async (req: Request, context: Context) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] Starting monthly admin session cleanup...`);

  try {
    const store = getStore("donation_store");
    let checkedCount = 0;
    let deletedCount = 0;

    // ใช้ระบบ Native Pagination ด้วยโครงสร้างวนลูปแบบ Async Iterator (for await) บน Nitro Runtime
    for await (const entry of store.list({ prefix: "session:", paginate: true })) {
      for (const blob of entry.blobs) {
        checkedCount++;
        const sessionKey = blob.key;

        try {
          const sessionData = await store.get(sessionKey, { type: "json" }) as { expiresAt: number } | null;

          if (!sessionData || !sessionData.expiresAt || Date.now() > sessionData.expiresAt) {
            await store.delete(sessionKey);
            deletedCount++;
          }
        } catch (innerError) {
          console.error(`Failed to process session key: ${sessionKey}`, innerError);
        }
      }
    }

    console.log(`[${timestamp}] Cleanup completed. Checked: ${checkedCount}, Deleted Expired: ${deletedCount}`);

    return new Response(JSON.stringify({
      success: true,
      checked: checkedCount,
      deleted: deletedCount
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error(`[${timestamp}] Critical failure during session cleanup`, error);
    return new Response(JSON.stringify({ error: "Internal processing failure" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
};

export const config: Config = {
  schedule: "0 0 1 * *",
};