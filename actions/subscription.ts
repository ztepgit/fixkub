// actions/subscription.ts

"use server"

import { db } from "@/lib/prisma"
// 🌟 เปลี่ยนจาก addMonths, addYears เป็น addDays
import { addDays, isAfter, differenceInDays } from "date-fns"
import { PlanType } from "@prisma/client"
import { z } from "zod"
import { verifyShopAccess } from "@/lib/auth-guard"
import { createClient } from "@/lib/supabase/server"

// 🌟 เปลี่ยนจากการดึง generateUniqueReceiptNo เป็น generateAndCreateReceipt 
import { generateAndCreateReceipt } from "@/actions/receipt"
import { generateReceiptPDF } from "@/lib/receipt-generator"

// 🌟 ราคามาตรฐานสำหรับคำนวณ Prorate (อ้างอิงจากราคาขายจริง) เทส1บาท
const PRICE_TABLE: Record<PlanType, number> = {
  PENDING_PAYMENT: 0,
  FREE_TRIAL: 0,
  BASIC_MONTHLY: 1,
  BASIC_YEARLY: 2290,
  PRO_MONTHLY: 399,
  PRO_YEARLY: 3290,
  LIFETIME: 9900
}


const paymentSchema = z.object({
  shopId: z.string().trim().min(1, "ไม่พบรหัสร้านค้า"),
  planToBuy: z.nativeEnum(PlanType, { errorMap: () => ({ message: "ประเภทแพ็กเกจไม่ถูกต้อง" }) }),
  amount: z.number().min(0, "ยอดเงินไม่ถูกต้อง"),
  transRef: z.string().trim().min(1, "ไม่พบรหัสอ้างอิงการโอนเงิน (Transaction Ref)")
})

// ==========================================
// 🌟 1. ฟังก์ชันคำนวณวันหมดอายุสำหรับการ "ต่ออายุ" (Renewal)
// ไม่มีการคำนวณ Prorate ทบเวลาจากวันหมดอายุเดิมเสมอ
// ==========================================
export async function calculateRenewalExpiry(shopId: string, planToBuy: PlanType) {
  const now = new Date();

  const shop = await db.shop.findUnique({
    where: { id: shopId }
  });

  if (!shop) throw new Error("ไม่พบร้านค้า");

  const effectiveCurrentExpiry = shop.expiresAt || shop.trialEndsAt;
  const hasActiveTrial =
    shop.planType === "FREE_TRIAL" &&
    !!shop.trialEndsAt;

  let baseDate = (effectiveCurrentExpiry && isAfter(effectiveCurrentExpiry, now))
    ? effectiveCurrentExpiry
    : now;

  const paidHistoryCount =
    await db.subscriptionHistory.count({
      where: {
        shopId,
        status: "COMPLETED",
        amountPaid: {
          gt: 0
        }
      }
    });

  const isNewUserBonusEligible =
    paidHistoryCount === 0 &&
    !shop.hasUsedTrial &&
    !hasActiveTrial &&
    !effectiveCurrentExpiry;
  if (isNewUserBonusEligible) {
    // 🌟 เปลี่ยนโบนัสฟรีเป็น 30 วันเต็ม
    baseDate = addDays(baseDate, 30);
  }

  let newExpiresAt = baseDate;
  if (planToBuy === "BASIC_MONTHLY" || planToBuy === "PRO_MONTHLY") {
    // 🌟 แพ็กเกจรายเดือน = +30 วัน
    newExpiresAt = addDays(newExpiresAt, 30);
  } else if (planToBuy === "BASIC_YEARLY" || planToBuy === "PRO_YEARLY") {
    // 🌟 แพ็กเกจรายปี = +365 วัน
    newExpiresAt = addDays(newExpiresAt, 365);
  } else if (planToBuy === "LIFETIME") {
    newExpiresAt = addDays(newExpiresAt, 365 * 99); // 99 ปี
  } else {
    // 🌟 ค่าเริ่มต้น = +30 วัน
    newExpiresAt = addDays(newExpiresAt, 30);
  }

  const baseAmount = PRICE_TABLE[planToBuy];
  const finalAmountToPay = baseAmount;

  return {
    newExpiresAt,
    prorateCredit: 0,
    baseAmount,
    finalAmountToPay
  };
}

