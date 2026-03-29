"use server"

import { db } from "@/lib/prisma"
import { differenceInDays, isPast } from "date-fns"
import { verifyShopAccess } from "@/lib/auth-guard" 

export async function checkAndEnforceShopStatus(shopId: string) {
  try {
    // ด่านตรวจ: ตรวจสอบสิทธิ์ก่อนว่าผู้ใช้ที่กำลังเรียก API นี้ เป็นเจ้าของร้านจริงๆ
    await verifyShopAccess(shopId)

    const shop = await db.shop.findUnique({
      where: { id: shopId },
      select: { id: true, expiresAt: true, planStatus: true, isActive: true }
    })

    if (!shop) return { status: "NOT_FOUND" }

    // ถ้าร้านไม่มีวันหมดอายุ (เช่น LIFETIME) หรือยังไม่ถึงวันหมดอายุ
    if (!shop.expiresAt || !isPast(shop.expiresAt)) {
      // 🌟 เสริม: ถ้าก่อนหน้านี้ร้านเคยหมดอายุ (EXPIRED) แล้วลูกค้าเติมเงินกลับมา 
      // แต่ระบบยังจำค่าเก่าอยู่ ให้ดึงกลับมาเป็น ACTIVE ให้ถูกต้อง
      if (shop.planStatus === "EXPIRED") {
        await db.shop.update({
          where: { id: shopId },
          data: { planStatus: "ACTIVE" }
        })
      }
      return { status: "ACTIVE", expiresAt: shop.expiresAt } 
    }

    // ==========================================
    // 🚨 เข้าเงื่อนไขนี้ แปลว่า "แพ็กเกจหมดอายุแล้ว"
    // ==========================================
    const daysExpired = differenceInDays(new Date(), shop.expiresAt)
    const daysLeftToPurge = 30 - daysExpired

    // 1. อัปเดตสถานะแพ็กเกจเป็น EXPIRED 
    // 🌟 สำคัญ: เราไม่แตะ isActive: false แล้ว เพื่อให้ลูกค้ายังล็อกอินเข้ามาเจอหน้า Paywall ได้
    if (shop.planStatus === "ACTIVE") {
      await db.shop.update({
        where: { id: shopId },
        data: { 
          planStatus: "EXPIRED", 
          // isActive ไม่ต้องเปลี่ยน ปล่อยให้ล็อกอินได้
        }
      })
    }

    // 2. เช็คว่าหมด Grace Period (30 วัน) หรือยัง
    if (daysLeftToPurge <= 0) {
      // ถ้าหมดแล้ว ปล่อยให้เป็นหน้าที่ของ CRON Job จัดการลบข้อมูล 
      // แต่ในฝั่ง Frontend ส่งสถานะไปบอกว่าร้านนี้กำลังจะปลิว (ไม่ให้ทำอะไรแล้ว)
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