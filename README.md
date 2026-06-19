# tips-secure (Donation Portal)

ระบบพอร์ทัลรับเงินสนับสนุน (Donation Portal) ออกแบบมาสำหรับ **Streamers** และ **VTubers** ที่ต้องการสร้างหน้าเพจรับโดเนทของตนเองโดยไม่ต้องผ่านแพลตฟอร์มตัวกลาง ช่วยรักษาผลกำไรและการโดเนทให้เข้าสู่บัญชีโดยตรง 100% (เลือกเชื่อมต่อกับ Beam Payment Gateway ซึ่งไม่หักค่าธรรมเนียมหากเป็นการสแกน QR PromptPay) พร้อมระบบป้องกันสแปมบอท ระบบเข้ารหัสลับข้อมูลส่วนบุคคล (PII) และสถาปัตยกรรมคลาวด์แบบ Serverless ที่ออกแบบให้ไม่มีค่าใช้จ่ายส่วนของ Infrastructure (Free-tier friendly)

---

## ฟังก์ชันการทำงานเด่น (Core Highlights)

ระบบนี้ขับเคลื่อนด้วยโครงสร้างสถาปัตยกรรม **Decoupled Edge-First Architecture** ที่แยกส่วนหน้าที่การประมวลผลอย่างเป็นระบบ [1] โดยมีไฮไลท์ฟังก์ชันการทำงานที่สำคัญดังนี้:

### 1. ระบบคัดกรองบอทและป้องกันการโจมตี (Zero-Trust Edge Layer)
*   **Edge CDN Rate Limiter:** ดักจับทราฟฟิกสแปมตั้งแต่ระดับ Edge CDN (`rate-limit.ts`) ก่อนที่คำขอจะวิ่งเข้าไปประมวลผลบน Serverless Functions ด้านหลัง เพื่อช่วยรักษาความปลอดภัยและลดภาระงานระบบ
*   **Bypass & Direct Hit Blocker:** บล็อกสคริปต์ยิง API ตรง โดยระบบจะไม่อนุญาตให้ทำรายการหากไม่ผ่านการตรวจสอบคุกกี้เริ่มต้น (`session_init=true`) ซึ่งจะออกให้เฉพาะผู้เข้าชมผ่านเบราว์เซอร์จริงเท่านั้น
*   **Honeypot Trap:** มีกล่องสปายเงียบ (`email_confirm`) คอยดักจับบอทส่งสแปมที่จะกรอกค่าข้อมูลลงในช่องนี้โดยอัตโนมัติ
*   **Speed Trigger Block:** ตรวจหาพฤติกรรมการยิงคำขอที่เร็วผิดปกติ (ส่งคำขอภายในระยะเวลาต่ำกว่า 1 วินาทีหลังจากโหลดหน้าเว็บเสร็จ)
*   **Double Layer Cooldown:** บล็อกการส่งคำขอซ้ำภายในระยะเวลา 60 วินาที ผ่านระบบคุกกี้เบราว์เซอร์ควบคู่กับ Edge-level Cookie Verification

### 2. ระบบการจัดการธุรกรรมและการซ่อมแซมสัญญาณ (Dynamic Alert Locking & Fallback Retry)
*   **Race Condition Prevention:** การทำรายการ Webhook ชำระเงินซ้ำซ้อนจะถูกสกัดกั้นด้วยฐานข้อมูล Netlify Blobs ที่มีการตั้งค่าระดับความสอดคล้องเป็นแบบ **Strong Consistency** เพื่อล็อกประวัติความปลอดภัยทันที
*   **Fast-Path Execution:** เมื่อมีรายการชำระเงินเข้ามา ระบบจะประมวลผลยิงสัญญาณแสดงผลหน้าจอไปยัง Streamlabs หรือ StreamElements ทันทีพร้อมตั้ง Timeout สั้นระดับ 800ms เพื่อความรวดเร็วในการส่งสัญญาณขึ้นจอ
*   **Slow-Path Background Retry:** หากสัญญาณส่งขึ้นโอเวอร์เลย์ล้มเหลว ระบบจะล็อกสถานะธุรกรรมเป็น `"retry_pending"` ทันทีเพื่อป้องกันการตรวจสอบซ้ำซ้อน และทำการสุ่มออกรหัสความปลอดภัย **One-Time Token (OTP)**
*   **Exponential Backoff Loop:** Background Worker (`alert-retry-background.ts`) จะทำหน้าที่ซ่อมแซมรายการแจ้งเตือนที่ขัดข้องโดยดึงคีย์งานขึ้นมาประมวลผลซ้ำแบบหน่วงเวลาเพิ่มขึ้นทวีคูณ (Backoff) จนสำเร็จสูงสุด 3 รอบ พร้อมระบบตรวจสอบ OTP เพื่อป้องกันภัยแฮกเกอร์

