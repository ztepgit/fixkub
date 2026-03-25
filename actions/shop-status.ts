"use server"

import { db } from "@/lib/prisma"
import { differenceInDays, isPast } from "date-fns"

export async function checkAndEnforceShopStatus(shopId: string) {
  try {
    const shop = await db.shop.findUnique({
      where: { id: shopId },
      select: { id: true, expiresAt: true, planStatus: true, isActive: true }
    })

    if (!shop) return { status: "NOT_FOUND" }

    // ถ้าร้านไม่มีวันหมดอายุ (เช่น LIFETIME) หรือยังไม่ถึงวันหมดอายุ
    if (!shop.expiresAt || !isPast(shop.expiresAt)) {
     return { status: "ACTIVE", expiresAt: shop.expiresAt } // 🌟 เพิ่มตรงนี้
    }

    // 🌟 ถ้าเข้าเงื่อนไขนี้ แปลว่า "หมดอายุแล้ว"
    const daysExpired = differenceInDays(new Date(), shop.expiresAt)
    const daysLeftToPurge = 30 - daysExpired

    // 1. ทำ Soft Delete ทันที (ถ้าสถานะยังเป็น ACTIVE อยู่)
    if (shop.planStatus === "ACTIVE" || shop.isActive === true) {
      await db.shop.update({
        where: { id: shopId },
        data: { 
          planStatus: "EXPIRED", 
          isActive: false // ซ่อนร้านจากระบบอื่นๆ 
        }
      })
    }

    // 2. เช็คว่าเลย 30 วันหรือยัง
    if (daysLeftToPurge <= 0) {
      // ปล่อยให้เป็นหน้าที่ของ CRON Job มาลบ แต่ตอนนี้บล็อกการเข้าถึงไว้ก่อน
      return { status: "PENDING_DELETION" }
    }

    // 3. ส่งข้อมูลไปให้หน้า Frontend เด้งไปหน้า Paywall
    return { 
      status: "EXPIRED", 
      daysLeftToPurge, // ส่งจำนวนวันที่เหลือไปขู่ลูกค้าในหน้า Paywall
    }

  } catch (error) {
    console.error("Check Status Error:", error)
    return { status: "ERROR" }
  }
}