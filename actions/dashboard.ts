"use server"

import { db } from "@/lib/prisma"

export async function getDashboardStats(shopId: string) {
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    // 1. งานเข้าวันนี้
    const todayCount = await db.queue.count({
      where: { shopId, createdAt: { gte: todayStart } }
    });

    // 2. กำลังดำเนินการ (รอซ่อม + กำลังซ่อม)
    const activeCount = await db.queue.count({
      where: { shopId, status: { in: ["WAITING", "PROCESSING"] } }
    });

    // 3. รอรับเครื่อง (ซ่อมเสร็จแล้ว)
    const readyCount = await db.queue.count({
      where: { shopId, status: "REPAIRED" }
    });

    // 4. รายได้วันนี้
    const revenueTodayAgg = await db.queue.aggregate({
      where: { shopId, status: "COMPLETED", completedAt: { gte: todayStart } },
      _sum: { estimatedPrice: true }
    });
    const revenueToday = revenueTodayAgg._sum.estimatedPrice || 0;

    // 5. รายการอัปเดตล่าสุด
    const recentJobs = await db.queue.findMany({
      where: { shopId },
      orderBy: { updatedAt: "desc" },
      take: 50,
    });

    // 🌟🌟 [ส่วนที่เพิ่มใหม่] สำหรับหน้า Overview 🌟🌟

    // 6. รายได้รวมทั้งหมด (ตั้งแต่เปิดร้าน)
    const allCompleted = await db.queue.aggregate({
      where: { shopId, status: "COMPLETED" },
      _sum: { estimatedPrice: true }
    });
    const allTimeRevenue = allCompleted._sum.estimatedPrice || 0;

    // 7. คำนวณเวลาซ่อมเฉลี่ยต่องาน 
    const jobsWithTime = await db.queue.findMany({
      where: {
        shopId,
        // 🌟 ดึงงานที่ซ่อมเสร็จแล้ว (รวมที่รับกลับไปแล้ว และอยู่ในคลังดอง)
        status: { in: ["REPAIRED", "COMPLETED", "ARCHIVED"] },
        startedAt: { not: null },
        repairedAt: { not: null }
      },
      select: { startedAt: true, repairedAt: true } // ดึงมาแค่ 2 เวลานี้เท่านั้น
    });

    let totalMinutes = 0;
    jobsWithTime.forEach(job => {
      // 🌟 ใช้แค่ repairedAt ลบด้วย startedAt (ไม่เอา COMPLETED มายุ่งเลยครับ)
      const diffInMinutes = (job.repairedAt!.getTime() - job.startedAt!.getTime()) / 60000;
      if (diffInMinutes > 0) totalMinutes += diffInMinutes;
    });

    const avgMinutes = jobsWithTime.length > 0 ? Math.round(totalMinutes / jobsWithTime.length) : 0;
    const avgHours = Math.floor(avgMinutes / 60);
    const remainMins = avgMinutes % 60;

    // จัดรูปแบบให้อ่านง่าย เช่น "1 ชม. 15 นาที" หรือ "45 นาที"
    const avgRepairTimeText = avgHours > 0
      ? `${avgHours} ชม. ${remainMins} นาที`
      : `${remainMins} นาที`;

    return {
      success: true,
      data: {
        todayCount,
        activeCount,
        readyCount,
        revenueToday,
        recentJobs,
        allTimeRevenue,      // ส่งไปโชว์ Overview
        avgRepairTimeText    // ส่งไปโชว์ Overview
      }
    };
  } catch (error) {
    console.error("❌ Error fetching dashboard stats:", error);
    return { success: false, error: "ไม่สามารถโหลดข้อมูลสถิติได้" };
  }
}