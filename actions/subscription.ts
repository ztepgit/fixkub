"use server"

import { db } from "@/lib/prisma"
import { addMonths, addYears, isAfter, differenceInDays } from "date-fns"
import { PlanType } from "@prisma/client"
import { z } from "zod"
import { verifyShopAccess } from "@/lib/auth-guard"

// 🌟 ราคามาตรฐานสำหรับคำนวณ Prorate (อ้างอิงจากราคาขายจริง)
const PRICE_TABLE: Record<PlanType, number> = {
  FREE_TRIAL: 0,
  BASIC_MONTHLY: 199,
  BASIC_YEARLY: 1690,
  PRO_MONTHLY: 299, // สมมติราคา Pro
  PRO_YEARLY: 2590, // สมมติราคา Pro
  LIFETIME: 9900,   // สมมติราคา
}

const paymentSchema = z.object({
  shopId: z.string().trim().min(1, "ไม่พบรหัสร้านค้า"),
  planToBuy: z.nativeEnum(PlanType, { errorMap: () => ({ message: "ประเภทแพ็กเกจไม่ถูกต้อง" }) }),
  amount: z.number().min(0, "ยอดเงินไม่ถูกต้อง"),
  transRef: z.string().trim().min(1, "ไม่พบรหัสอ้างอิงการโอนเงิน (Transaction Ref)")
})

// ==========================================
// 🌟 ฟังก์ชันคำนวณวันหมดอายุใหม่และเครดิตคงเหลือ (Credit-Based Proration)
// ==========================================
export async function calculateNewExpiryAndProrate(shopId: string, planToBuy: PlanType) {
  const now = new Date();

  const shop = await db.shop.findUnique({
    where: { id: shopId }
  });

  if (!shop) throw new Error("ไม่พบร้านค้า");

  const effectiveCurrentExpiry = shop.expiresAt || shop.trialEndsAt;
  const isTrial = shop.planType === "FREE_TRIAL";
  const hasTimeLeft = effectiveCurrentExpiry && isAfter(effectiveCurrentExpiry, now);

  let prorateCredit = 0;
  let baseDate = now; // 🌟 แบบ Prorate เราจะเริ่มนับวันใหม่จาก "วันนี้" เสมอ

  // 💡 ถ้าเป็นช่วงทดลองใช้ฟรี หรือไม่มีวันเหลือ -> ไม่มีการหักเครดิต
  // แต่ถ้าเป็นลูกค้าที่มีแพ็กเกจจ่ายเงินเดิม และยังมีวันเหลือ -> แปลงวันเป็นเครดิต
  if (hasTimeLeft && !isTrial && effectiveCurrentExpiry) {
    const daysLeft = differenceInDays(effectiveCurrentExpiry, now);
    const currentPlanPrice = PRICE_TABLE[shop.planType];
    
    // หาว่าแพ็กเกจเดิมหารเฉลี่ยตกวันละกี่บาท (คิดฐาน 30 วัน/เดือน หรือ 365 วัน/ปี)
    let dailyRate = 0;
    if (shop.planType.includes("MONTHLY")) {
      dailyRate = currentPlanPrice / 30;
    } else if (shop.planType.includes("YEARLY")) {
      dailyRate = currentPlanPrice / 365;
    } else if (shop.planType === "LIFETIME") {
      dailyRate = 0; // Lifetime ทบไม่ได้
    }

    // มูลค่าเงินคงเหลือที่ตีเป็นส่วนลดได้
    prorateCredit = Math.max(0, parseFloat((daysLeft * dailyRate).toFixed(2)));
  }

  // 💡 Logic โบนัสฟรี 30 วันสำหรับผู้ใช้ใหม่ 
  // (ถ้าหมดช่วงทดลองแล้วเพิ่งมาซื้อครั้งแรก)
  const paidHistoryCount = await db.subscriptionHistory.count({
    where: { shopId, status: "COMPLETED" }
  });
  const isNewUserBonusEligible = paidHistoryCount === 0 && !isTrial && !effectiveCurrentExpiry;
  if (isNewUserBonusEligible) {
    baseDate = addMonths(baseDate, 1);
  }

  // 💡 คำนวณวันหมดอายุใหม่ เริ่มจาก "วันนี้ (หรือเดือนหน้าถ้าได้โบนัส)"
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

  // 💡 ข้อมูลที่จะคืนกลับไป
  const baseAmount = PRICE_TABLE[planToBuy];
  const finalAmountToPay = Math.max(0, baseAmount - prorateCredit); // ยอดที่ต้องโอนจริง (ไม่ติดลบ)

  return { 
    newExpiresAt, 
    prorateCredit, 
    baseAmount,
    finalAmountToPay
  };
}

// ==========================================
// 🌟 3. ฟังก์ชันหลักสำหรับประมวลผลการจ่ายเงินสำเร็จ
// ==========================================
export async function processPaymentSuccess(
  rawShopId: string,
  rawPlanToBuy: string | PlanType,
  rawAmount: number,
  rawTransRef: string,
  isWebhook: boolean = false 
) {
  try {
    const validatedData = paymentSchema.parse({
      shopId: rawShopId,
      planToBuy: rawPlanToBuy,
      amount: rawAmount,
      transRef: rawTransRef
    })

    const { shopId, planToBuy, amount, transRef } = validatedData

    if (!isWebhook) {
      await verifyShopAccess(shopId)
    }

    // 🌟 ป้องกัน Replay Attack
    const existingTransaction = await db.paymentTransaction.findUnique({
      where: { transRef: transRef }
    })

    if (existingTransaction) {
      throw new Error(`สลิปนี้ถูกใช้งานไปแล้วเมื่อ ${existingTransaction.createdAt.toLocaleString("th-TH")} ไม่สามารถนำกลับมาใช้ซ้ำได้`)
    }

    const shop = await db.shop.findUnique({
      where: { id: shopId }
    })

    if (!shop) throw new Error("ไม่พบข้อมูลร้านค้า")

    // 🌟 เรียกใช้ฟังก์ชันที่คำนวณแบบ Proration แล้ว
    const { newExpiresAt, prorateCredit, baseAmount } = await calculateNewExpiryAndProrate(shopId, planToBuy)
    const now = new Date()

    await db.$transaction(async (tx) => {

      // 1. อัปเดตร้านค้า (วันหมดอายุใหม่)
      await tx.shop.update({
        where: { id: shopId },
        data: {
          isActive: true,            
          planType: planToBuy,
          planStatus: "ACTIVE",
          subscriptionStartsAt: now, // อัปเดตวันเริ่มบิลใหม่เป็นวันนี้
          expiresAt: newExpiresAt,
        }
      })

      // 2. สร้างประวัติ
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

      // 3. บิลการเงิน (เก็บบันทึกมูลค่าเครดิตที่ใช้ทบยอดด้วย)
      await tx.paymentTransaction.create({
        data: {
          shopId: shopId,
          amount: amount,           // ยอดที่โอนจริง
          baseAmount: baseAmount,   // ราคาเต็มของแพ็กเกจ
          prorateCredit: prorateCredit, // เครดิตที่ได้จากวันคงเหลือของแพ็กเก่า
          plan: planToBuy,
          status: "APPROVED",
          approvedAt: now,
          isUpgrade: shop.planType !== "FREE_TRIAL",
          transRef: transRef,
        }
      })

    })

    return { success: true, newExpiresAt, prorateCredit }
  } catch (error: any) {
    console.error("Payment Processing Error:", error)

    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message }
    }

    return { success: false, error: error instanceof Error ? error.message : "ไม่สามารถอัปเดตแพ็กเกจได้" }
  }
}