### 3. ระบบรักษาความเป็นส่วนตัวสูงสุด (PII Zero-Knowledge Cryptography)
*   **Deterministic Key Derivation Function (KDF):** ป้องกันปัญหาระบบหลุดลืมกุญแจระหว่าง Serverless คืนชีพหลังหลับใหล (Cold Starts) โดยใช้รหัส Webhook (`BEAM_WEBHOOK_SECRET`) มาร่วมกับเกลือเฉพาะทาง (Salt) ในระดับหน่วยความจำ เพื่อสร้างกุญแจเข้ารหัสความยาว 256 บิตที่แม่นยำสูง
*   **PII AES-256-GCM Encryption:** ข้อมูลที่ละเอียดอ่อนของผู้บริจาค (เช่น ชื่อเล่น และข้อความสนับสนุน) จะถูกเข้ารหัสลับทันทีในระหว่างการนำเข้าสู่ระบบคิวซ่อมงาน ทำให้ผู้ดูแลระบบคลาวด์หรือผู้ให้บริการไม่มีสิทธิ์เข้าถึงข้อความจริงได้เลยจนกว่าระบบหลังบ้านจะดึงขึ้นมาถอดรหัสในเวลาที่เหมาะสม
*   **Timing-Safe Comparison:** ใช้ตรรกะเปรียบเทียบข้อมูลแฮชค่าคงที่ (`timingSafeEqual`) ป้องกันภัยแฮกเกอร์ใช้เทคนิคเดาค่ารหัสจากเวลาตอบสนองของเซิร์ฟเวอร์ (Timing Attacks)

### 4. ระบบประหยัดต้นทุนคลาวด์และการเพิ่มประสิทธิภาพเข้าถึง (Cost-Optimized Performance)
*   **Warm Start Caching:** มีหน่วยความจำแคช (In-Memory Cache) ระดับโกลบอลช่วยถือสกินธีมไว้เป็นเวลา 30 วินาที เพื่อหลีกเลี่ยงภาระค่าบริการในการส่งคำขออ่านฐานข้อมูล Netlify Blobs ซ้ำซ้อนโดยไม่จำเป็น
*   **Browser-Direct ImgBB Image Delivery:** ระบบจัดการธีมและหน้าเพจหลักจะข้ามระบบบีบอัดรูปภาพของ Netlify และดึงรูปภาพวอลเปเปอร์หลัก ไอคอนโปรไฟล์ และแบนเนอร์ตรงจาก CDN ของ ImgBB ช่วยประหยัดแบนด์วิดท์เซิร์ฟเวอร์จนค่าใช้จ่ายส่วนนี้เหลือ 0 บาทอย่างราบรื่น
*   **Automated Scheduled Garbage Collector:** ติดตั้งระบบ Cron Job ประมวลผลทำงานทุกวันอาทิตย์เพื่อกวาดล้างล็อกธุรกรรมและยอดประวัติที่มีอายุเกิน 7 วันออกจากระบบ เพื่อรักษาระดับฐานข้อมูลไม่ให้บวมและควบคุมค่าพื้นที่ให้อยู่ในขอบเขตประหยัดที่สุด

---

## โครงสร้างไดเรกทอรี (Directory Structure)

