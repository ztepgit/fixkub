"use server"

import { db } from "@/lib/prisma"
import { 
  startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, 
  eachDayOfInterval, eachMonthOfInterval, isSameDay, isSameMonth,
  startOfDay, endOfDay // 🌟 นำมาใช้ครอบวันที่ให้เป็นเวลา 00:00:00 ถึง 23:59:59
} from "date-fns"

// ==========================================
// 1. ดึงสถิติภาพรวม และ ตารางสาเหตุการยกเลิก (รองรับ Custom Date)
// ==========================================
export async function getAnalyticsSummary(shopId: string, period?: string, customFrom?: Date, customTo?: Date) {
  try {
    // 🌟 สร้างเงื่อนไขวันที่ หากมีการส่ง custom date มา
    let dateFilter = {};
    if (period === 'custom' && customFrom && customTo) {
      dateFilter = {
        createdAt: {
          gte: startOfDay(new Date(customFrom)),
          lte: endOfDay(new Date(customTo))
        }
      };
    }

    const jobs = await db.queue.findMany({
      where: { 
        shopId,
        ...dateFilter // 🌟 นำเงื่อนไขวันที่ไปจับกับ query
      },
      select: {
        status: true,
        estimatedPrice: true,
        cancelReason: true,
      }
    });

    let totalRevenue = 0;
    let completedJobs = 0;
    let cancelledJobs = 0;

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
        cancelReasons: formattedCancelReasons
      }
    };
  } catch (error) {
    console.error("❌ Error fetching analytics summary:", error);
    return { success: false, error: "ไม่สามารถดึงข้อมูลสรุปได้" };
  }
}

// ==========================================
// 2. ข้อมูลสำหรับวาดกราฟ (รายได้ และ งานซ่อม vs งานเสร็จ)
// รองรับ: 'week' | 'month' | 'year' | 'custom'
// ==========================================
export async function getTrendData(shopId: string, period: 'week' | 'month' | 'year' | 'custom', customFrom?: Date, customTo?: Date) {
  try {
    const now = new Date();
    let startDate: Date, endDate: Date;
    let intervals: Date[] = [];

    if (period === 'week') {
      startDate = startOfWeek(now, { weekStartsOn: 1 }); 
      endDate = endOfWeek(now, { weekStartsOn: 1 });
      intervals = eachDayOfInterval({ start: startDate, end: endDate });
    } else if (period === 'month') {
      startDate = startOfMonth(now);
      endDate = endOfMonth(now);
      intervals = eachDayOfInterval({ start: startDate, end: endDate });
    } else if (period === 'year') {
      startDate = startOfYear(now);
      endDate = endOfYear(now);
      intervals = eachMonthOfInterval({ start: startDate, end: endDate });
    } else if (period === 'custom' && customFrom && customTo) {
      // 🌟 กรณีเลือก Custom Date Range
      startDate = startOfDay(new Date(customFrom));
      endDate = endOfDay(new Date(customTo));
      
      // ถ้าเลือกช่วงห่างกันมากกว่า 60 วัน ให้โชว์เป็นรายเดือนแทนรายวัน (กราฟจะได้ไม่เบียดกันเกินไป)
      const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
      
      if (diffDays > 60) {
        intervals = eachMonthOfInterval({ start: startDate, end: endDate });
      } else {
        intervals = eachDayOfInterval({ start: startDate, end: endDate });
      }
    } else {
      // Fallback เผื่อไว้
      startDate = startOfMonth(now);
      endDate = endOfMonth(now);
      intervals = eachDayOfInterval({ start: startDate, end: endDate });
    }

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

    const diffDays = Math.ceil(Math.abs(endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const isMonthlyView = period === 'year' || (period === 'custom' && diffDays > 60);

    const chartData = intervals.map(date => {
      let revenue = 0;
      let processing = 0; 
      let repaired = 0;   

      jobs.forEach(job => {
        // ใช้ logic เช็คตามรูปแบบของกราฟ (รายเดือน หรือ รายวัน)
        const isSame = isMonthlyView ? isSameMonth : isSameDay;

        if (job.status === "COMPLETED" && job.completedAt && isSame(job.completedAt, date)) {
          revenue += (job.estimatedPrice || 0);
        }
        if (job.startedAt && isSame(job.startedAt, date)) {
          processing++;
        }
        if (job.repairedAt && isSame(job.repairedAt, date)) {
          repaired++;
        }
      });

      let label = "";
      if (period === 'week') label = dayNames[date.getDay()];
      else if (isMonthlyView) label = monthNames[date.getMonth()];
      else label = `${date.getDate()} ${monthNames[date.getMonth()]}`; // ถ้า custom ให้โชว์วันที่ด้วย เช่น "15 ก.พ."

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
// 3. ดึงรายการงานที่ถูกยกเลิก (รองรับ Custom Date)
// ==========================================
export async function getCancelledJobsDetails(shopId: string, period?: string, customFrom?: Date, customTo?: Date) {
  try {
    let dateFilter = {};
    if (period === 'custom' && customFrom && customTo) {
      dateFilter = {
        cancelledAt: {
          gte: startOfDay(new Date(customFrom)),
          lte: endOfDay(new Date(customTo))
        }
      };
    }

    const jobs = await db.queue.findMany({
      where: { 
        shopId, 
        status: "CANCELLED",
        ...dateFilter
      },
      orderBy: { cancelledAt: 'desc' },
      select: {
        id: true,
        jobRef: true,
        customerName: true,
        deviceModel: true,
        cancelReason: true,
        cancelledAt: true,
        issue: true,
        serviceName: true, 
      }
    });
    return { success: true, data: jobs };
  } catch (error) {
    console.error("❌ Error fetching cancelled jobs details:", error);
    return { success: false, error: "ไม่สามารถดึงข้อมูลรายการยกเลิกได้" };
  }
}