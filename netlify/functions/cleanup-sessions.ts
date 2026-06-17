// netlify/functions/cleanup-sessions.ts
import type { Config, Context } from "@netlify/functions";
import * as blobs from "@netlify/blobs";

const getStore = (blobs as any).getStore;

export default async (req: Request, context: Context) => {
  const timestamp = new Date().toISOString();
  console.log(
    `[${timestamp}] Starting monthly session & transaction storage cleanup...`,
  );

  try {
    const store = getStore("donation_store");
    let sessionChecked = 0;
    let sessionDeleted = 0;
    let logChecked = 0;
    let logDeleted = 0;
    const now = Date.now();
    const thirtyDaysAgo = now - 1000 * 60 * 60 * 24 * 30; // ย้อนหลัง 30 วัน

    // 1. ค้นหาและทำลายเซสชันแอดมินที่หมดอายุ (session:*)
    for await (const entry of store.list({
      prefix: "session:",
      paginate: true,
    })) {
      for (const blob of entry.blobs) {
        sessionChecked++;
        const sessionKey = blob.key;
        try {
          const parts = sessionKey.split(":");
          if (parts.length === 3) {
            const expiresAt = Number(parts[1]);
            if (now > expiresAt) {
              await store.delete(sessionKey);
              sessionDeleted++;
            }
          } else {
            await store.delete(sessionKey);
            sessionDeleted++;
          }
        } catch (innerError) {
          console.error(`Failed to delete session: ${sessionKey}`, innerError);
        }
      }
    }

    // 2. ระบบดักตรวจและลบขยะประวัติธุรกรรม (tx_log:*) แบบขนานไร้คอขวด
    const deletePromises: Promise<any>[] = [];
    const deleteLimit = 50; // ควบคุมให้ประมวลผลลบพร้อมกันครั้งละ 50 คีย์เพื่อป้องกันระบบคลาวด์หน่วง

    for await (const entry of store.list({
      prefix: "tx_log:",
      paginate: true,
    })) {
      for (const blob of entry.blobs) {
        logChecked++;
        const logKey = blob.key;

        try {
          // แกะวันหมดอายุจากชื่อคีย์ตรงๆ เช่น tx_log:1783993800000:tx_123456
          const parts = logKey.split(":");
          if (parts.length === 3) {
            const txTimestamp = Number(parts[1]);
            const transactionId = parts[2];

            if (!isNaN(txTimestamp) && txTimestamp < thirtyDaysAgo) {
              // ทำการผลักกระบวนการลบคู่ขนานลงใน Pool
              deletePromises.push(
                (async () => {
                  await store.delete(`processed_tx:${transactionId}`); // ลบสถิติตัวหลัก
                  await store.delete(logKey); // ลบสารบัญตัวชี้วัดวันที่
                  logDeleted++;
                })(),
              );

              // หากสะสมตัวลบคู่ขนานครบ 50 รายการ ให้ปล่อยล้างพร้อมกันทันที
              if (deletePromises.length >= deleteLimit) {
                await Promise.all(deletePromises);
                deletePromises.length = 0; // ล้างคิวเพื่อเริ่มเซ็ตถัดไป
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

    // ล้างรายการสัญญาที่ยังค้างอยู่ในอาเรย์ชิ้นสุดท้ายให้หมดจด
    if (deletePromises.length > 0) {
      await Promise.all(deletePromises);
    }

    console.log(
      `[${timestamp}] Cleanup completed successfully.
      - Sessions: Checked ${sessionChecked}, Deleted Expired ${sessionDeleted}
      - Transactions: Checked ${logChecked}, Deleted >30 Days ${logDeleted}`,
    );

    return new Response(
      JSON.stringify({
        success: true,
        sessions: { checked: sessionChecked, deleted: sessionDeleted },
        transactions: { checked: logChecked, deleted: logDeleted },
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error(`[${timestamp}] Critical failure during cleanup`, error);
    return new Response(
      JSON.stringify({ error: "Internal processing failure" }),
      { status: 500 },
    );
  }
};

export const config: Config = {
  schedule: "0 0 1 * *", // ทำงานรายเดือนอัตโนมัติ
};
