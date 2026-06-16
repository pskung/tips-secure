import type { Config, Context } from "@netlify/functions";
import * as blobs from "@netlify/blobs";

const getStore = (blobs as any).getStore;

export default async (req: Request, context: Context) => {
  const timestamp = new Date().toISOString();
  console.log(
    `[${timestamp}] Starting weekly expired payment idempotency keys cleanup...`,
  );

  try {
    const store = getStore("donation_store");
    let checkedCount = 0;
    let deletedCount = 0;
    const now = Date.now();

    for await (const entry of store.list({
      prefix: "processed_tx:",
      paginate: true,
    })) {
      for (const blob of entry.blobs) {
        checkedCount++;
        const key = blob.key;

        try {
          const val = (await store.get(key, { type: "json" })) as {
            expiresAt: number;
          } | null;

          if (val && now > val.expiresAt) {
            await store.delete(key);
            deletedCount++;
          }
        } catch (innerError) {
          console.error(`Failed to process key: ${key}`, innerError);
        }
      }
    }

    console.log(
      `[${timestamp}] Cleanup completed. Checked: ${checkedCount}, Deleted Expired: ${deletedCount}`,
    );

    return new Response(
      JSON.stringify({
        success: true,
        checked: checkedCount,
        deleted: deletedCount,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error(
      `[${timestamp}] Critical failure during system cleanup`,
      error,
    );
    return new Response(
      JSON.stringify({ error: "Internal processing failure" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
};

export const config: Config = {
  schedule: "0 0 * * 0", // 🟢 กำหนดเวลารันทุกวันอาทิตย์เที่ยงคืน (Weekly) ตรงตามประสงค์ค่ะ
};