// ==========================================
// 🌟 2. ฟังก์ชันคำนวณวันหมดอายุและเครดิตสำหรับการ "อัปเกรด/ดาวน์เกรด" (Credit-Based Proration)
// ตัดยอดเป็นส่วนลด และเริ่มนับใหม่จาก "วันนี้" เสมอ
// ==========================================
export async function calculateUpgradeExpiryAndProrate(shopId: string, planToBuy: PlanType) {
  const now = new Date();

  const shop = await db.shop.findUnique({
    where: { id: shopId }
  });

  if (!shop) throw new Error("ไม่พบร้านค้า");

  const effectiveCurrentExpiry = shop.expiresAt || shop.trialEndsAt;
  const hasActiveTrial =
    shop.planType === "FREE_TRIAL" &&
    !!shop.trialEndsAt
  const hasTimeLeft = effectiveCurrentExpiry && isAfter(effectiveCurrentExpiry, now);

  let prorateCredit = 0;
  let baseDate = now;

  if (hasTimeLeft && !hasActiveTrial && effectiveCurrentExpiry) {
    const daysLeft = differenceInDays(effectiveCurrentExpiry, now);
    const currentPlanPrice = PRICE_TABLE[shop.planType];

    let dailyRate = 0;
    if (shop.planType.includes("MONTHLY")) {
      dailyRate = currentPlanPrice / 30;
    } else if (shop.planType.includes("YEARLY")) {
      dailyRate = currentPlanPrice / 365;
    } else if (shop.planType === "LIFETIME") {
      dailyRate = 0;
    }

    prorateCredit = Math.max(0, parseFloat((daysLeft * dailyRate).toFixed(2)));
  }

  const paidHistoryCount = await db.subscriptionHistory.count({
    where: {
      shopId,
      status: "COMPLETED",
      amountPaid: {
        gt: 0
      }
    }
  })
  const isNewUserBonusEligible =
    paidHistoryCount === 0 &&
    !shop.hasUsedTrial &&
    !hasActiveTrial &&
    !effectiveCurrentExpiry;
  if (isNewUserBonusEligible) {
    // 🌟 เปลี่ยนโบนัสฟรีเป็น 30 วันเต็ม
    baseDate = addDays(baseDate, 30);
  }

  let newExpiresAt = baseDate;
  if (planToBuy === "BASIC_MONTHLY" || planToBuy === "PRO_MONTHLY") {
    // 🌟 แพ็กเกจรายเดือน = +30 วัน
    newExpiresAt = addDays(newExpiresAt, 30);
  } else if (planToBuy === "BASIC_YEARLY" || planToBuy === "PRO_YEARLY") {
    // 🌟 แพ็กเกจรายปี = +365 วัน
    newExpiresAt = addDays(newExpiresAt, 365);
  } else if (planToBuy === "LIFETIME") {
    newExpiresAt = addDays(newExpiresAt, 365 * 99); // 99 ปี
  } else {
    // 🌟 ค่าเริ่มต้น = +30 วัน
    newExpiresAt = addDays(newExpiresAt, 30);
  }

  const baseAmount = PRICE_TABLE[planToBuy];
  const finalAmountToPay = Math.max(0, baseAmount - prorateCredit);

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
  isWebhook: boolean = false,
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

    // 🌟 ด่านตรวจจับ Payment ซ้ำด้วย transRef (Idempotent Check)
    const existingTransaction = await db.paymentTransaction.findUnique({
      where: { transRef: transRef },
      include: { receipt: true }
    })

    if (existingTransaction) {
      if (existingTransaction.status === "APPROVED") {
        return { success: true, message: "รายการถูกอนุมัติไปแล้วก่อนหน้านี้" };
      }
      throw new Error(`สลิปนี้ถูกใช้งานไปแล้วเมื่อ ${existingTransaction.createdAt.toLocaleString("th-TH")} ไม่สามารถนำกลับมาใช้ซ้ำได้`)
    }

    const shop = await db.shop.findUnique({
      where: { id: shopId }
    })

    if (!shop) throw new Error("ไม่พบข้อมูลร้านค้า")

    const isRenewal = shop.planType === planToBuy && shop.planType !== "FREE_TRIAL";

    let calculationResult;
    if (isRenewal) {
      calculationResult = await calculateRenewalExpiry(shopId, planToBuy);
    } else {
      calculationResult = await calculateUpgradeExpiryAndProrate(shopId, planToBuy);
    }

    const { newExpiresAt, prorateCredit, baseAmount } = calculationResult;
    const now = new Date()

    // 🌟 1️⃣ ยิง Transaction Database ม้วนแรกจบ (บันทึกอัปเดตร้าน และ PaymentTx)
    const paymentTx = await db.$transaction(async (tx) => {
      await tx.shop.update({
        where: { id: shopId },
        data: {
          isActive: true,
          planType: planToBuy,
          planStatus: "ACTIVE",
          subscriptionStartsAt: !isRenewal ? now : undefined,
          expiresAt: newExpiresAt,
          trialEndsAt: null,
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

      // รีเทิร์นตัว Transaction กลับมาเพื่อเอา ID ไปสร้างใบเสร็จ
      return await tx.paymentTransaction.create({
        data: {
          shopId: shopId,
          amount: amount,
          baseAmount: baseAmount,
          prorateCredit: prorateCredit,
          plan: planToBuy,
          status: "APPROVED",
          approvedAt: now,
          isUpgrade: shop.planType !== "FREE_TRIAL" && !isRenewal,
          transRef: transRef,
        }
      })
    })

    // 🌟 2️⃣ สร้างใบเสร็จด้วยระบบป้องกัน Race-condition (มี Retry ในตัว)
    const receipt = await generateAndCreateReceipt({
      paymentTransactionId: paymentTx.id,
      shopId: shopId,
      amount: amount,
      issuedAt: now
    });

    // 🌟 3️⃣ สร้าง PDF และอัปโหลดลง Supabase
    try {
      const pdfBytes = await generateReceiptPDF({
        receiptNo: receipt.receiptNo,
        issuedAt: now,
        shopName: shop.name,
        plan: planToBuy,
        amount: amount,
        subscriptionStartsAt: !isRenewal ? now : shop.subscriptionStartsAt,
        expiresAt: newExpiresAt
      });

      const supabase = await createClient();
      const { error: uploadError } = await supabase.storage
        .from("receipts")
        .upload(receipt.pdfPath, pdfBytes, { contentType: "application/pdf" });

      if (uploadError) {
        console.error("Supabase Upload Error:", uploadError.message);
      }
    } catch (pdfError) {
      console.error("Failed to generate or upload receipt PDF:", pdfError);
    }

    return { success: true, newExpiresAt, receiptNo: receipt.receiptNo, prorateCredit }
  } catch (error: any) {
    console.error("Payment Processing Error:", error)

    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message }
    }

    return { success: false, error: error instanceof Error ? error.message : "ไม่สามารถอัปเดตแพ็กเกจได้" }
  }
}