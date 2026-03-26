"use server"

import { db } from "@/lib/prisma"
// 🌟 แนะนำให้ดึง Type มาจาก Prisma ด้วยเพื่อความแม่นยำ
import { PlanType } from "@prisma/client"
import { createShopSchema, type CreateShopInput } from "@/lib/validations/shop"

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
          // 🌟 ลบ promptpayId และ accountName ออกจากตรงนี้แล้ว เพราะมันไปอยู่ SystemSetting แทนครับ
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

// วางต่อท้ายไฟล์ actions/super-admin.ts
export async function checkSlugAvailability(slug: string) {
  try {
    const exists = await db.shop.findUnique({
      where: { slug },
      select: { id: true }
    });
    return { success: true, available: !exists };
  } catch (error) {
    console.error("Check Slug Error:", error);
    return { success: false, error: "ไม่สามารถตรวจสอบ URL ได้" };
  }
}