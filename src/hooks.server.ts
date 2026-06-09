import type { Handle } from '@sveltejs/kit';

// 🇹🇭 ตัวกรองความปลอดภัยระดับเครือข่าย ป้องกัน Clickjacking และควบคุมประวัติการเดินทางของลิงก์ความลับ
export const handle: Handle = async ({ event, resolve }) => {
    const response = await resolve(event);
    
    // 🛡️ ฝัง HTTP Security Headers ทั่วทุกเพจและเอนพอยต์ของระบบอย่างมั่นคง
    response.headers.set('X-Frame-Options', 'SAMEORIGIN'); // ป้องกันมิให้เว็บไซต์อื่นแอบนำเว็บเราไปฝัง iframe เพื่อหลอกลวง
    response.headers.set('Content-Security-Policy', "frame-ancestors 'self';"); // อนุญาตเฉพาะโดเมนตนเองในการสร้างกรอบหน้าต่างเท่านั้น
    response.headers.set('X-Content-Type-Options', 'nosniff'); // บล็อกความพยายามเดาชนิดไฟล์ที่ไม่ปลอดภัยของเบราว์เซอร์ปลายทาง
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin'); // ป้องกันข้อมูลประวัติความลับในลิงก์การเงินรั่วไหล
    response.headers.set('X-XSS-Protection', '1; mode=block'); // บังคับทำลายการรันของเว็บทันทีหากเบราว์เซอร์ตรวจจับสคริปต์สวมรอยได้

    return response;
};