```text
tips-secure/
├── netlify/
│   ├── edge-functions/
│   │   └── rate-limit.ts            # [Edge CDN]: ตรวจคุกกี้เริ่มต้น, คุม Cooldown และสกัดกั้นบอทแฝงตัว
│   └── functions/
│       ├── alert-retry-background.ts # [Background]: ระบบคิวหลังบ้านซ่อมสัญญาณแจ้งเตือนและประมวลผล Dynamic OTP
│       └── cleanup-sessions.ts      # [Scheduled Cron]: คำสั่งตั้งเวลาทำลายประวัติเก่าอายุเกิน 7 วันทุกสัปดาห์
├── src/
│   ├── lib/
│   │   ├── config/
│   │   │   └── theme.json           # [Blueprints]: ตัวแปรสี สกิน ฟอนต์ และเกณฑ์รับบริจาคขั้นต่ำเริ่มต้น
│   │   └── utils/
│   │       ├── auth.ts              # ระบบสแกนยืนยันสิทธิ์แอดมิน (Netlify Identity JWT Verification)
│   │       ├── crypto.ts            # ระบบเข้ารหัส GCM AES-256 และ timingSafeCompare ป้องกันภัยเจาะเวลา
│   │       ├── logger.ts            # ระบบบันทึกเหตุการณ์ความมั่นคงปลอดภัยแบบ Structured JSON Log
│   │       └── schemas.ts           # Zod Runtime Validators ควบคุมยอดโดเนทสูงสุดไม่เกิน 100,000 บาท
│   ├── routes/
│   │   ├── admin/
│   │   │   └── index.tsx            # [Admin UI]: หน้าแผงเปลี่ยนสกิน ปรับแต่งธีม และกำหนดค่าขอบเขตโดเนท
│   │   ├── api/
│   │   │   ├── admin/
│   │   │   │   └── save.ts          # API บันทึกการตั้งค่าลงpersonalized_theme พร้อมด่านป้องกัน CSRF
│   │   │   ├── webhook/
│   │   │   │   └── beam.ts          # [Webhook API]: อนุมัติยอด สกัด Webhook ซ้ำ และแยกทิศทางประมวลผล
│   │   │   └── donate.ts            # [API Controller]: ด่านประเมิน Turnstile, สร้างบิล Beam และประทับคุกกี้
│   │   └── index.tsx                # [Viewer UI]: หน้าบริจาคหลัก รองรับมาตรฐานการเข้าถึงสากล WCAG 2.1 Level AA
│   ├── app.css                      # จุดเชื่อมต่อ Global Style ของ Tailwind CSS v4
│   ├── app.tsx                      # จุดเข้าใช้งานหน้าเว็บหลักและระบบ Suspense หมุนโหลดรอหน้าเพจ
│   ├── entry-client.tsx             # หน้าด่านประสานงานสคริปต์ฝั่ง Client Hydration
│   ├── entry-server.tsx             # หน้าด่านจัดเตรียมโครงสร้างเอกสารเซิร์ฟเวอร์ (Server-Side Document Shell)
│   └── globals.d.ts                 # TypeScript Custom Definitions
├── app.config.js                    # ตัวกำหนดค่า Vinxi Server-Side Bundler & Netlify Presets
├── netlify.toml                     # คอนฟิกการทำงานรีโมทและการรวบรวม Edge Path บนคลาวด์ Netlify
├── package.json                     # รายการจัดสรรสคริปต์และไลบรารีที่จำเป็นทั้งหมดในโครงการ
└── tsconfig.json                    # ตัวกําหนดกฎเกณฑ์ตรวจสอบของ TypeScript Compiler
```

---

## คู่มือตัวแปรสภาพแวดล้อม (Environment Variables Guide)

สำหรับการติดตั้งระบบใช้งานจริงบนแพลตฟอร์ม Netlify จำเป็นต้องกำหนดค่าตัวแปร (Environment Variables) ต่อไปนี้ในเมนู **Project configuration > Environment variables** เพื่อให้ทุกฟังก์ชันทำงานได้อย่างปลอดภัยและถูกต้องค่ะ:

