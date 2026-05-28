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
    const effectiveExpiryDate = shop.expiresAt || shop.trialEndsAt;

    // 🌟 2. ถ้าร้านไม่มีวันหมดอายุ หรือยังไม่ถึงวันหมดอายุ
    if (!effectiveExpiryDate || !isPast(effectiveExpiryDate)) {
      // ถ้าเคยหมดอายุ แต่แอดมินหรือระบบต่อเวลาให้ ให้ดึงกลับมา ACTIVE
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
      // ถ้ายังไม่เป็น PENDING_DELETION ค่อยอัปเดต (เพื่อไม่ให้ยิง DB ซ้ำซ้อน)
      // ใช้ @ts-ignore เฉพาะตรงนี้เผื่อ PENDING_DELETION ยังไม่มีใน Schema
      // @ts-ignore
      if (shop.planStatus !== "PENDING_DELETION") {
        await db.shop.update({
          where: { id: shopId },
          // @ts-ignore
          data: { planStatus: "PENDING_DELETION" }
        })
      }

      return {
        status: "PENDING_DELETION",
        expiresAt: effectiveExpiryDate,
        daysLeftToPurge: 0
      }
    }

    // 4. อัปเดตสถานะแพ็กเกจเป็น EXPIRED ทันทีใน Database
    // 🌟 เปลี่ยนมาเช็คว่าเป็น ACTIVE ค่อยเปลี่ยน ดีกว่าเช็คว่า "ไม่เท่ากับ EXPIRED" ครับ
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