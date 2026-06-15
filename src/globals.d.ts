// src/global.d.ts

// 1. อนุญาตให้ระบบรับรู้การนำเข้าไฟล์สไตล์ชีทภายนอกได้โดยตรง
declare module '*.css';

// 2. ประกาศประเภทข้อมูลที่ปลอดภัยให้กับระบบยืนยันตัวตน Cloudflare Turnstile บนหน้าต่าง Browser
interface Window {
  turnstile?: {
    render: (container: string | HTMLElement, options: any) => string;
    reset: (widgetId: string) => void;
    remove: (widgetId: string) => void;
  };
}