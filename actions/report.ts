"use server"

import { db } from "@/lib/prisma"
import { 
  startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, 
  eachDayOfInterval, eachMonthOfInterval, isSameDay, isSameMonth 
} from "date-fns"

// ==========================================
// 1. ดึงสถิติภาพรวม และ ตารางสาเหตุการยกเลิก (All-Time)
// ==========================================
export async function getAnalyticsSummary(shopId: string) {
  try {
    const jobs = await db.queue.findMany({
      where: { shopId },
      select: {
        status: true,
        estimatedPrice: true,
        cancelReason: true,
      }
    });

    let totalRevenue = 0;
    let completedJobs = 0;
    let cancelledJobs = 0;

    // ตัวแปรเก็บจำนวนแยกตามสาเหตุ
    const cancelStats: Record<string, number> = {
      "NO_SHOW": 0,
      "CUSTOMER_CANCEL": 0,
      "UNREPAIRABLE": 0,
      "NO_PARTS": 0,
      "UNCONTACTABLE": 0
    };

    jobs.forEach(job => {
      if (job.status === "COMPLETED") {
        totalRevenue += (job.estimatedPrice || 0);
        completedJobs++;
      } else if (job.status === "CANCELLED") {
        cancelledJobs++;
        if (job.cancelReason && cancelStats[job.cancelReason] !== undefined) {
          cancelStats[job.cancelReason]++;
        }
      }
    });

    // แปลง Object ให้เป็น Array และเรียงลำดับจากสาเหตุที่เกิดบ่อยสุดไปน้อยสุด
    const formattedCancelReasons = Object.entries(cancelStats)
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count);

    return {
      success: true,
      data: {
        totalRevenue,
        totalJobs: jobs.length,
        completedJobs,
        cancelledJobs,
        cancelReasons: formattedCancelReasons // 🌟 นำไปใช้สร้างตารางได้เลย
      }
    };
  } catch (error) {
    console.error("❌ Error fetching analytics summary:", error);
    return { success: false, error: "ไม่สามารถดึงข้อมูลสรุปได้" };
  }
}

// ==========================================
// 2. ข้อมูลสำหรับวาดกราฟ (รายได้ และ งานซ่อม vs งานเสร็จ)
// รองรับ: 'week' | 'month' | 'year'
// ==========================================
export async function getTrendData(shopId: string, period: 'week' | 'month' | 'year') {
  try {
    const now = new Date();
    let startDate: Date, endDate: Date;
    let intervals: Date[];

    // 🌟 กำหนดช่วงเวลา และแบ่งแท่งกราฟ (iso8601 สัปดาห์เริ่มวันจันทร์)
    if (period === 'week') {
      startDate = startOfWeek(now, { weekStartsOn: 1 }); 
      endDate = endOfWeek(now, { weekStartsOn: 1 });
      intervals = eachDayOfInterval({ start: startDate, end: endDate }); // แท่งกราฟ 7 วัน
    } else if (period === 'month') {
      startDate = startOfMonth(now);
      endDate = endOfMonth(now);
      intervals = eachDayOfInterval({ start: startDate, end: endDate }); // แท่งกราฟ 28-31 วัน
    } else { // year
      startDate = startOfYear(now);
      endDate = endOfYear(now);
      intervals = eachMonthOfInterval({ start: startDate, end: endDate }); // แท่งกราฟ 12 เดือน
    }

    // ดึงงานที่มีความเคลื่อนไหวในช่วงเวลานี้เท่านั้น
    const jobs = await db.queue.findMany({
      where: {
        shopId,
        OR: [
          { completedAt: { gte: startDate, lte: endDate } },
          { startedAt: { gte: startDate, lte: endDate } },
          { repairedAt: { gte: startDate, lte: endDate } },
        ]
      },
      select: {
        estimatedPrice: true,
        status: true,
        completedAt: true,
        startedAt: true,
        repairedAt: true
      }
    });

    const dayNames = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];
    const monthNames = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

    // 🌟 หยอดข้อมูลลงในแต่ละแท่งกราฟ
    const chartData = intervals.map(date => {
      let revenue = 0;
      let processing = 0; // รับแกะซ่อม
      let repaired = 0;   // ซ่อมเสร็จ

      jobs.forEach(job => {
        // ถ้าเป็นกราฟรายปี ให้เช็คว่า "เดือนตรงกันไหม" ถ้าเป็นวัน/สัปดาห์ ให้เช็ค "วันตรงกันไหม"
        const isSame = period === 'year' ? isSameMonth : isSameDay;

        // 1. คำนวณรายได้ (ต้องสถานะ COMPLETED และวันที่จบงานตรงกับแท่งกราฟ)
        if (job.status === "COMPLETED" && job.completedAt && isSame(job.completedAt, date)) {
          revenue += (job.estimatedPrice || 0);
        }
        // 2. จำนวนงานที่เริ่มซ่อม (PROCESSING)
        if (job.startedAt && isSame(job.startedAt, date)) {
          processing++;
        }
        // 3. จำนวนงานที่ซ่อมเสร็จ (REPAIRED)
        if (job.repairedAt && isSame(job.repairedAt, date)) {
          repaired++;
        }
      });

      // จัดฟอร์แมตแกน X (Label) ให้สวยงาม
      let label = "";
      if (period === 'week') label = dayNames[date.getDay()];
      else if (period === 'month') label = date.getDate().toString();
      else label = monthNames[date.getMonth()];

      return {
        label,
        revenue,
        processing,
        repaired,
      };
    });

    return { success: true, data: chartData };

  } catch (error) {
    console.error("❌ Error fetching trend data:", error);
    return { success: false, error: "ไม่สามารถดึงข้อมูลกราฟได้" };
  }
}

// ==========================================
// 3. ดึงรายการงานที่ถูกยกเลิกทั้งหมด (สำหรับตาราง)
// ==========================================
export async function getCancelledJobsDetails(shopId: string) {
  try {
    const jobs = await db.queue.findMany({
      where: { shopId, status: "CANCELLED" },
      orderBy: { cancelledAt: 'desc' },
      select: {
        id: true,
        jobRef: true,
        customerName: true,
        deviceModel: true,
        cancelReason: true,
        cancelledAt: true,
        issue: true,
      }
    });
    return { success: true, data: jobs };
  } catch (error) {
    console.error("❌ Error fetching cancelled jobs details:", error);
    return { success: false, error: "ไม่สามารถดึงข้อมูลรายการยกเลิกได้" };
  }
}