import { defineConfig } from "@solidjs/start/config";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  server: {
    preset: "netlify",
  },
  vite: {
    plugins: [tailwindcss()],
    ssr: {
      // บังคับให้ Vite ทำการมัดรวม (Bundle) โมดูลของ Netlify Blobs ป้องกันปัญหาตอนคอมไพล์ฝั่งเซิร์ฟเวอร์
      noExternal: ["@netlify/blobs"]
    }
  }
});