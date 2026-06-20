import { defineConfig } from "@solidjs/start/config";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  ssr: false, // รันทำงานในโหมด Single Page Application (SPA) ประสิทธิภาพสูง
  server: {
    preset: "cloudflare-pages", // เสิร์ฟงานตรงถึง Cloudflare Pages
    rollupConfig: {
      // ป้องกันข้อผิดพลาดของโมดูลรันไทม์ระหว่างทำงานบน Edge
      external: ["__STATIC_CONTENT_MANIFEST", "node:async_hooks"],
    },
  },
  vite: {
    plugins: [tailwindcss()],
  },
});
