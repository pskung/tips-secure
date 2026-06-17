// src/lib/utils/schemas.ts
import { z } from "zod";

// กฎตรวจสอบรูปแบบสี HEX คลอบคลุมทั้ง 3 และ 6 หลัก
const hexColorRegex = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

// 1. โครงสร้างความถูกต้องสำหรับการสนับสนุน (Donate API Input Schema)
export const DonateInputSchema = z.object({
  name: z
    .string()
    .min(2, "กรุณาตรวจสอบความถูกต้องของชื่อเล่นค่ะ")
    .max(25, "กรุณาตรวจสอบความถูกต้องของชื่อเล่นค่ะ")
    .regex(
      /^[a-zA-Z0-9\u0e00-\u0e7f\s._-]+$/,
      "กรุณาตรวจสอบความถูกต้องของชื่อเล่นค่ะ",
    ),
  amount: z.coerce
    .number()
    .min(10.0, "ยอดเงินโดเนทขั้นต่ำต้องอยู่ระหว่าง 10 - 5,000 บาทค่ะ")
    .max(5000.0, "ยอดเงินโดเนทขั้นต่ำต้องอยู่ระหว่าง 10 - 5,000 บาทค่ะ"),
  message: z
    .string()
    .max(255, "ข้อความยาวเกิน 255 ตัวอักษรค่ะ")
    .optional()
    .or(z.literal("")),
  is_consented: z.boolean().refine((val) => val === true, {
    message: "กรุณากดยินยอมยอมรับนโยบายก่อนดำเนินรายการค่ะ",
  }),
  email_confirm: z
    .string()
    .max(0, "Operation rejected")
    .optional()
    .or(z.literal("")), // Honeypot Block
  turnstile_token: z.string().min(1, "กรุณารอระบบยืนยันตัวตนสักครู่น้า 🔒"),
  render_time: z.coerce.number().optional(),
});

// 2. โครงสร้างดีไซน์สำหรับบันทึกหน้าแอดมิน (Admin Theme Save Schema)
export const ThemeSchema = z.object({
  mainFontFamily: z.string().min(1, "กรุณาระบุรูปแบบฟอนต์หลัก"),
  vtuberName: z.string().min(1, "กรุณาระบุชื่อสตรีมเมอร์"),
  welcomeText: z.string().min(1, "กรุณากรอกข้อความต้อนรับ"),
  bgType: z.enum(["solid", "image"]),
  bgColor: z.string().regex(hexColorRegex, "รูปแบบสีพื้นหลังไม่ถูกต้อง"),
  cardBgColor: z.string().regex(hexColorRegex, "รูปแบบสีกล่องไม่ถูกต้อง"),
  generalTextColor: z
    .string()
    .regex(hexColorRegex, "รูปแบบสีข้อความทั่วไปไม่ถูกต้อง"),
  inputBgColor: z.string().regex(hexColorRegex, "รูปแบบสีช่องกรอกไม่ถูกต้อง"),
  inputTextColor: z
    .string()
    .regex(hexColorRegex, "รูปแบบสีข้อความช่องกรอกไม่ถูกต้อง"),
  submitBtnColor: z
    .string()
    .regex(hexColorRegex, "รูปแบบสีปุ่มสนับสนุนไม่ถูกต้อง"),
  submitBtnTextColor: z
    .string()
    .regex(hexColorRegex, "รูปแบบสีข้อความปุ่มไม่ถูกต้อง"),

  // ตัวเลือกเสริมที่สามารถเป็นสตริงว่างหรือไม่มีการส่งมาได้ (Optional Links & Styles)
  avatarUrl: z.string().optional().or(z.literal("")),
  bannerUrl: z.string().optional().or(z.literal("")),
  bgUrl: z.string().optional().or(z.literal("")),
  nameColor: z.string().regex(hexColorRegex).optional().or(z.literal("")),
  inputBorderColor: z
    .string()
    .regex(hexColorRegex)
    .optional()
    .or(z.literal("")),
  cardBorderColor: z.string().regex(hexColorRegex).optional().or(z.literal("")),
  presetBorderColor: z
    .string()
    .regex(hexColorRegex)
    .optional()
    .or(z.literal("")),
  youtubeUrl: z.string().optional().or(z.literal("")),
  twitchUrl: z.string().optional().or(z.literal("")),
  discordUrl: z.string().optional().or(z.literal("")),
  xUrl: z.string().optional().or(z.literal("")),
  facebookUrl: z.string().optional().or(z.literal("")),
  instagramUrl: z.string().optional().or(z.literal("")),
  tiktokUrl: z.string().optional().or(z.literal("")),

  // ตรวจสอบลิสต์ยอดเงินช่วยเหลือด่วน (Preset Amounts) จำนวน 4 ยอด
  presetAmounts: z
    .array(z.number().min(10).max(5000))
    .length(4, "ต้องระบุยอดสนับสนุนด่วนให้ครบถ้วน 4 ยอด"),
});

// ตรรกะดึง Type Inference ออกไปเป็น TypeScript Static Types แบบอัตโนมัติ
export type DonateInput = z.infer<typeof DonateInputSchema>;
export type ThemeConfig = z.infer<typeof ThemeSchema>;
