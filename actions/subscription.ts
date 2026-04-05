"use server"

import { db } from "@/lib/prisma"
import { addMonths, addYears, isAfter } from "date-fns"
import { PlanType } from "@prisma/client"
import { z } from "zod"
import { verifyShopAccess } from "@/lib/auth-guard"

// 🌟 1. สร้าง Schema สำหรับ Validate (เพิ่ม transRef)
const paymentSchema = z.object({
  shopId: z.string().trim().min(1, "ไม่พบรหัสร้านค้า"),
  planToBuy: z.nativeEnum(PlanType, { errorMap: () => ({ message: "ประเภทแพ็กเกจไม่ถูกต้อง" }) }),
  amount: z.number().min(0, "ยอดเงินไม่ถูกต้อง"),
  transRef: z.string().trim().min(1, "ไม่พบรหัสอ้างอิงการโอนเงิน (Transaction Ref)") // 🌟 เพิ่มบรรทัดนี้
})

// 🌟 2. ฟังก์ชันคำนวณวันหมดอายุใหม่ (แก้ไขให้รองรับ Free Trial)
export async function calculateNewExpiry(shopId: string, planToBuy: PlanType): Promise<Date> {
  const now = new Date();

  const shop = await db.shop.findUnique({
    where: { id: shopId }
  });

  if (!shop) throw new Error("ไม่พบร้านค้า");

  const paidHistoryCount = await db.subscriptionHistory.count({
    where: { shopId, status: "COMPLETED" }
  });

  const hasPaidBefore = paidHistoryCount > 0;
  const isTrial = shop.planType === "FREE_TRIAL";

  let baseDate = now;
  const effectiveCurrentExpiry = shop.expiresAt || shop.trialEndsAt;

  if (effectiveCurrentExpiry && isAfter(effectiveCurrentExpiry, now)) {
    baseDate = effectiveCurrentExpiry;
  }

  const isNewUserBonusEligible = !hasPaidBefore && !isTrial && !effectiveCurrentExpiry;

  if (isNewUserBonusEligible) {
    baseDate = addMonths(baseDate, 1); 
  }

  let newExpiresAt = baseDate;
  if (planToBuy === "BASIC_MONTHLY" || planToBuy === "PRO_MONTHLY") {
    newExpiresAt = addMonths(newExpiresAt, 1); 
  } else if (planToBuy === "BASIC_YEARLY" || planToBuy === "PRO_YEARLY") {
    newExpiresAt = addYears(newExpiresAt, 1);  
  } else if (planToBuy === "LIFETIME") {
    newExpiresAt = addYears(newExpiresAt, 99); 
  } else {
    newExpiresAt = addMonths(newExpiresAt, 1); 
  }

  return newExpiresAt;
}

// 🌟 3. ฟังก์ชันหลักสำหรับประมวลผลการจ่ายเงินสำเร็จ
export async function processPaymentSuccess(
  rawShopId: string,
  rawPlanToBuy: string | PlanType,
  rawAmount: number,
  rawTransRef: string, // 🌟 เพิ่มพารามิเตอร์รับค่า transRef
  isWebhook: boolean = false 
) {
  try {
    const validatedData = paymentSchema.parse({
      shopId: rawShopId,
      planToBuy: rawPlanToBuy,
      amount: rawAmount,
      transRef: rawTransRef // 🌟 ส่งไป Validate
    })

    const { shopId, planToBuy, amount, transRef } = validatedData

    if (!isWebhook) {
      await verifyShopAccess(shopId)
    }

    // 🌟 ด่านอรหันต์: เช็คว่าเคยมีบิลไหนใช้สลิป (transRef) ใบนี้จ่ายเงินไปแล้วหรือยัง?
    const existingTransaction = await db.paymentTransaction.findUnique({
      where: { transRef: transRef }
    })

    if (existingTransaction) {
      // โดน Replay Attack! มีคนเอาสลิปเก่ามาใช้ซ้ำ เตะออกทันที
      throw new Error(`สลิปนี้ถูกใช้งานไปแล้วเมื่อ ${existingTransaction.createdAt.toLocaleString("th-TH")} ไม่สามารถนำกลับมาใช้ซ้ำได้`)
    }

    const shop = await db.shop.findUnique({
      where: { id: shopId }
    })

    if (!shop) throw new Error("ไม่พบข้อมูลร้านค้า")

    const newExpiresAt = await calculateNewExpiry(shopId, planToBuy)
    const now = new Date()

    await db.$transaction(async (tx) => {

      await tx.shop.update({
        where: { id: shopId },
        data: {
          isActive: true,            
          planType: planToBuy,
          planStatus: "ACTIVE",
          subscriptionStartsAt: now,
          expiresAt: newExpiresAt,
        }
      })

      await tx.subscriptionHistory.create({
        data: {
          shopId: shopId,
          planType: planToBuy,
          amountPaid: amount,
          previousExpiresAt: shop.expiresAt || shop.trialEndsAt,
          newExpiresAt: newExpiresAt,
          status: "COMPLETED",
        }
      })

      await tx.paymentTransaction.create({
        data: {
          shopId: shopId,
          amount: amount,
          baseAmount: amount, 
          plan: planToBuy,
          status: "APPROVED",
          approvedAt: now,
          isUpgrade: shop.planType !== "FREE_TRIAL",
          transRef: transRef, // 🌟 บันทึกรหัสอ้างอิงลง Database!
        }
      })

    })

    return { success: true, newExpiresAt }
  } catch (error: any) {
    console.error("Payment Processing Error:", error)

    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message }
    }

    return { success: false, error: error instanceof Error ? error.message : "ไม่สามารถอัปเดตแพ็กเกจได้" }
  }
}