//actions/suoer-admin.ts

"use server"

import { db } from "@/lib/prisma"
import { PlanType } from "@prisma/client"
import { z } from "zod" 
import { createShopSchema, type CreateShopInput } from "@/lib/validations/shop"
import { createClient } from "@/lib/supabase/server" // 🌟 1. เพิ่ม import เพื่อใช้เช็ค Session

// ==========================================
// 🌟 ฟังก์ชันใหม่: ด่านตรวจสำหรับ Super Admin
// ==========================================
async function verifySuperAdmin() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()

  // 💡 เปลี่ยนตรงนี้เป็นอีเมลหลักที่คุณใช้ล็อกอินเป็น Super Admin
  // หรือตั้งใน .env ว่า SUPER_ADMIN_EMAIL=your-email@gmail.com ก็ได้ครับ
  const SUPER_ADMIN_EMAIL = process.env.SUPER_ADMIN_EMAIL

  if (!session?.user?.email || session.user.email !== SUPER_ADMIN_EMAIL) {
    throw new Error("Forbidden: ท่านไม่มีสิทธิ์ใช้งานส่วนนี้ (เฉพาะ Super Admin เท่านั้น)")
  }
  
  return session.user.email
}

// ==========================================
// 1. สร้างร้านค้าโดย Super Admin
// ==========================================
export async function createShopAction(input: CreateShopInput) {
  try {
    // 🌟 2. เรียกใช้ด่านตรวจ ป้องกันแฮกเกอร์แอบยิง API มาสร้างร้าน LIFETIME ฟรี
    await verifySuperAdmin()

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
          planType: data.planType as PlanType, 
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

      if (data.startImmediately && data.planType !== "FREE_TRIAL") {
        await tx.subscriptionHistory.create({
          data: {
            shopId: shop.id,
            planType: data.planType as PlanType,
            amountPaid: 0, 
            newExpiresAt: expiresAt,
            status: "COMPLETED",
            slipUrl: "SYSTEM_GRANTED", 
          }
        })
      }

      return shop
    })

    return { success: true, data: newShop }

  } catch (error: any) {
    console.error("Create Shop Error:", error)
    
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message }
    }
    
    return { success: false, error: error.message || "เกิดข้อผิดพลาดในการสร้างร้านค้า" }
  }
}

// ==========================================
// 2. เช็ค URL ซ้ำ (ปล่อยเป็น Public ไว้เพื่อให้หน้า Onboarding ใช้งานได้)
// ==========================================
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