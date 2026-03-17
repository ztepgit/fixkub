"use server";

import { db } from "@/lib/prisma";

export async function getDashboardStats(shopId: string) {
  try {
    // หาเวลาเริ่มต้นของวันนี้ (เที่ยงคืน)
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    // ดึงงานทั้งหมดของร้าน
    const allJobs = await db.queue.findMany({
      where: { shopId: shopId },
      orderBy: { createdAt: 'desc' },
    });

    // 1. จำนวนงานทั้งหมดที่เข้ามา "วันนี้"
    const todayJobs = allJobs.filter(job => new Date(job.createdAt) >= todayStart);
    
    // 2. จำนวนงานที่ "กำลังดำเนินการอยู่" (รอยืนยัน, รอซ่อม, กำลังซ่อม)
    const activeJobs = allJobs.filter(job => 
      ["PENDING", "WAITING", "PROCESSING"].includes(job.status)
    );

    // 3. จำนวนงานที่ "รอรับเครื่อง / ซ่อมเสร็จแล้ว"
    const readyForPickup = allJobs.filter(job => job.status === "REPAIRED");

    // 4. งานที่ปิดจ๊อบแล้ว "วันนี้"
    const completedToday = todayJobs.filter(job => job.status === "COMPLETED");

    // 5. คำนวณรายได้ประเมินของวันนี้ (จากงานที่ปิดจ๊อบแล้ว)
    // หมายเหตุ: ใช้ any ไปก่อนเผื่อใน schema ของคุณปิ๊กยังไม่ได้กำหนด type ของ estimatedPrice ชัดเจน
    const revenueToday = completedToday.reduce((sum, job: any) => {
      const price = parseInt(job.estimatedPrice || "0", 10);
      return sum + (isNaN(price) ? 0 : price);
    }, 0);

    return {
      success: true,
      data: {
        todayCount: todayJobs.length,
        activeCount: activeJobs.length,
        readyCount: readyForPickup.length,
        revenueToday: revenueToday,
        recentJobs: allJobs.slice(0, 5), // ดึง 5 งานล่าสุดมาโชว์ในตาราง
      }
    };
  } catch (error) {
    console.error("❌ Error fetching dashboard stats:", error);
    return { success: false, error: "ไม่สามารถดึงข้อมูลสถิติได้" };
  }
}