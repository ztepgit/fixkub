"use server"

import { db } from "@/lib/prisma"
import { z } from "zod"

// 🌟 Zod Schema (ใช้แชร์ร่วมกันระหว่าง FE และ BE)
export const createShopSchema = z.object({
  name: z.string().min(2, "ชื่อร้านต้องมีอย่างน้อย 2 ตัวอักษร"),
  slug: z.string()
    .min(3, "Slug ต้องมีอย่างน้อย 3 ตัวอักษร")
    .regex(/^[a-z0-9-]+$/, "Slug ต้องเป็นตัวพิมพ์เล็ก ตัวเลข หรือขีดกลาง (-) เท่านั้น"),
  logoUrl: z.string().url("รูปแบบ URL ไม่ถูกต้อง").optional().or(z.literal("")),
  themeColor: z.string().default("#10b981"),
  ownerEmail: z.string().email("รูปแบบอีเมลไม่ถูกต้อง"),
  planType: z.enum([
    "FREE_TRIAL", "BASIC_MONTHLY", "BASIC_YEARLY", 
    "PRO_MONTHLY", "PRO_YEARLY", "LIFETIME"
  ]),
  trialDays: z.coerce.number().min(0).max(90).default(30),
  startImmediately: z.boolean().default(false),
  agentCode: z.string().optional().or(z.literal("")),
  isActive: z.boolean().default(true)
})

export type CreateShopInput = z.infer<typeof createShopSchema>

export async function createShopAction(input: CreateShopInput) {
  try {
    // 1. Validate ข้อมูลฝั่ง Server อีกรอบ (Security)
    const data = createShopSchema.parse(input)

    // 2. เช็ค Slug ซ้ำ
    const exists = await db.shop.findUnique({
      where: { slug: data.slug }
    })
    if (exists) {
      return { success: false, error: "URL (Slug) นี้มีผู้ใช้งานแล้ว กรุณาเปลี่ยนใหม่" }
    }

    // 3. ค้นหา Agent (ถ้ามีการใส่ Code มา)
    let agent = null
    if (data.agentCode) {
      agent = await db.agent.findUnique({
        where: { code: data.agentCode }
      })
      if (!agent) {
        return { success: false, error: "ไม่พบรหัสตัวแทน (Agent Code) นี้ในระบบ" }
      }
    }

    const now = new Date()
    let trialEndsAt = null
    let expiresAt = null
    let subscriptionStartsAt = null

    // 4. คำนวณวันหมดอายุ
    if (!data.startImmediately) {
      // 🌟 กรณีที่ 1: ให้สิทธิ์ทดลองใช้ฟรี (เปิดสวิตช์เป็น ปิด)
      trialEndsAt = new Date(now.getTime() + data.trialDays * 86400000) 
      expiresAt = trialEndsAt 
    } else {
      // 🌟 กรณีที่ 2: เริ่มบิลทันที (เปิดสวิตช์เป็น เปิด)
      subscriptionStartsAt = now
      
      // ให้ระบบคำนวณวันหมดอายุตามแพ็กเกจที่ Super Admin เลือกให้เลย!
      if (data.planType.includes("MONTHLY")) {
        expiresAt = new Date(now.setMonth(now.getMonth() + 1)) // +1 เดือน
      } else if (data.planType.includes("YEARLY")) {
        expiresAt = new Date(now.setFullYear(now.getFullYear() + 1)) // +1 ปี
      } else if (data.planType === "LIFETIME") {
        expiresAt = new Date(now.setFullYear(now.getFullYear() + 99)) // ตลอดชีพ
      } else {
        expiresAt = now // Fallback
      }
    }

    // 5. 🌟 บันทึกข้อมูลด้วย Transaction (สร้างร้าน + สร้างเจ้าของ ต้องสำเร็จทั้งคู่)
    const newShop = await db.$transaction(async (tx) => {
      
      // 5.1 สร้างร้านค้า
      const shop = await tx.shop.create({
        data: {
          name: data.name,
          slug: data.slug,
          logoUrl: data.logoUrl || null,
          themeColor: data.themeColor,
          planType: data.planType,
          trialEndsAt,
          subscriptionStartsAt,
          expiresAt,
          isActive: data.isActive,
          agentId: agent?.id
        }
      })

      // 5.2 สร้าง Account เจ้าของร้าน
      await tx.shopOwner.create({
        data: {
          email: data.ownerEmail,
          shopId: shop.id,
          role: "OWNER"
        }
      })

      return shop
    })

    return { success: true, data: newShop }

  } catch (error: any) {
    console.error("Create Shop Error:", error)
    return { success: false, error: error.message || "เกิดข้อผิดพลาดในการสร้างร้านค้า" }
  }
}