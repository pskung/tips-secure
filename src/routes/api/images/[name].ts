import type { APIEvent } from "@solidjs/start/server";
import { getStore } from "@netlify/blobs";
import { safeLog } from "~/lib/utils/logger";

export async function GET(event: APIEvent) {
  try {
    const filename = event.params.name;
    if (!filename) {
      return new Response("Missing filename", { status: 400 });
    }

    const store = getStore("donation_store");
    const blob = await store.get(`image:${filename}`, { type: "blob" });

    if (!blob) {
      return new Response("Image not found", { status: 404 });
    }

    let contentType = "image/png";
    if (filename.endsWith(".jpg") || filename.endsWith(".jpeg")) {
      contentType = "image/jpeg";
    } else if (filename.endsWith(".gif")) {
      contentType = "image/gif";
    } else if (filename.endsWith(".webp")) {
      contentType = "image/webp";
    } else if (filename.endsWith(".svg")) {
      contentType = "image/svg+xml";
    }

    return new Response(blob, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'none'",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (err) {
    safeLog("Failed to serve image from Blobs Store", "ERROR", err);
    return new Response("Internal Server Error", { status: 500 });
  }
}
