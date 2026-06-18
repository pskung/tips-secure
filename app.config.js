import { defineConfig } from "@solidjs/start/config";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  server: {
    preset: "netlify",
  },
  vite: {
    plugins: [tailwindcss()],
    ssr: {
      noExternal: ["@netlify/blobs"],
    },
  },
});
