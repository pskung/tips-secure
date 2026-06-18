import type { APIEvent } from "@solidjs/start/server";
import { getStore } from "@netlify/blobs";
import { safeLog } from "~/lib/utils/logger";
import { verifyAdminJWT } from "~/lib/utils/auth";

export async function POST(event: APIEvent) {
  try {
    const isAuthenticated = await verifyAdminJWT(event);
    if (!isAuthenticated) {
      return new Response(
        JSON.stringify({
          error: "Unauthorized or session expired. Please log in again.",
        }),
        { status: 401 },
      );
    }

    const formData = await event.request.formData();
    const file = formData.get("file") as File;
    const type = formData.get("type") as string;

    if (!file || !type) {
      return new Response(
        JSON.stringify({
          error: "Please attach an image file and specify its type.",
        }),
        { status: 400 },
      );
    }

    const MAX_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return new Response(
        JSON.stringify({ error: "File size cannot exceed 5 MB." }),
        { status: 400 },
      );
    }

    if (!file.type.startsWith("image/")) {
      return new Response(
        JSON.stringify({ error: "Please upload image files only." }),
        { status: 400 },
      );
    }

    let ext = "png";
    if (file.type === "image/jpeg" || file.type === "image/jpg") ext = "jpg";
    else if (file.type === "image/gif") ext = "gif";
    else if (file.type === "image/webp") ext = "webp";
    else if (file.type === "image/svg+xml") ext = "svg";

    const timestamp = Date.now();
    const filename = `${type}_${timestamp}.${ext}`;

    const store = getStore("donation_store");
    const arrayBuffer = await file.arrayBuffer();
    await store.set(`image:${filename}`, arrayBuffer);

    safeLog(`Admin uploaded image: ${filename}`, "INFO");

    return new Response(
      JSON.stringify({
        success: true,
        url: `/api/images/${filename}`,
        filename,
      }),
      { status: 200 },
    );
  } catch (err) {
    safeLog("Fatal crash during image upload processing", "ERROR", err);
    return new Response(
      JSON.stringify({ error: "Failed to process image upload." }),
      { status: 500 },
    );
  }
}
