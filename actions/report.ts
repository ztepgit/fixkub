"use server"

import { db } from "@/lib/prisma"
import { verifyShopAccess } from "@/lib/auth-guard"
import { 
  startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear,
  eachDayOfInterval, eachMonthOfInterval, eachHourOfInterval,
  isSameDay, isSameMonth, isSameHour,
  startOfDay, endOfDay
} from "date-fns"

// 🌟 Helper Function ที่คืนค่า startDate และ endDate สำหรับเป็น Master Range
function getDateRange(period?: string, customFrom?: Date, customTo?: Date) {
  const now = new Date();
  if (period === 'today') return { start: startOfDay(now), end: endOfDay(now) };
  if (period === 'week') return { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) };
  if (period === 'month') return { start: startOfMonth(now), end: endOfMonth(now) };
  if (period === 'year') return { start: startOfYear(now), end: endOfYear(now) };
  if (period === 'custom' && customFrom && customTo) return { start: startOfDay(new Date(customFrom)), end: endOfDay(new Date(customTo)) };
  
  return { start: startOfMonth(now), end: endOfMonth(now) }; // Default
}

// ==========================================
// 🚀 ดึงข้อมูล Report ทั้งหมดใน 1 Request (ลด Cost DB สแกน)
// ==========================================
export async function getReportDashboardData(
  shopId: string, 
  period: 'today' | 'week' | 'month' | 'year' | 'custom', 
  customFrom?: Date, 
  customTo?: Date
) {
  try {
    // 🛡️ ด่านตรวจสิทธิ์
    await verifyShopAccess(shopId);

    // 1. หาช่วงเวลาเริ่มต้นและสิ้นสุด
    const { start: startDate, end: endDate } = getDateRange(period, customFrom, customTo);

    // 🎯 2. SINGLE DB QUERY: ดึงงานทั้งหมดที่มี "ความเคลื่อนไหว" ในช่วงเวลานี้ ครั้งเดียวจบ!
    // (ไม่ว่าจะเพิ่งถูกสร้าง, เริ่มทำ, ซ่อมเสร็จ หรือโดนยกเลิก ในช่วงเวลานี้)
    const jobs = await db.queue.findMany({
      where: {
        shopId,
        OR: [
          { createdAt: { gte: startDate, lte: endDate } },
          { startedAt: { gte: startDate, lte: endDate } },
          { repairedAt: { gte: startDate, lte: endDate } },
          { completedAt: { gte: startDate, lte: endDate } },
          { cancelledAt: { gte: startDate, lte: endDate } },
        ]
      },
      select: {
        id: true,
        jobRef: true,
        customerName: true,
        deviceModel: true,
        issue: true,
        serviceName: true,
        status: true,
        estimatedPrice: true,
        cancelReason: true,
        createdAt: true,
        startedAt: true,
        repairedAt: true,
        completedAt: true,
        cancelledAt: true,
      }
    });

    // 🧠 3. IN-MEMORY AGGREGATION: ประมวลผลแบ่งกลุ่มข้อมูล (อิง Logic เดิมของคุณ 100%)

    // --- ตัวแปรสำหรับ Summary ---
    let totalRevenue = 0;
    let completedJobs = 0;
    let cancelledJobs = 0;
    let totalJobsCreated = 0;
    const cancelStats: Record<string, number> = {
      "NO_SHOW": 0, "CUSTOMER_CANCEL": 0, "UNREPAIRABLE": 0, "NO_PARTS": 0, "UNCONTACTABLE": 0
    };

    // --- ตัวแปรสำหรับ Cancelled List ---
    const cancelledDetailsList: typeof jobs = [];

    jobs.forEach(job => {
      // Logic สรุปยอดบนการ์ด (คิดเฉพาะงานที่ "สร้าง(createdAt)" ในช่วงเวลานี้)
      const isCreatedInRange = job.createdAt >= startDate && job.createdAt <= endDate;
      
      if (isCreatedInRange) {
        totalJobsCreated++;
        if (job.status === "COMPLETED") {
          totalRevenue += (job.estimatedPrice || 0);
          completedJobs++;
        } else if (job.status === "CANCELLED") {
          cancelledJobs++;
          if (job.cancelReason && cancelStats[job.cancelReason] !== undefined) {
            cancelStats[job.cancelReason]++;
          }
        }
      }

      // Logic เก็บรายชื่อคิวยกเลิกลงตาราง (คิดเฉพาะงานที่ "ยกเลิก(cancelledAt)" ในช่วงเวลานี้)
      if (job.status === "CANCELLED" && job.cancelledAt && job.cancelledAt >= startDate && job.cancelledAt <= endDate) {
        cancelledDetailsList.push(job);
      }
    });

    // จัดเรียงสาเหตุการยกเลิก
    const formattedCancelReasons = Object.entries(cancelStats)
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count);
      
    // จัดเรียงตารางคิวยกเลิก ล่าสุดขึ้นก่อน
    cancelledDetailsList.sort((a, b) => (b.cancelledAt?.getTime() || 0) - (a.cancelledAt?.getTime() || 0));


    // --- ตัวแปรสำหรับ Trend Chart ---
    let intervals: Date[] = [];
    if (period === 'today') intervals = eachHourOfInterval({ start: startDate, end: endDate });
    else if (period === 'week') intervals = eachDayOfInterval({ start: startDate, end: endDate });
    else if (period === 'month') intervals = eachDayOfInterval({ start: startDate, end: endDate });
    else if (period === 'year') intervals = eachMonthOfInterval({ start: startDate, end: endDate });
    else if (period === 'custom') {
      const diffDays = Math.ceil(Math.abs(endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays > 60) intervals = eachMonthOfInterval({ start: startDate, end: endDate });
      else intervals = eachDayOfInterval({ start: startDate, end: endDate });
    }

    const dayNames = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];
    const monthNames = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

    const diffDaysTrend = Math.ceil(Math.abs(endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const isMonthlyView = period === 'year' || (period === 'custom' && diffDaysTrend > 60);
    const isHourlyView = period === 'today';

    const chartData = intervals.map(date => {
      let revenue = 0;
      let processing = 0;
      let repaired = 0;

      jobs.forEach(job => {
        let isSame = isSameDay;
        if (isHourlyView) isSame = isSameHour;
        else if (isMonthlyView) isSame = isSameMonth;

        // ดึงเฉพาะงานที่เสร็จ/เริ่มทำ ในวันนั้นๆ (เหมือนโค้ดเดิมเป๊ะ)
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

      return { label, revenue, processing, repaired };
    });

    // 🎯 4. รวบรวมส่งกลับไปที่หน้า Frontend
    return {
      success: true,
      data: {
        summary: {
          totalRevenue,
          totalJobs: totalJobsCreated,
          completedJobs,
          cancelledJobs,
          cancelReasons: formattedCancelReasons
        },
        trend: chartData,
        cancelledDetails: cancelledDetailsList
      }
    };

  } catch (error: any) {
    console.error("❌ Error fetching unified report data:", error);
    return { success: false, error: error.message || "ไม่สามารถดึงข้อมูลรายงานได้" };
  }
}