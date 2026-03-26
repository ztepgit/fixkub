import { z } from "zod"

// 🌟 รายการคำสงวนที่ห้ามนำมาตั้งเป็น Subdomain เด็ดขาด (เพิ่มเติมคำพื้นฐานที่ระบบมักจะใช้)
const RESERVED_SLUGS = [
  "www", "admin", "api", "app", "dashboard", "super-admin", 
  "login", "register", "pay", "payment", "support", "shop", 
  "esyq", "mail", "cdn", "static", "checkout", "auth"
];

export const createShopSchema = z.object({
  // 🌟 เพิ่ม .trim() ป้องกันการเผลอเคาะวรรคหัวท้าย
  name: z.string().trim().min(2, "ชื่อร้านต้องมีอย่างน้อย 2 ตัวอักษร"),
  
  slug: z.string()
    .trim()
    .toLowerCase() // 🌟 Normalize: บังคับแปลงเป็นตัวพิมพ์เล็กให้เลย (กันเหนียว)
    .min(3, "Slug ต้องมีอย่างน้อย 3 ตัวอักษร")
    // 🌟 อัปเดต Regex: ห้ามขึ้นต้นหรือลงท้ายด้วยขีดกลาง (-)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "URL ต้องเป็นตัวพิมพ์เล็ก ตัวเลข และขีดกลาง (-) อยู่ตรงกลางเท่านั้น")
    // 🌟 ดักคำสงวนตรงนี้! ใช้ .includes() เช็คใน Array
    .refine((val) => !RESERVED_SLUGS.includes(val), {
      message: "ไม่สามารถใช้คำนี้ตั้งเป็น URL ได้ (เป็นคำสงวนของระบบ)",
    }),
  
  logoUrl: z.string().trim().url("รูปแบบ URL ไม่ถูกต้อง").optional().or(z.literal("")),
  
  themeColor: z.string().trim().default("#10b981"),
  
  ownerEmail: z.string()
    .trim()
    .toLowerCase() // 🌟 Normalize: อีเมลควรเป็นตัวพิมพ์เล็กเสมอ ป้องกันปัญหาตอน Login
    .email("รูปแบบอีเมลไม่ถูกต้อง"),
  
  planType: z.enum([
    "FREE_TRIAL", "BASIC_MONTHLY", "BASIC_YEARLY", 
    "PRO_MONTHLY", "PRO_YEARLY", "LIFETIME"
  ]),
  
  trialDays: z.coerce.number().min(0).max(90).default(30),
  
  startImmediately: z.boolean().default(false),
  
  // 🌟 เพิ่ม .toUpperCase() เพื่อให้รหัสตัวแทน (เช่น AG-001) เป็นฟอร์แมตมาตรฐานเดียวกันหมดใน DB
  agentCode: z.string().trim().toUpperCase().optional().or(z.literal("")),
  
  isActive: z.boolean().default(true)
})

export type CreateShopInput = z.infer<typeof createShopSchema>