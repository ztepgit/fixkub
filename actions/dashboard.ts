"use server";

import { db } from "@/lib/prisma";

export async function getDashboardStats(shopId: string) {
  try {
    // 1. ดึงงานทั้งหมดของร้าน
    const allJobs = await db.queue.findMany({
      where: { shopId: shopId },
      orderBy: { createdAt: 'desc' },
    });

    // 🌟 วิธีแก้ปัญหา Timezone: ใช้วิธีดึงแค่วันที่ (YYYY-MM-DD) ตามเวลาประเทศไทย
    const todayString = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' });

    // 2. กรองงานที่เข้ามา "วันนี้" (เทียบวันที่เวลาไทย)
    const todayJobs = allJobs.filter((job: any) => {
      // ดึงวันที่สร้างคิวแปลงเป็นเวลาไทย
      const jobDate = new Date(job.createdAt).toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' });
      return jobDate === todayString;
    });
    
    // 3. จำนวนงานที่ "กำลังดำเนินการอยู่"
    const activeJobs = allJobs.filter((job: any) => 
      ["PENDING", "WAITING", "PROCESSING"].includes(job.status)
    );

    // 4. จำนวนงานที่ "รอรับเครื่อง"
    const readyForPickup = allJobs.filter((job: any) => job.status === "REPAIRED");

    // 5. งานที่ปิดจ๊อบแล้ว "วันนี้"
    const completedToday = todayJobs.filter((job: any) => job.status === "COMPLETED");

    // 6. คำนวณรายได้ของวันนี้
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
        recentJobs: allJobs.slice(0, 5), // ดึง 5 งานล่าสุด
      }
    };
  } catch (error) {
    console.error("❌ Error fetching dashboard stats:", error);
    // 🌟 ถ้าหลังบ้านพัง (เช่น ดึง DB ไม่ได้) ให้ส่งเลข 0 กลับไปแทนค่าว่าง (Null)
    return { 
      success: true, 
      data: {
        todayCount: 0, 
        activeCount: 0, 
        readyCount: 0, 
        revenueToday: 0, 
        recentJobs: []
      }
    };
  }
}