import { defineConfig } from "@solidjs/start/config";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  ssr: false, // ยังคงเป็นโหมด SPA ประสิทธิภาพสูง
  server: {
    preset: "cloudflare-pages", // เสิร์ฟงานตรงถึง Cloudflare Pages
  },
  vite: {
    plugins: [tailwindcss()],
  },
});
