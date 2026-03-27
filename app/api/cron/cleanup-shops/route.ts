// app/api/cron/cleanup-shops/route.ts
import { db } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function GET(req: Request) {
  // 🌟 1. ระบบรักษาความปลอดภัย: ป้องกันไม่ให้คนภายนอกแอบยิง API นี้
  // Vercel จะส่ง Authorization Header มาให้ตอนที่มันรัน Cron Job
  const authHeader = req.headers.get('authorization')
  
  // เช็คว่าถ้าอยู่บน Production (Vercel) ต้องมี CRON_SECRET ที่ถูกต้อง
  if (
    process.env.NODE_ENV === 'production' &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return new Response('Unauthorized', { status: 401 })
  }

  try {
    // 🌟 2. คำนวณวันที่ย้อนหลังไป 7 วัน
    const targetDate = new Date()
    targetDate.setDate(targetDate.getDate() - 7)

    // 🌟 3. ค้นหาร้านที่เข้าเงื่อนไข (เพื่อเก็บ Log ว่าลบร้านไหนไปบ้าง)
    const abandonedShops = await db.shop.findMany({
      where: {
        isActive: false,       // ยังไม่ได้เปิดใช้งาน (ยังไม่จ่ายเงิน)
        planType: "FREE_TRIAL",// เป็นสถานะตอนเริ่มต้น
        createdAt: {
          lt: targetDate,      // สร้างมาก่อน 7 วันที่แล้ว (เก่ากว่า 7 วัน)
        },
      },
      select: { id: true, name: true, slug: true }
    })

    if (abandonedShops.length === 0) {
      return NextResponse.json({ message: "เคลียร์เรียบร้อย: ไม่มีร้านค้าร้างให้ลบในวันนี้" })
    }

    // 🌟 4. สั่งลบข้อมูลทิ้ง
    // หมายเหตุ: ใน schema.prisma ของคุณตั้ง onDelete: Cascade ไว้ที่ ShopOwner แล้ว
    // ดังนั้นพอลบ Shop ปุ๊บ User ที่ผูกกับร้านนี้ก็จะโดนลบตามไปด้วยแบบเนียนๆ เลยครับ
    const deleteResult = await db.shop.deleteMany({
      where: {
        isActive: false,
        planType: "FREE_TRIAL",
        createdAt: {
          lt: targetDate,
        },
      },
    })

    console.log(`[CRON] ลบร้านค้าร้างไป ${deleteResult.count} ร้าน`, abandonedShops)

    return NextResponse.json({
      success: true,
      message: `ลบร้านค้าร้างสำเร็จจำนวน ${deleteResult.count} ร้าน`,
      deletedShops: abandonedShops
    })

  } catch (error) {
    console.error("[CRON_ERROR] Cleanup Shops:", error)
    return NextResponse.json({ success: false, error: "เกิดข้อผิดพลาดในการลบข้อมูล" }, { status: 500 })
  }
}