# tips-secure (Donation Portal)

ระบบ **tips-secure** คือจุดเริ่มต้นสำหรับ VTuber และ Streamer ในการจัดตั้งช่องทางรับเงินสนับสนุน (Donation Portal) โดยไม่ผ่านตัวกลาง ไม่มีการหักค่าหัวคิวใด และทำงานอยู่บนเครือข่าย Cloudflare Workers ที่มีความปลอดภัยสูง เสิร์ฟข้อมูลรวดเร็ว และรักษาข้อมูลส่วนบุคคลอย่างรัดกุม

[หากชื่นชอบสามารถโดเนทให้กันได้](https://tips-secure.pskung.workers.dev/)

[ติดต่อสอบถามข้อสงสัย](https://x.com/ps_kung11)

---

## Hilight

### 1. 0% Commission (ไม่มีการหักค่าธรรมเนียมแพลตฟอร์ม)

ระบบนี้เชื่อมต่อโดยตรงกับ Payment gateway **Beam Checkout** เพื่ออำนวยความสะดวกในการชำระเงินผ่าน QR Code (PromptPay) และสแกนจ่ายเงินได้จากทุกแอปธนาคารไทย โดยทาง Beam ไม่มีการเก็บค่าธรรมเนียมสำหรับการชำระผ่าน QR Payment (0% Platform Fee)

### 2. Complete Self-Ownership (คุณเป็นเจ้าของระบบทั้งหมด)

เพราะระบบนี้ถูกติดตั้งไว้บนคลาวด์ **Cloudflare** ส่วนตัวของคุณเอง:

- **ระบบไม่สามารถโกงคุณได้:** ข้อมูลการเข้าและรหัสผ่าน Admin ทั้งหมดจะถูกเข้ารหัสผ่าน HS256 JWT มีคุณเพียงผู้เดียวที่เข้าถึงได้
- **ไม่มีตัวกลางคุมเงิน:** รายการธุรกรรมทั้งหมดส่งตรงหา Payment gateway ไม่ผ่าน Server ของนักพัฒนาคนใดทั้งสิ้น

### 3. Ultimate Privacy & Zero-Knowledge (รักษาความเป็นส่วนตัวสูงสุด)

- **ฝั่งผู้ชม:** ผู้บริจาคไม่มีการเปิดเผยข้อมูลบัญชีส่วนตัวกับ Streamer
- **ฝั่ง Streamer:** ระบบมีตรรกะทำลายประวัติธุรกรรมสะสมอัตโนมัติ (Probabilistic Garbage Collection) โดยสุ่มตรวจจับและลบประวัติชื่อผู้สนับสนุนรวมถึงข้อความสนับสนุนที่อายุเกิน 7 วันทิ้งทันที และทาง Payment gateway **Beam Checkout** จะเป็นผู้รับเงินแทน ทำให้ไม่มีการเปิดเผยข้อมูลบัญชีของ Streamer กับผู้บริจาคเช่นกัน

### 4. Quiet Bot Shield (ระบบกรองสแปมบอท)

**tips-secure** ใช้การทำงานร่วมกันของ **Cloudflare Turnstile** และระบบกับดักฟอร์ม (Invisible Honeypot) สกัดบอทออกไปโดยที่ผู้ชมไม่ต้องเสียเวลานั่งเลือกภาพแคปชาให้กวนใจ

### 5. Overlay Integrations (แจ้งเตือนขึ้นจอเรียลไทม์)

เมื่อสแกนชำระเงินสำเร็จ ระบบจะยิงสัญญาณแจ้งเตือนขึ้นหน้าจอ Stream ผ่าน **Streamlabs** และ **StreamElements** ทันที พร้อมระบบดูแลความหน่วงย้อนหลังกรณีเครือข่ายปลายทางขัดข้อง (Automatic Background Retry Loop)

---

## โครงสร้างเทคโนโลยีที่รวดเร็วและใช้โควตาฟรีคลาวด์ถาวร (Zero-Cost Stack)

ระบบนี้ถูกพัฒนาโดยเลือกใช้เทคโนโลยีที่เน้นประสิทธิภาพสูงสุดและมีขนาดไฟล์เล็กมาก เพื่อให้คุณใช้งานบน Cloud free ได้ถาวรโดยไม่มีค่าบริการรายเดือน:

| เลเยอร์ (Layer) | เทคโนโลยีที่เลือกใช้      | จุดเด่นเชิงระบบ                                                      |
| :-------------- | :------------------------ | :------------------------------------------------------------------- |
| **Frontend**    | SolidJS + Tailwind CSS v4 | โหลดรวดเร็ว ใช้หน่วยความจำในเครื่องต่ำมาก                            |
| **Backend**     | Hono v4 (Web Standard)    | Framework API น้ำหนักเบา ประมวลผลจาก Edge Cloud ทั่วโลก              |
| **Database**    | Cloudflare D1 (SQLite)    | ระบบฐานข้อมูล Serverless จัดเก็บข้อมูลสกินช่องและการยืนยันยอดธุรกรรม |

---

## บริการที่ต้องสมัครใช้งานเบื้องต้น (Prerequisites)

1.  **GitHub Account:** สำหรับเก็บ Sorcecode
2.  **Cloudflare Account:** สำหรับใช้งานด่านป้องกัน Bot (Turnstile)
3.  **Beam Checkout Merchant Account:** บริการ Payment gateway (รองรับ QR Prompt Pay ฟรีค่าธรรมเนียม)
4.  **StreamLabs หรือ StreamElement:** ช่องทางยิง Alert ขึ้น Stream แนะนำเลือกใช้แค่ 1 อย่าง

---

## วิธีเริ่มต้นใช้งาน (One-Click Deploy Setup)

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/pskung/tips-secure)

1. กดปุ่ม **Deploy to Cloudflare** ระบบจะนำทางคุณไปยังหน้าตั้งค่าของ Cloudflare
2. กดเชื่อมต่อกับบัญชี GitHub ของคุณ ระบบจะทำการสร้างคลังรหัส (Repository) ส่วนตัวขึ้นมาในบัญชีของคุณโดยอัตโนมัติ
3. กดปุ่ม **Save and Deploy** รอระบบประมวลผลประมาณ 1-2 นาที
4. คุณจะได้รับ Link สำหรับเปิดรับโดเนทมา `tips-secure.Subdomain.workers.dev` หน้าตาประมาณนี้

---

## วิธีการรับคีย์ใช้งานจากผู้ให้บริการ (How to Get Your Keys)

### วิธีการสร้างคีย์ Cloudflare Turnstile

Turnstile ทำหน้าที่ป้องกันการยิงสแปมช่องบริจาค โดยเราจำเป็นต้องสร้างชุดคีย์คู่ (Site Key และ Secret Key) ขึ้นมาผูกกับชื่อโดเมนของตนเองดังนี้ค่ะ:

1.  ลงชื่อเข้าใช้งานที่ [Cloudflare Dashboard](https://dash.cloudflare.com/)
2.  ที่แถบเมนูด้านซ้าย เลือกหัวข้อ **Application security** > **Turnstile** จากนั้นคลิกปุ่ม **Add widget**
3.  กรอกรายละเอียดในหน้าต่างสร้างคีย์:
    - **Widget Name:** ตั้งชื่อเพื่อให้ระบุได้ง่าย เช่น `My Donation Portal`
    - **Add Hostnames** > ระบุชื่อโดเมนหลักของคุณลงไป > Add > Save
      - _ตัวอย่างที่ต้องกรอก:_ `tips-secure.Subdomain.workers.dev` (ชื่อโดเมนที่ Netlify มอบให้)
    - **Widget Mode:** แนะนำให้เลือกเป็น **Managed (Recommended)** เพื่อให้ Cloudflare ตัดสินใจท้าทายบอทอย่างชาญฉลาดโดยไม่ต้องให้มนุษย์เลือกรูปภาพ
    - Create/Update
4.  คลิกปุ่ม **Create** ระบบจะส่งชุดรหัสขึ้นมา 2 รหัสให้คัดลอกเก็บไว้:
    - **Site Key:** รหัสสาธารณะ สำหรับแสดงปุ่มหน้าเว็บ
    - **Secret Key:** รหัสลับหลังบ้าน ห้ามบอกผู้อื่นเด็ดขาด

---

### วิธีการสร้างคีย์ Beam Checkout

Beam Checkout เป็นช่องทางรับเงิน:

1.  ลงชื่อเข้าใช้งานที่ [Beam Merchant Console](https://playground.merchant.beamcheckout.com/)
2.  **การหา API Key:**
    - ไปที่เมนู **API Keys** หรือการตั้งค่าของบัญชี
    - คลิก **Generate Key** ระบบจะออกรหัสเริ่มต้นด้วย `api_test_...` (หรือ `api_prod_...` สำหรับของจริง) ให้คัดลอกรหัสนี้เก็บไว้ในช่อง **`BEAM_API_KEY`**
3.  **การผูก Webhook และรับ Webhook Secret:**
    - ไปที่เมนู **Webhooks** คลิกปุ่ม **Create Webhook**
    - ในช่อง **Endpoint URL** ให้ระบุโดเมนเว็บโดเนทของคุณ และต่อท้ายด้วย `/api/webhook/beam` เช่น:
      `tips-secure.Subdomain.workers.dev/api/webhook/beam`
    - ติ๊กเลือกเงื่อนไขเหตุการณ์เป็นธุรกรรมสำเร็จ เช่น `payment.paid` หรือ `charge.succeeded`
    - หลังจากสร้างเสร็จ ระบบจะมอบรหัสลับยืนยันความปลอดภัยมา 1 รหัส ซึ่งจะขึ้นต้นด้วย `whsec_...` ให้คัดลอกรหัสนี้ไปใส่ในตัวแปร **`BEAM_WEBHOOK_SECRET`**

---

## คู่มือตัวแปรสภาพแวดล้อม (Environment Variables Guide)

สำหรับการติดตั้งระบบใช้งานจริงบนแพลตฟอร์ม Netlify จำเป็นต้องกำหนดค่าตัวแปร (Environment Variables) ต่อไปนี้ในเมนู **Build > Compute > Workers & Pages > กดที่โครงการของคุณ > Setting > Variables and secrets > Add** หากต้องการเพิ่มหลายตัวแปรสามารถกดที่ Add variable เพื่อเพิ่มตัวแปรได้ หลังจากกำหนดค่าตัวแปร (Environment Variables) แล้ว ให้กดปุ่ม Deploy เพื่อบันทึกและทำการ Deploy ใหม่:

| ชื่อตัวแปร (Key)            | จุดประสงค์ในการใช้งาน                                                                           | Type       | ตัวอย่างค่าที่ใส่ (Example Value)                            |
| :-------------------------- | :---------------------------------------------------------------------------------------------- | :--------- | :----------------------------------------------------------- |
| `ADMIN_PASSWORD`            | Password สำหรับเข้าถึงหน้าตั้งค่าการตกแต่ง                                                      | **Secret** | แนะนำให้ตั้งให้ยากหน่อยป้องกันผู้ประสงค์ร้ายเข้ามาแอบเปลี่ยน |
| `BEAM_API_KEY`              | รหัส API Key สำหรับเชื่อมต่อสร้างบิลเรียกเก็บเงินผ่าน Beam Checkout                             | **Secret** | `api_prod_xxxxxxxxxxxxxx`                                    |
| `BEAM_WEBHOOK_SECRET`       | รหัสตรวจสอบความถูกต้องในการรับผลชำระเงินที่ได้รับจาก Beam Console (ใช้ดึงไปสร้างกุญแจ KDF ด้วย) | **Secret** | `whsec_xxxxxxxxxxxxxx`                                       |
| `BEAM_API_URL`              | ลิงก์ที่อยู่ผู้รับชำระเงิน Beam (ให้เปลี่ยนเป็นตัวจริงเมื่อระบบพร้อมรับเงินจริง)                | **Text**   | `https://api.beamcheckout.com`                               |
| `TURNSTILE_SITE_KEY`        | รหัสฝั่งหน้าเว็บสำหรับแสดงผลปุ่มเลื่อนท้าทายสแปม Cloudflare Turnstile                           | **Text**   | `0x4AAAAAA...`                                               |
| `TURNSTILE_SECRET_KEY`      | รหัสลับหลังบ้านสำหรับเรียกตรวจสอบผลการผ่านการสแกน Cloudflare Turnstile                          | **Secret** | `0x4AAAAAA...`                                               |
| `STREAMLABS_ACCESS_TOKEN`   | โทเคนผู้พัฒนาสิทธิ์สำหรับเข้าถึง API แสดงผลกระดิ่งแจ้งเตือนบน Streamlabs                        | **Secret** | `eyJhbGciOiJIUzI1NiIsIn...`                                  |
| `STREAMELEMENTS_JWT`        | รหัสเข้าใช้งาน JWT เพื่อส่งแจ้งเตือนขึ้นหน้าจอซ้ำสำหรับ StreamElements                          | **Secret** | `eyJhbGciOiJIUzI1NiIsIn...`                                  |
| `STREAMELEMENTS_CHANNEL_ID` | รหัส ID ช่องของคุณที่ลงทะเบียนไว้ใน StreamElements                                              | **Secret** | `65f8a00bc9xxxxxxxxxxxx`                                     |

**แนะนำให้เลือกลง Key แค่ Streamlabs หรือ StreamElements อย่างใดอย่างนึง**

---

## คำถามที่น่าสนใจ

- **เปลี่ยนชื่อเว็บอย่างไร** เปลี่ยนได้ 2 จุด tips-secure(จุดที่ 1).Subdomain(จุดที่ 2).workers.dev/
  จุดที่ 1 ไปที่เมนู **Build > Compute > Workers & Pages > กดที่โครงการของคุณ > Setting > General > Rename**
  จุดที่ 2 ไปที่เมนู **Build > Compute > Workers & Pages > Account Details > Subdomain > รูปดินสอ**

- **ตกแต่งหน้าโดเนทอย่างไร** นำ Link ที่ได้มาเติม admin ตามหลัง ตัวอย่าง `tips-secure.Subdomain.workers.dev/admin` (สำหรับการเปลี่ยนแปลง Font ครั้งแรก จะมีการ download font เบื้องหลังประมาณ 3-4 นาที ระหว่างนั้นจะยังไม่สามารถกด save change ได้) คุณสามารถทักส่วนตัวเพื่อขอลองตกแต่งหน้าโดเนทก่อนได้ ผมจะให้ลองกับหน้าโดเนทของผมเอง
