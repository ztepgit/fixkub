"use server"

import { db } from "@/lib/prisma" 
import { addMonths, addYears, isAfter } from "date-fns"
import { PlanType } from "@prisma/client"
import { z } from "zod" 
import { verifyShopAccess } from "@/lib/auth-guard" 

// 🌟 1. สร้าง Schema สำหรับ Validate และ Trim ข้อมูล
const paymentSchema = z.object({
  shopId: z.string().trim().min(1, "ไม่พบรหัสร้านค้า"),
  planToBuy: z.nativeEnum(PlanType, { errorMap: () => ({ message: "ประเภทแพ็กเกจไม่ถูกต้อง" }) }),
  amount: z.number().min(0, "ยอดเงินไม่ถูกต้อง")
})

// 🌟 2. ฟังก์ชันคำนวณวันหมดอายุใหม่ (แยกลูกค้าเก่า/ใหม่)
export async function calculateNewExpiry(shopId: string, planToBuy: PlanType): Promise<Date> {
  const now = new Date();

  const shop = await db.shop.findUnique({
    where: { id: shopId }
  });

  if (!shop) throw new Error("ไม่พบร้านค้า");

  // เช็คประวัติว่าเคยจ่ายเงินมาก่อนหรือไม่
  const paidHistoryCount = await db.subscriptionHistory.count({
    where: { shopId, status: "COMPLETED" }
  });

  const hasPaidBefore = paidHistoryCount > 0;
  const isTrial = shop.planType === "FREE_TRIAL";

  // หา Base Date (ตั้งต้นจากวันหมดอายุเดิม หรือ วันนี้)
  let baseDate = now;
  if (shop.expiresAt && isAfter(shop.expiresAt, now)) {
    baseDate = shop.expiresAt;
  }

  // 💡 Logic การแถมฟรี 30 วัน
  // ถ้าไม่เคยจ่ายเงิน + ไม่ได้อยู่ในสถานะทดลองใช้ + วันหมดอายุเดิมไม่มีหรือหมดไปแล้ว -> ถือเป็นลูกค้าใหม่ซิงๆ ให้แถม 30 วัน
  const isNewUserBonusEligible = !hasPaidBefore && !isTrial && !isAfter(shop.expiresAt || new Date(0), now);
  
  if (isNewUserBonusEligible) {
    baseDate = addMonths(baseDate, 1); // บวกฟรี 1 เดือน (30 วัน) เป็นโบนัสตั้งต้น
  }

  // คำนวณวันหมดอายุใหม่ ตามประเภทแพ็กเกจที่ซื้อทบเข้าไป
  let newExpiresAt = baseDate;
  if (planToBuy === "BASIC_MONTHLY" || planToBuy === "PRO_MONTHLY") {
    newExpiresAt = addMonths(newExpiresAt, 1); // +1 เดือน
  } else if (planToBuy === "BASIC_YEARLY" || planToBuy === "PRO_YEARLY") {
    newExpiresAt = addYears(newExpiresAt, 1);  // +1 ปี
  } else if (planToBuy === "LIFETIME") {
    newExpiresAt = addYears(newExpiresAt, 99); // ตลอดชีพ (+99 ปีไปเลย)
  } else {
    newExpiresAt = addMonths(newExpiresAt, 1); // Fallback กันเหนียว
  }

  return newExpiresAt;
}

// 🌟 3. ฟังก์ชันหลักสำหรับประมวลผลการจ่ายเงินสำเร็จ
export async function processPaymentSuccess(rawShopId: string, rawPlanToBuy: string | PlanType, rawAmount: number) {
  try {
    // นำค่ามาผ่าน Zod เพื่อ Validate และ Trim
    const validatedData = paymentSchema.parse({
      shopId: rawShopId,
      planToBuy: rawPlanToBuy,
      amount: rawAmount
    })

    const { shopId, planToBuy, amount } = validatedData

    // ด่านตรวจสิทธิ์: ป้องกันคนอื่นยิง API มาอัปเดตแพ็กเกจมั่วๆ หรือเติมเงินให้ร้านคนอื่น
    await verifyShopAccess(shopId)

    const shop = await db.shop.findUnique({
      where: { id: shopId }
    })

    if (!shop) throw new Error("ไม่พบข้อมูลร้านค้า")

    // 🌟 4. เรียกใช้ฟังก์ชันคำนวณวันหมดอายุสุดฉลาดของเรา!
    const newExpiresAt = await calculateNewExpiry(shopId, planToBuy)
    const now = new Date()

    // 🌟 5. บันทึกลง Database แบบ Transaction (ทำพร้อมกัน 3 ตารางเพื่อความชัวร์ 100%)
    await db.$transaction(async (tx) => {
      
      // 1. อัปเดตตารางร้านค้า
      await tx.shop.update({
        where: { id: shopId },
        data: {
          isActive: true,            // สำคัญ! เปลี่ยนเป็น true เพื่อเปิดให้ร้านเข้าระบบได้ทันที
          planType: planToBuy,       
          planStatus: "ACTIVE",
          subscriptionStartsAt: now, 
          expiresAt: newExpiresAt,   
        }
      })

      // 2. สร้างประวัติการแพ็กเกจ (Subscription History)
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

      // 3. สร้างบิลการเงิน (Payment Transaction)
      await tx.paymentTransaction.create({
        data: {
          shopId: shopId,
          amount: amount,
          baseAmount: amount, // ยอดตั้งต้นก่อนหักส่วนลด (ถ้ามี)
          plan: planToBuy,
          status: "APPROVED",
          approvedAt: now,
          isUpgrade: shop.planType !== "FREE_TRIAL", // เช็คว่าเป็นบิลอัปเกรดหรือไม่ (ถ้าเดิมไม่ใช่ตัวฟรี)
          // slipUrl: "", // 💡 หากมีการอัปโหลดสลิปลง Storage สามารถนำ URL มาใส่ตรงนี้ได้
        }
      })

    })

    return { success: true, newExpiresAt }
  } catch (error: any) {
    console.error("Payment Processing Error:", error)
    
    // ดักจับ Error จาก Zod แปลงเป็นภาษาไทยให้อ่านง่าย
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message }
    }
    
    return { success: false, error: error instanceof Error ? error.message : "ไม่สามารถอัปเดตแพ็กเกจได้" }
  }
}