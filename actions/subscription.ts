// actions/subscription.ts
"use server"

import { db } from "@/lib/prisma"
import { addMonths, addYears, isAfter, differenceInDays } from "date-fns"
import { PlanType } from "@prisma/client"
import { z } from "zod"
import { verifyShopAccess } from "@/lib/auth-guard"
import { createClient } from "@/lib/supabase/server"
import { generateUniqueReceiptNo } from "@/actions/receipt"
import { generateReceiptPDF } from "@/lib/receipt-generator"

// 🌟 ราคามาตรฐานสำหรับคำนวณ Prorate (อ้างอิงจากราคาขายจริง)
const PRICE_TABLE: Record<PlanType, number> = {
  FREE_TRIAL: 0,
  BASIC_MONTHLY: 299,
  BASIC_YEARLY: 2290,
  PRO_MONTHLY: 399, // สมมติราคา Pro
  PRO_YEARLY: 3290, // สมมติราคา Pro
  LIFETIME: 9900,   // สมมติราคา
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
  const isTrial = shop.planType === "FREE_TRIAL";
  
  // 🌟 THE FIX: ให้ใช้ Effective Expiry (วันหมดอายุเดิม) เป็นฐาน ถัามันยังไม่หมดอายุ
  // แต่ถ้าหมดอายุไปแล้ว หรือเพิ่งสมัคร ให้เริ่มนับจากวันนี้ (now)
  let baseDate = (effectiveCurrentExpiry && isAfter(effectiveCurrentExpiry, now)) 
    ? effectiveCurrentExpiry 
    : now;

  // 💡 โบนัส 30 วันฟรี สำหรับร้านเปิดใหม่
  const paidHistoryCount = await db.subscriptionHistory.count({
    where: { shopId, status: "COMPLETED" }
  });
  const isNewUserBonusEligible = paidHistoryCount === 0 && !isTrial && !effectiveCurrentExpiry;
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

  const baseAmount = PRICE_TABLE[planToBuy];
  const finalAmountToPay = baseAmount; 

  return { 
    newExpiresAt, 
    prorateCredit: 0, // Renewal ไม่มีการสร้าง Credit
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
  const isTrial = shop.planType === "FREE_TRIAL";
  const hasTimeLeft = effectiveCurrentExpiry && isAfter(effectiveCurrentExpiry, now);

  let prorateCredit = 0;
  let baseDate = now; // 🌟 แบบ Prorate เราจะเริ่มนับวันใหม่จาก "วันนี้" เสมอ

  if (hasTimeLeft && !isTrial && effectiveCurrentExpiry) {
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
    where: { shopId, status: "COMPLETED" }
  });
  const isNewUserBonusEligible = paidHistoryCount === 0 && !isTrial && !effectiveCurrentExpiry;
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

    // 🌟 ด่านตรวจจับ Payment ซ้ำด้วย transRef (Idempotent Check)
    const existingTransaction = await db.paymentTransaction.findUnique({
      where: { transRef: transRef },
      include: { receipt: true } // เผื่อเคสดึงข้อมูลใบเสร็จ
    })

    if (existingTransaction) {
      if (existingTransaction.status === "APPROVED") {
         // ถ้ารายการนี้อนุมัติไปแล้ว (เช่น webhook ชนกับ frontend) ให้ถือว่า Success ไปเลย
         return { success: true, message: "รายการถูกอนุมัติไปแล้วก่อนหน้านี้" };
      }
      throw new Error(`สลิปนี้ถูกใช้งานไปแล้วเมื่อ ${existingTransaction.createdAt.toLocaleString("th-TH")} ไม่สามารถนำกลับมาใช้ซ้ำได้`)
    }

    const shop = await db.shop.findUnique({
      where: { id: shopId }
    })

    if (!shop) throw new Error("ไม่พบข้อมูลร้านค้า")

    // 🌟 ตรวจสอบว่าเป็น Renewal หรือ Upgrade/Downgrade
    const isRenewal = shop.planType === planToBuy && shop.planType !== "FREE_TRIAL";
    
    let calculationResult;
    if (isRenewal) {
      calculationResult = await calculateRenewalExpiry(shopId, planToBuy);
    } else {
      calculationResult = await calculateUpgradeExpiryAndProrate(shopId, planToBuy);
    }

    const { newExpiresAt, prorateCredit, baseAmount } = calculationResult;
    const now = new Date()

    // 🌟 สร้างเลขใบเสร็จเตรียมไว้
    const receiptNo = await generateUniqueReceiptNo();

    // 🌟 อัปโหลด PDF ลง Supabase Storage ก่อนรัน Transaction 
    // (เพราะเราไม่สามารถเรียก Storage API ใน Prisma Transaction ได้อย่างปลอดภัย)
    const yearMonth = `${now.getFullYear()}/${(now.getMonth() + 1).toString().padStart(2, '0')}`;
    const pdfPath = `receipts/${yearMonth}/${receiptNo}.pdf`;
    
    const pdfBytes = await generateReceiptPDF({
      receiptNo,
      issuedAt: now,
      shopName: shop.name,
      plan: planToBuy,
      amount: amount,
      subscriptionStartsAt: !isRenewal ? now : shop.subscriptionStartsAt, // ถ้าต่ออายุเอาวันเริ่มเดิม ถ้าอัปเกรดเริ่มวันนี้
      expiresAt: newExpiresAt
    });

    const supabase = await createClient();
    const { error: uploadError } = await supabase.storage.from("receipts").upload(pdfPath, pdfBytes, { contentType: "application/pdf" });
    
    if (uploadError) throw new Error("ไม่สามารถบันทึกเอกสารใบเสร็จได้: " + uploadError.message);

    // 🌟 ยิง Transaction Database ม้วนเดียวจบ
    await db.$transaction(async (tx) => {

      // 1. อัปเดตร้านค้า (วันหมดอายุใหม่)
      await tx.shop.update({
        where: { id: shopId },
        data: {
          isActive: true,            
          planType: planToBuy,
          planStatus: "ACTIVE",
          // อัปเดต subscriptionStartsAt เฉพาะตอนที่เปลี่ยนแพ็กเกจ
          subscriptionStartsAt: !isRenewal ? now : undefined,
          expiresAt: newExpiresAt,
        }
      })

      // 2. สร้างประวัติ (History)
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

      // 3. สร้าง PaymentTransaction พร้อม Receipt ซ้อนไปเลย (Nested Create)
      await tx.paymentTransaction.create({
        data: {
          shopId: shopId,
          amount: amount,           // ยอดที่โอนจริง
          baseAmount: baseAmount,   // ราคาเต็มของแพ็กเกจ
          prorateCredit: prorateCredit, // เครดิตที่ได้จากวันคงเหลือของแพ็กเก่า
          plan: planToBuy,
          status: "APPROVED",
          approvedAt: now,
          isUpgrade: shop.planType !== "FREE_TRIAL" && !isRenewal,
          transRef: transRef,
          // 🌟 4. สร้างใบเสร็จผูกติดไปพร้อมกันเลย!
          receipt: {
            create: {
               shopId: shopId,
               receiptNo: receiptNo,
               amount: amount,
               pdfPath: pdfPath,
               issuedAt: now
            }
          }
        }
      })

    })

    return { success: true, newExpiresAt, receiptNo, prorateCredit }
  } catch (error: any) {
    console.error("Payment Processing Error:", error)

    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message }
    }

    return { success: false, error: error instanceof Error ? error.message : "ไม่สามารถอัปเดตแพ็กเกจได้" }
  }
}