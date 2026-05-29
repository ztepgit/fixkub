// app/api/cron/cleanup-shops/route.ts

import { db } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function GET(req: Request) {
  // CRON SECURITY
  const authHeader = req.headers.get("authorization")

  if (
    process.env.NODE_ENV === "production" &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return new Response("Unauthorized", { status: 401 })
  }

  try {
    // ลบร้าน FREE_TRIAL ที่ไม่ active และเกิน 7 วัน
    const targetDate = new Date()
    targetDate.setDate(targetDate.getDate() - 7)

    // 🌟 SAFETY:
    // กันเผลอลบร้าน demo
    // กันเผลอลบร้านที่เคยจ่ายเงินจริง
    const deleteResult = await db.shop.deleteMany({
      where: {
        isDemo: false,
        isActive: false,
        planType: "FREE_TRIAL",
        planStatus: "ACTIVE",

        createdAt: {
          lt: targetDate,
        },

        // กันร้านที่เคยมีประวัติจ่ายเงินจริง
        payments: {
          none: {}
        }
      },
    })

    console.log(`[CRON] Deleted abandoned shops: ${deleteResult.count}`)

    return NextResponse.json({
      success: true,
      deletedCount: deleteResult.count,
    })

  } catch (error) {
    console.error("[CRON_ERROR] Cleanup Shops:", error)

    return NextResponse.json(
      {
        success: false,
        error: "Cleanup failed",
      },
      { status: 500 }
    )
  }
}