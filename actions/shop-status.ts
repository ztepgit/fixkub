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
      select: { id: true, expiresAt: true, planStatus: true, isActive: true }
    })

    if (!shop) return { status: "NOT_FOUND" }

    // 🌟 ถ้าร้านไม่มีวันหมดอายุ (เช่น LIFETIME) หรือยังไม่ถึงวันหมดอายุ
    if (!shop.expiresAt || !isPast(shop.expiresAt)) {
      // ถ้าเคยหมดอายุ แล้วแอดมินหรือระบบต่อเวลาให้ แต่สถานะยังค้างอยู่ ให้ดึงกลับมา ACTIVE
      if (shop.planStatus === "EXPIRED") {
        await db.shop.update({
          where: { id: shopId },
          data: { planStatus: "ACTIVE" }
        })
      }
      return { status: "ACTIVE", expiresAt: shop.expiresAt, daysLeftToPurge: null } 
    }

    // ==========================================
    // 🚨 เข้าเงื่อนไขนี้ แปลว่า "แพ็กเกจหมดอายุแล้ว (isPast = true)"
    // ==========================================
    const daysExpired = differenceInDays(new Date(), shop.expiresAt)
    const daysLeftToPurge = Math.max(0, 30 - daysExpired) // คำนวณไม่ให้ติดลบ

    // 1. อัปเดตสถานะแพ็กเกจเป็น EXPIRED ทันทีใน Database
    if (shop.planStatus === "ACTIVE") {
      await db.shop.update({
        where: { id: shopId },
        data: { planStatus: "EXPIRED" } // ไม่แตะ isActive ปล่อยให้ล็อกอินได้
      })
    }

    // 2. เช็คว่าเลย Grace Period (30 วัน) หรือยัง
    if (daysLeftToPurge === 0) {
      return { 
        status: "PENDING_DELETION", 
        expiresAt: shop.expiresAt, 
        daysLeftToPurge: 0 
      }
    }

    // 3. ส่งข้อมูลยืนยันว่า EXPIRED กลับไปให้ Frontend จัดการเด้งหน้า Paywall
    return { 
      status: "EXPIRED", 
      expiresAt: shop.expiresAt, 
      daysLeftToPurge 
    }

  } catch (error) {
    console.error("Check Status Error:", error)
    return { status: "ERROR" }
  }
}