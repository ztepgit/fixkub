//app/actions/report.ts
"use server"

import { db } from "@/lib/prisma"
import { verifyShopAccess } from "@/lib/auth-guard" // 🌟 เพิ่ม Import ตัวด่านตรวจ
import {
  startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear,
  eachDayOfInterval, eachMonthOfInterval, eachHourOfInterval,
  isSameDay, isSameMonth, isSameHour,
  startOfDay, endOfDay
} from "date-fns"

// 🌟 Helper Function สำหรับสร้าง Date Filter ตามช่วงเวลาที่เลือก
function getDateFilter(period?: string, customFrom?: Date, customTo?: Date, dateField: string = 'createdAt') {
  const now = new Date();
  if (period === 'today') {
    return { [dateField]: { gte: startOfDay(now), lte: endOfDay(now) } };
  } else if (period === 'week') {
    return { [dateField]: { gte: startOfWeek(now, { weekStartsOn: 1 }), lte: endOfWeek(now, { weekStartsOn: 1 }) } };
  } else if (period === 'month') {
    return { [dateField]: { gte: startOfMonth(now), lte: endOfMonth(now) } };
  } else if (period === 'year') {
    return { [dateField]: { gte: startOfYear(now), lte: endOfYear(now) } };
  } else if (period === 'custom' && customFrom && customTo) {
    return { [dateField]: { gte: startOfDay(new Date(customFrom)), lte: endOfDay(new Date(customTo)) } };
  }
  return {};
}

// ==========================================
// 1. ดึงสถิติภาพรวม และ ตารางสาเหตุการยกเลิก 
// ==========================================
export async function getAnalyticsSummary(shopId: string, period?: string, customFrom?: Date, customTo?: Date) {
  try {
    // 🛡️ ด่านตรวจสิทธิ์: ป้องกันแฮกเกอร์แอบดึงยอดขายของร้านอื่น
    await verifyShopAccess(shopId);

    const dateFilter = getDateFilter(period, customFrom, customTo, 'createdAt');

    const jobs = await db.queue.findMany({
      where: {
        shopId,
        ...dateFilter
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
      "NO_SHOW": 0, "CUSTOMER_CANCEL": 0, "UNREPAIRABLE": 0, "NO_PARTS": 0, "UNCONTACTABLE": 0
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
  } catch (error: any) {
    console.error("❌ Error fetching analytics summary:", error);
    return { success: false, error: error.message || "ไม่สามารถดึงข้อมูลสรุปได้" };
  }
}

// ==========================================
// 2. ข้อมูลสำหรับวาดกราฟ (รายได้ และ งานซ่อม vs งานเสร็จ)
// ==========================================
export async function getTrendData(shopId: string, period: 'today' | 'week' | 'month' | 'year' | 'custom', customFrom?: Date, customTo?: Date) {
  try {
    // 🛡️ ด่านตรวจสิทธิ์
    await verifyShopAccess(shopId);

    const now = new Date();
    let startDate: Date, endDate: Date;
    let intervals: Date[] = [];

    if (period === 'today') {
      startDate = startOfDay(now);
      endDate = endOfDay(now);
      intervals = eachHourOfInterval({ start: startDate, end: endDate });
    } else if (period === 'week') {
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
      startDate = startOfDay(new Date(customFrom));
      endDate = endOfDay(new Date(customTo));
      const diffDays = Math.ceil(Math.abs(endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays > 60) intervals = eachMonthOfInterval({ start: startDate, end: endDate });
      else intervals = eachDayOfInterval({ start: startDate, end: endDate });
    } else {
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
    const isHourlyView = period === 'today';

    const chartData = intervals.map(date => {
      let revenue = 0;
      let processing = 0;
      let repaired = 0;

      jobs.forEach(job => {
        let isSame = isSameDay;
        if (isHourlyView) isSame = isSameHour;
        else if (isMonthlyView) isSame = isSameMonth;

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
      if (period === 'today') label = `${date.getHours().toString().padStart(2, '0')}:00`;
      else if (period === 'week') label = dayNames[date.getDay()];
      else if (isMonthlyView) label = monthNames[date.getMonth()];
      else label = `${date.getDate()} ${monthNames[date.getMonth()]}`;

      return {
        label,
        revenue,
        processing,
        repaired,
      };
    });

    return { success: true, data: chartData };

  } catch (error: any) {
    console.error("❌ Error fetching trend data:", error);
    return { success: false, error: error.message || "ไม่สามารถดึงข้อมูลกราฟได้" };
  }
}

// ==========================================
// 3. ดึงรายการงานที่ถูกยกเลิก 
// ==========================================
export async function getCancelledJobsDetails(shopId: string, period?: string, customFrom?: Date, customTo?: Date) {
  try {
    // 🛡️ ด่านตรวจสิทธิ์
    await verifyShopAccess(shopId);

    const dateFilter = getDateFilter(period, customFrom, customTo, 'cancelledAt');

    const jobs = await db.queue.findMany({
      where: {
        shopId,
        status: "CANCELLED",
        ...dateFilter
      },
      orderBy: { cancelledAt: 'desc' },
      select: {
        id: true, jobRef: true, customerName: true, deviceModel: true,
        cancelReason: true, cancelledAt: true, issue: true, serviceName: true,
      }
    });
    return { success: true, data: jobs };
  } catch (error: any) {
    console.error("❌ Error fetching cancelled jobs details:", error);
    return { success: false, error: error.message || "ไม่สามารถดึงข้อมูลรายการยกเลิกได้" };
  }
}