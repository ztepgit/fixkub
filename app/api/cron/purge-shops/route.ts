import { NextResponse } from "next/server"
import { db } from "@/lib/prisma"

// แนะนำให้ตั้งค่า CRON_SECRET ใน .env เพื่อป้องกันคนอื่นแอบเข้ามายิง API นี้
const CRON_SECRET = process.env.CRON_SECRET

export async function GET(request: Request) {
  // 1. ตรวจสอบความปลอดภัย (Security Check)
  const authHeader = request.headers.get("authorization")
  if (authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    // 2. หาวันที่ย้อนหลังไป 30 วันจากวันนี้
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    // 3. กวาดลบร้านค้าที่หมดอายุมาแล้วเกิน 30 วัน (Hard Delete)
    // 💡 ทริค: Cascade Delete ใน Prisma จะลบคิว, บริการ และบิลของร้านนี้ทิ้งให้หมดเกลี้ยงโดยอัตโนมัติ!
    const deletedShops = await db.shop.deleteMany({
      where: {
        expiresAt: {
          lt: thirtyDaysAgo // lt = less than (เก่ากว่า 30 วันที่แล้ว)
        }
      }
    })

    console.log(`🧹 CRON: Purged ${deletedShops.count} expired shops.`)

    return NextResponse.json({ 
      success: true, 
      message: `ทำความสะอาดเรียบร้อย ลบไป ${deletedShops.count} ร้านค้า`,
      deletedCount: deletedShops.count
    })

  } catch (error) {
    console.error("CRON Purge Error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}