| ชื่อตัวแปร (Key) | จุดประสงค์ในการใช้งาน | ประเภทระดับความลับ | สิทธิ์ Scope ใน Netlify | ตัวอย่างค่าที่ใส่ (Example Value) |
| :--- | :--- | :--- | :--- | :--- |
| `ADMIN_EMAILS` | รายชื่ออีเมล Google ของสตรีมเมอร์หรือทีมงานที่มีสิทธิ์ล็อกอินเข้าหน้าควบคุมแอดมิน (คั่นด้วยจุลภาค `,` เสมอ) | **Public** | **All scopes** | `streamer@gmail.com, graphic.designer@gmail.com` |
| `BEAM_API_KEY` | รหัส API Key สำหรับเชื่อมต่อสร้างบิลเรียกเก็บเงินผ่าน Beam Checkout | **Secret** | **Production** | `api_prod_xxxxxxxxxxxxxx` |
| `BEAM_WEBHOOK_SECRET` | รหัสตรวจสอบความถูกต้องในการรับผลชำระเงินที่ได้รับจาก Beam Console (ใช้ดึงไปสร้างกุญแจ KDF ด้วย) | **Secret** | **Production** | `whsec_xxxxxxxxxxxxxx` |
| `BEAM_API_URL` | ลิงก์ที่อยู่ผู้รับชำระเงิน Beam (ให้เปลี่ยนเป็นตัวจริงเมื่อระบบพร้อมรับเงินจริง) | **Public** | **All scopes** | `https://api.beamcheckout.com` |
| `TURNSTILE_SITE_KEY` | รหัสฝั่งหน้าเว็บสำหรับแสดงผลปุ่มเลื่อนท้าทายสแปม Cloudflare Turnstile | **Public** | **All scopes** | `0x4AAAAAA...` |
| `TURNSTILE_SECRET_KEY` | รหัสลับหลังบ้านสำหรับเรียกตรวจสอบผลการผ่านการสแกน Cloudflare Turnstile | **Secret** | **Production** | `0x4AAAAAA...` |
| `STREAMLABS_ACCESS_TOKEN` | โทเคนผู้พัฒนาสิทธิ์สำหรับเข้าถึง API แสดงผลกระดิ่งแจ้งเตือนบน Streamlabs | **Secret** | **Production** | `eyJhbGciOiJIUzI1NiIsIn...` |
| `STREAMELEMENTS_JWT` | รหัสเข้าใช้งาน JWT เพื่อส่งแจ้งเตือนขึ้นหน้าจอซ้ำสำหรับ StreamElements | **Secret** | **Production** | `eyJhbGciOiJIUzI1NiIsIn...` |
| `STREAMELEMENTS_CHANNEL_ID` | รหัส ID ช่องของคุณที่ลงทะเบียนไว้ใน StreamElements | **Secret** | **Production** | `65f8a00bc9xxxxxxxxxxxx` |


# คู่มือการตั้งค่าความปลอดภัยและการขอคีย์ (Configuration & Secrets Guide)

---

## บริการที่ต้องสมัครใช้งานเบื้องต้น (Prerequisites)

1.  **GitHub Account:** สำหรับเก็บซอร์สโค้ดส่วนตัวของเพจโดเนท
2.  **Netlify Account:** สำหรับเซิร์ฟเวอร์โฮสติ้งและระบบฐานข้อมูลไร้ราคา (แนะนำเข้าสมัครโดยผูกกับบัญชี GitHub เพื่อความสะดวก)
3.  **Cloudflare Account:** สำหรับใช้งานด่านป้องกันบอทสแปมอัจฉริยะแบบไม่มีรูปกวนใจ (Turnstile)
4.  **Beam Checkout Merchant Account:** แพลตฟอร์มรับชำระเงิน (รองรับ QR Prompt Pay ฟรีค่าธรรมเนียม)

---
## วิธีการรับคีย์ใช้งานจากผู้ให้บริการ (How to Get Your Keys)

### วิธีการสร้างคีย์ Cloudflare Turnstile
Turnstile ทำหน้าที่ป้องกันการยิงสแปมช่องบริจาค โดยเราจำเป็นต้องสร้างชุดคีย์คู่ (Site Key และ Secret Key) ขึ้นมาผูกกับชื่อโดเมนของตนเองดังนี้ค่ะ:

