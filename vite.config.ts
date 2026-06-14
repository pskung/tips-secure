import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

export default defineConfig({
    plugins: [
        tailwindcss(),
        sveltekit()
    ],
    ssr: {
        // บังคับให้ Vite มัดรวมโมดูลนี้เข้าด้วยกัน ป้องกันการพ่น SyntaxError ขณะทำการ Deploy จริง
        noExternal: ['@netlify/blobs']
    }
});