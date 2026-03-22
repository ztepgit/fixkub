"use server"

import { db } from "@/lib/prisma" // แก้ไข path ให้ตรงกับที่เก็บ prisma client ของคุณปิ๊กนะครับ
import { addMonths, addYears, isAfter } from "date-fns"
import { PlanType } from "@prisma/client" // 🌟 1. Import Type ตรงจาก Prisma

// 🌟 2. เปลี่ยน Type ของ planToBuy เป็น PlanType แทนการพิมพ์ String เอง
export async function processPaymentSuccess(shopId: string, planToBuy: PlanType, amount: number) {
  try {
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

    // 🌟 บันทึกลง Database แบบ Transaction (ทำพร้อมกัน 2 ตาราง)
    await db.$transaction([
      
      // 1. อัปเดตตารางร้านค้า
      db.shop.update({
        where: { id: shopId },
        data: {
          planType: planToBuy,       // 🌟 ตอนนี้ Type ตรงกัน 100% แล้ว Error หายแน่นอน
          planStatus: "ACTIVE",
          subscriptionStartsAt: now, 
          expiresAt: newExpiresAt,   
        }
      }),

      // 2. สร้างประวัติการชำระเงิน (Subscription History)
      db.subscriptionHistory.create({
        data: {
          shopId: shopId,
          planType: planToBuy,       // 🌟 ตรงนี้ก็ไม่มี Error แล้ว
          amountPaid: amount,
          previousExpiresAt: shop.expiresAt, 
          newExpiresAt: newExpiresAt,        
          status: "COMPLETED"
        }
      })

    ])

    return { success: true, newExpiresAt }
  } catch (error) {
    console.error("Payment Processing Error:", error)
    return { success: false, error: "ไม่สามารถอัปเดตแพ็กเกจได้" }
  }
}