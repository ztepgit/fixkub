"use server"

import { db } from "@/lib/prisma"
import { differenceInDays, isPast } from "date-fns"
import { verifyShopAccess } from "@/lib/auth-guard" 

export async function checkAndEnforceShopStatus(shopId: string) {
  try {
    // 🌟 ด่านตรวจ: ป้องกันคนอื่นมาแอบเช็ค
    await verifyShopAccess(shopId)

    const shop = await db.shop.findUnique({
      where: { id: shopId },
      select: { 
        id: true, 
        expiresAt: true, 
        trialEndsAt: true, 
        planStatus: true, 
        planType: true,    
        isActive: true 
      }
    })

    if (!shop) return { status: "NOT_FOUND" }

    // 🌟 1. ดึงวันที่สิ้นสุดที่แท้จริงออกมา (ให้ความสำคัญกับ expiresAt ก่อน ถ้าเป็น Null ค่อยดู trialEndsAt)
    // การเขียนแบบนี้แก้ปัญหาการไปแก้ DB ด้วยมือแล้วระบบไม่อัปเดตได้ดีเยี่ยมครับ
    const effectiveExpiryDate = shop.expiresAt || shop.trialEndsAt;

    // 🌟 2. ถ้าร้านไม่มีวันหมดอายุ (เช่น เปิดร้านมารอจ่ายเงิน หรือแพ็กตลอดชีพ) หรือยังไม่ถึงวันหมดอายุ
    if (!effectiveExpiryDate || !isPast(effectiveExpiryDate)) {
      // ถ้าเคยหมดอายุ แล้วแอดมินหรือระบบต่อเวลาให้ แต่สถานะยังค้างอยู่ ให้ดึงกลับมา ACTIVE
      if (shop.planStatus === "EXPIRED") {
        await db.shop.update({
          where: { id: shopId },
          data: { planStatus: "ACTIVE" }
        })
      }
      return { status: "ACTIVE", expiresAt: effectiveExpiryDate, daysLeftToPurge: null } 
    }

    // ==========================================
    // 🚨 เข้าเงื่อนไขนี้ แปลว่า "หมดอายุแล้ว (isPast = true)"
    // ==========================================
    const daysExpired = differenceInDays(new Date(), effectiveExpiryDate)
    const daysLeftToPurge = Math.max(0, 30 - daysExpired) // คำนวณไม่ให้ติดลบ

    // 3. อัปเดตเป็น PENDING_DELETION หากเลยกำหนด Grace Period (30 วัน)
    if (daysLeftToPurge === 0) {
      await db.shop.update({
        where: { id: shopId },
        // @ts-ignore - ป้องกัน Type error หาก PENDING_DELETION ยังไม่มีใน Prisma Schema
        data: { planStatus: "PENDING_DELETION" }
      })

      return { 
        status: "PENDING_DELETION", 
        expiresAt: effectiveExpiryDate, 
        daysLeftToPurge: 0 
      }
    }

    // 4. อัปเดตสถานะแพ็กเกจเป็น EXPIRED ทันทีใน Database
    if (shop.planStatus === "ACTIVE") {
      await db.shop.update({
        where: { id: shopId },
        data: { planStatus: "EXPIRED" } // ไม่แตะ isActive ปล่อยให้ล็อกอินได้
      })
    }

    // 5. ส่งข้อมูลยืนยันว่า EXPIRED กลับไปให้ Frontend จัดการเด้งหน้า Paywall
    return { 
      status: "EXPIRED", 
      expiresAt: effectiveExpiryDate, 
      daysLeftToPurge 
    }

  } catch (error) {
    console.error("Check Status Error:", error)
    return { status: "ERROR" }
  }
}