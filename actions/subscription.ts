"use server"

import { db } from "@/lib/prisma" // แก้ไข path ให้ตรงกับที่เก็บ prisma client 
import { addMonths, addYears, isAfter } from "date-fns"
import { PlanType } from "@prisma/client"
import { z } from "zod" // 🌟 1. Import Zod เข้ามาใช้งาน

// 🌟 2. สร้าง Schema สำหรับ Validate และ Trim ข้อมูล
const paymentSchema = z.object({
  shopId: z.string().trim().min(1, "ไม่พบรหัสร้านค้า"),
  // ใช้ nativeEnum ดัก Type ของแพ็กเกจให้เป๊ะตามที่ Prisma มี
  planToBuy: z.nativeEnum(PlanType, { errorMap: () => ({ message: "ประเภทแพ็กเกจไม่ถูกต้อง" }) }),
  amount: z.number().min(0, "ยอดเงินไม่ถูกต้อง")
})

// รับค่าเป็น any หรือ string ก่อน เพื่อให้ Zod เป็นตัวกรองและแปลง Type ที่ถูกต้อง
export async function processPaymentSuccess(rawShopId: string, rawPlanToBuy: string | PlanType, rawAmount: number) {
  try {
    // 🌟 3. นำค่ามาผ่าน Zod เพื่อ Validate และ Trim
    const validatedData = paymentSchema.parse({
      shopId: rawShopId,
      planToBuy: rawPlanToBuy,
      amount: rawAmount
    })

    const { shopId, planToBuy, amount } = validatedData

    const shop = await db.shop.findUnique({
      where: { id: shopId }
    })

    if (!shop) throw new Error("ไม่พบข้อมูลร้านค้า")

    const now = new Date()
    
    // 🌟 เช็ควันหมดอายุเดิม (ถ้ายังไม่หมดอายุ ให้เอาวันเดิมมาทบ)
    const baseDate = (shop.expiresAt && isAfter(shop.expiresAt, now)) 
      ? shop.expiresAt 
      : now

    // 🌟 คำนวณวันหมดอายุใหม่ ตามประเภทแพ็กเกจที่ซื้อ
    let newExpiresAt: Date;
    if (planToBuy === "BASIC_MONTHLY" || planToBuy === "PRO_MONTHLY") {
      newExpiresAt = addMonths(baseDate, 1) // +1 เดือน
    } else if (planToBuy === "BASIC_YEARLY" || planToBuy === "PRO_YEARLY") {
      newExpiresAt = addYears(baseDate, 1)  // +1 ปี
    } else if (planToBuy === "LIFETIME") {
      newExpiresAt = addYears(baseDate, 99) // ตลอดชีพ (+99 ปีไปเลย)
    } else {
      newExpiresAt = addMonths(baseDate, 1) // Fallback กันเหนียว
    }

    // 🌟 บันทึกลง Database แบบ Transaction (ทำพร้อมกัน 3 ตาราง)
    // เปลี่ยนมาใช้ async (tx) เพื่อให้อ้างอิงตัวแปรข้ามกันได้ง่ายขึ้นถ้าจำเป็น
    await db.$transaction(async (tx) => {
      
      // 1. อัปเดตตารางร้านค้า
      await tx.shop.update({
        where: { id: shopId },
        data: {
          isActive: true,            // 🌟 4. สำคัญ! เปลี่ยนเป็น true เพื่อเปิดให้ร้านเข้าระบบได้ทันที
          planType: planToBuy,       
          planStatus: "ACTIVE",
          subscriptionStartsAt: now, 
          expiresAt: newExpiresAt,   
        }
      })

      // 2. สร้างประวัติการชำระเงิน (Subscription History)
      await tx.subscriptionHistory.create({
        data: {
          shopId: shopId,
          planType: planToBuy,       
          amountPaid: amount,
          previousExpiresAt: shop.expiresAt, 
          newExpiresAt: newExpiresAt,        
          status: "COMPLETED",
          // slipUrl: "", // 💡 หากมีการอัปโหลดสลิปลง Storage สามารถนำ URL มาใส่ตรงนี้ได้
        }
      })

      // 🌟 5. สร้างบิลใบเสร็จ (Payment Transaction)
      await tx.paymentTransaction.create({
        data: {
          shopId: shopId,
          amount: amount,
          baseAmount: amount, // ยอดตั้งต้นก่อนหักส่วนลด (ถ้ามี) ตอนนี้ให้เท่ากับที่จ่ายจริงไปก่อน
          plan: planToBuy,
          status: "APPROVED",
          approvedAt: now,
          isUpgrade: shop.planType !== "FREE_TRIAL", // เช็คว่าเป็นบิลอัปเกรดหรือไม่ (ถ้าเดิมไม่ใช่ตัวฟรี)
          // slipUrl: "", // 💡 หากมีการอัปโหลดสลิปลง Storage สามารถนำ URL มาใส่ตรงนี้ได้
        }
      })

    })

    return { success: true, newExpiresAt }
  } catch (error) {
    console.error("Payment Processing Error:", error)
    
    // 🌟 ดักจับ Error จาก Zod แปลงเป็นภาษาไทยให้อ่านง่าย
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message }
    }
    
    return { success: false, error: error instanceof Error ? error.message : "ไม่สามารถอัปเดตแพ็กเกจได้" }
  }
}