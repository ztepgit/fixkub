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

// 🌟 2. ฟังก์ชันคำนวณวันหมดอายุใหม่ (แก้ไขให้รองรับ Free Trial)
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

  // 🌟 จุดแก้ไขสำคัญ: หา Base Date โดยพิจารณาทั้ง expiresAt และ trialEndsAt
  let baseDate = now;
  const effectiveCurrentExpiry = shop.expiresAt || shop.trialEndsAt;

  // ถ้ามีวันหมดอายุเดิม (ไม่ว่าจากแพ็กเกจ หรือ จากช่วงทดลอง) และยังไม่หมดอายุ 
  // ให้เอาวันนั้นมาเป็นตัวตั้งต้น (ทบวันให้ลูกค้า)
  if (effectiveCurrentExpiry && isAfter(effectiveCurrentExpiry, now)) {
    baseDate = effectiveCurrentExpiry;
  }

  // 💡 Logic การแถมฟรี 30 วัน
  // ถ้าไม่เคยจ่ายเงินเลย + ไม่ใช่ช่วง Trial + หมดอายุไปแล้วจริงๆ ถึงจะแถม 30 วัน
  // (ถ้าเป็น Trial อยู่แล้ว ระบบจะทบวัน Trial ที่เหลือให้แทนการแถม 30 วันตรงๆ เพื่อป้องกันสิทธิ์ซ้อนทับ)
  const isNewUserBonusEligible = !hasPaidBefore && !isTrial && !effectiveCurrentExpiry;

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
export async function processPaymentSuccess(
  rawShopId: string,
  rawPlanToBuy: string | PlanType,
  rawAmount: number,
  isWebhook: boolean = false // 💡 เพิ่ม Flag แจ้งว่าเป็น Webhook หรือไม่ (ค่าเริ่มต้นคือ false)
) {
  try {
    // นำค่ามาผ่าน Zod เพื่อ Validate และ Trim
    const validatedData = paymentSchema.parse({
      shopId: rawShopId,
      planToBuy: rawPlanToBuy,
      amount: rawAmount
    })

    const { shopId, planToBuy, amount } = validatedData

    // 🌟 ด่านตรวจสิทธิ์
    if (!isWebhook) {
      await verifyShopAccess(shopId)
    }

    const shop = await db.shop.findUnique({
      where: { id: shopId }
    })

    if (!shop) throw new Error("ไม่พบข้อมูลร้านค้า")

    // เรียกใช้ฟังก์ชันคำนวณวันหมดอายุ
    const newExpiresAt = await calculateNewExpiry(shopId, planToBuy)
    const now = new Date()

    // บันทึกลง Database แบบ Transaction (ทำพร้อมกัน 3 ตาราง)
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
          // 🌟 แก้ไข: บันทึกวันหมดอายุเดิมที่แท้จริง
          previousExpiresAt: shop.expiresAt || shop.trialEndsAt,
          newExpiresAt: newExpiresAt,
          status: "COMPLETED",
          // slipUrl: "", 
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
          // slipUrl: "", 
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