1.  ลงชื่อเข้าใช้งานที่ [Cloudflare Dashboard](https://dash.cloudflare.com/)
2.  ที่แถบเมนูด้านซ้าย เลือกหัวข้อ **Application security** > **Turnstile** จากนั้นคลิกปุ่ม **Add widget**
3.  กรอกรายละเอียดในหน้าต่างสร้างคีย์:
    *   **Widget Name:** ตั้งชื่อเพื่อให้ระบุได้ง่าย เช่น `My Donation Portal`
    *   **Add Hostnames** > ระบุชื่อโดเมนหลักของคุณลงไป > Add > Save
        *   *ตัวอย่างที่ต้องกรอก:* `your-app.netlify.app` (ชื่อโดเมนที่ Netlify มอบให้)
    *   **Widget Mode:** แนะนำให้เลือกเป็น **Managed (Recommended)** เพื่อให้ Cloudflare ตัดสินใจท้าทายบอทอย่างชาญฉลาดโดยไม่ต้องให้มนุษย์เลือกรูปภาพ
    *   Create/Update
4.  คลิกปุ่ม **Create** ระบบจะส่งชุดรหัสขึ้นมา 2 รหัสให้คัดลอกเก็บไว้:
    *   **Site Key:** รหัสสาธารณะ สำหรับแสดงปุ่มหน้าเว็บ
    *   **Secret Key:** รหัสลับหลังบ้าน ห้ามบอกผู้อื่นเด็ดขาด

---

### วิธีการสร้างคีย์ Beam Checkout
Beam Checkout เป็นช่องทางรับเงิน:

1.  ลงชื่อเข้าใช้งานที่ [Beam Merchant Console](https://playground.merchant.beamcheckout.com/)
2.  **การหา API Key:**
    *   ไปที่เมนู **API Keys** หรือการตั้งค่าของบัญชี
    *   คลิก **Generate Key** ระบบจะออกรหัสเริ่มต้นด้วย `api_test_...` (หรือ `api_prod_...` สำหรับของจริง) ให้คัดลอกรหัสนี้เก็บไว้ในช่อง **`BEAM_API_KEY`**
3.  **การผูก Webhook และรับ Webhook Secret:**
    *   ไปที่เมนู **Webhooks** คลิกปุ่ม **Create Webhook**
    *   ในช่อง **Endpoint URL** ให้ระบุโดเมนเว็บโดเนทของคุณ และต่อท้ายด้วย `/api/webhook/beam` เช่น:
        `https://your-app.netlify.app/api/webhook/beam`
    *   ติ๊กเลือกเงื่อนไขเหตุการณ์เป็นธุรกรรมสำเร็จ เช่น `payment.paid` หรือ `charge.succeeded` 
    *   หลังจากสร้างเสร็จ ระบบจะมอบรหัสลับยืนยันความปลอดภัยมา 1 รหัส ซึ่งจะขึ้นต้นด้วย `whsec_...` ให้คัดลอกรหัสนี้ไปใส่ในตัวแปร **`BEAM_WEBHOOK_SECRET`**

---

[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/pskung/tips-secure)

## วิธีเริ่มต้นใช้งาน (One-Click Deploy Setup)

1. **คลิกปุ่มเชื่อมต่อ:** กดปุ่ม **Deploy to Netlify** ระบบจะนำทางคุณไปยังหน้าตั้งค่าของ Netlify
2. **ยืนยันบัญชี Git:** กดเชื่อมต่อกับบัญชี GitHub ของคุณ ระบบจะทำการสร้างคลังรหัส (Repository) ส่วนตัวขึ้นมาในบัญชีของคุณโดยอัตโนมัติ
3. **กรอกข้อมูลตัวแปร (Environment Variables):** ระบบจะดึงเทมเพลตตัวแปรทั้งหมดขึ้นมาแสดงผลเป็นกล่องข้อความให้คุณกรอกค่า API ของผู้ให้บริการชำระเงิน (Beam) และบริการแจ้งเตือน (Streamlabs/StreamElements) ได้ทันที
4. **อนุมัติและติดตั้ง:** กดปุ่ม **Save and Deploy** รอระบบประมวลผลประมาณ 1-2 นาที


### การเตรียมตัวเชื่อมและกำหนดสิทธิ์แอดมิน (Admin Portal Integration)
ระบบใช้ฟังก์ชัน **Netlify Identity** ในการเข้าสู่ระบบผ่าน Google OAuth เพื่อป้องกันไม่ให้ผู้บริจาคทั่วไปสามารถลักลอบแอบเข้าแก้ไขการตั้งค่าหลังบ้านได้:
1.  เข้าไปที่เมนู **Netlify Dashboard > Project configuration > Identity**
2.  ทำการเปิดใช้งานระบบสิทธิการระบุตัวตน (Enable Identity)
3.  ในเมนู **Identity > เลื่อนลงมา > External Providers** ให้ทำการเชื่อมโยงเข้ากับระบบบัญชี Google เลือกเป็น Default setting
4.  ในเมนู **Environment variables** เพิ่มอีเมลตนเองและเพื่อนร่วมทีมในกล่อง `ADMIN_EMAILS` จึงจะสามารถปลดล็อกหน้าจอแอดมินสำเร็จได้


### นำลิงก์ Webhook ไปผูกที่หน้าจัดการ Beam Console
เพื่อให้ยอดเงินที่ชำระผ่านพร้อมเพย์/บัตรเครดิต วิ่งกลับมาส่งสัญญาณบนหน้าจอของคุณ:
1.  นำลิงก์หน้าเว็บโดเนทของคุณจาก Netlify มาต่อท้ายด้วย /api/webhook/beam เช่น: https://tips-yourname.netlify.app/api/webhook/beam
2.  นำที่อยู่นี้ไปวางในช่อง Webhook URL ในหน้าการจัดการบัญชีของระบบ Beam Checkout
3.  นำคีย์ Webhook Secret Key ที่ได้จาก Beam มากรอกลงในตัวแปรระบบ BEAM_WEBHOOK_SECRET ของ Netlify เพื่อยืนยันสิทธิ์ความปลอดภัย



---

