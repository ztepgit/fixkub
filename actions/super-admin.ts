"use server"

import { db } from "@/lib/prisma"
import { z } from "zod"
// 🌟 แนะนำให้ดึง Type มาจาก Prisma ด้วยเพื่อความแม่นยำ
import { PlanType } from "@prisma/client"

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
    const data = createShopSchema.parse(input)

    const exists = await db.shop.findUnique({
      where: { slug: data.slug }
    })
    if (exists) {
      return { success: false, error: "URL (Slug) นี้มีผู้ใช้งานแล้ว กรุณาเปลี่ยนใหม่" }
    }

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
    let expiresAt = new Date(now)
    let subscriptionStartsAt = null

    // สเต็ป 4.1: ให้สิทธิ์ทดลองใช้ฟรี
    if (data.trialDays > 0) {
      expiresAt.setDate(expiresAt.getDate() + data.trialDays) 
      trialEndsAt = new Date(expiresAt) 
    }

    // สเต็ป 4.2: ถ้า "เริ่มบิลทันที" ทบวันตามแพ็กเกจ
    if (data.startImmediately) {
      subscriptionStartsAt = now 

      // 🌟 ใช้การเทียบค่าตรงๆ แทน .includes() เพื่อไม่ให้ TypeScript บ่น
      if (data.planType === "BASIC_MONTHLY" || data.planType === "PRO_MONTHLY") {
        expiresAt.setMonth(expiresAt.getMonth() + 1)
      } else if (data.planType === "BASIC_YEARLY" || data.planType === "PRO_YEARLY") {
        expiresAt.setFullYear(expiresAt.getFullYear() + 1)
      } else if (data.planType === "LIFETIME") {
        expiresAt.setFullYear(expiresAt.getFullYear() + 99)
      }
    }

    // 5. บันทึกข้อมูลด้วย Transaction
    const newShop = await db.$transaction(async (tx) => {
      
      const shop = await tx.shop.create({
        data: {
          name: data.name,
          slug: data.slug,
          logoUrl: data.logoUrl || null,
          themeColor: data.themeColor,
          planType: data.planType as PlanType, // คอนเฟิร์ม Type ให้ Prisma
          trialEndsAt,
          subscriptionStartsAt,
          expiresAt,
          isActive: data.isActive,
          agentId: agent?.id
        }
      })

      await tx.shopOwner.create({
        data: {
          email: data.ownerEmail,
          shopId: shop.id,
          role: "OWNER"
        }
      })

      // 🌟 [แนะนำเพิ่ม] ถ้าแอดมินสั่งเริ่มแพ็กเกจจ่ายเงินทันที ให้สร้างประวัติบิลหลอกๆ ไว้ด้วย
      if (data.startImmediately && data.planType !== "FREE_TRIAL") {
        await tx.subscriptionHistory.create({
          data: {
            shopId: shop.id,
            planType: data.planType as PlanType,
            amountPaid: 0, // ยอด 0 บาท เพราะเปิดโดยแอดมิน
            newExpiresAt: expiresAt,
            status: "COMPLETED",
            slipUrl: "SYSTEM_GRANTED", // ทำเครื่องหมายไว้ว่าสร้างจากระบบหลังบ้าน
          }
        })
      }

      return shop
    })

    return { success: true, data: newShop }

  } catch (error: any) {
    console.error("Create Shop Error:", error)
    return { success: false, error: error.message || "เกิดข้อผิดพลาดในการสร้างร้านค้า" }
  }
}