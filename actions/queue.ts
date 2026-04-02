"use server";

import { verifyShopAccess } from "@/lib/auth-guard"
import { db } from "@/lib/prisma";
import { z } from "zod";

// ==========================================
// 🌟 1. สร้าง Zod Schema (The Gatekeeper)
// กำหนดกฎ กรองขยะ และ Normalize ข้อมูลก่อนเข้า Database
// ==========================================
const createQueueSchema = z.object({
  shopId: z.string().cuid("รหัสร้านค้าไม่ถูกต้อง"), // ป้องกันการยิง API มั่ว
  customerName: z.string().trim().min(1, "กรุณากรอกชื่อลูกค้า").max(100, "ชื่อยาวเกินไป"),

  // 🌟 พรีกระบวนการ (Pre-process) เบอร์โทรศัพท์
  phoneNumber: z.string()
    .trim()
    .min(1, "กรุณากรอกเบอร์โทรศัพท์")
    .transform((val) => val.replace(/[-\s]/g, "")) // 🪄 Normalize: ลบขีดและช่องว่างออก
    .pipe(z.string().regex(/^0\d{8,9}$/, "เบอร์โทรศัพท์ไม่ถูกต้อง (ต้องเป็นตัวเลข 9-10 หลัก)")),

  deviceModel: z.string().trim().min(1, "กรุณากรอกรุ่นมือถือ/อุปกรณ์").max(100, "ชื่อรุ่นยาวเกินไป"),
  deviceColor: z.string().trim().max(50, "ระบุสีสั้นๆ พอครับ").optional().or(z.literal("")),
  issue: z.string().trim().max(500, "รายละเอียดต้องไม่เกิน 500 ตัวอักษร").optional().or(z.literal("")),
  serviceName: z.string().trim().min(1, "กรุณาเลือกบริการ").max(100, "ชื่อบริการยาวเกินไป"),

  serialNumber: z.string().trim().max(100, "Serial Number ยาวเกินไป").optional().or(z.literal("")),
  imei: z.string().trim().max(50, "IMEI ยาวเกินไป").optional().or(z.literal("")),
  isManualEntry: z.boolean().optional().default(false)
});

// ดึง Type ออกมาจาก Zod Schema ไปใช้เป็น Input
export type CreateQueueInput = z.input<typeof createQueueSchema>;

export async function createQueue(input: CreateQueueInput) {
  try {
    // 🛡️ ด่านที่ 1: ตรวจสอบและล้างข้อมูลด้วย Zod
    const safeData = createQueueSchema.parse(input);

    // 🛡️ ด่านที่ 2: ตรวจสอบสิทธิ์ (Auth Guard) ป้องกันการสร้างคิวให้ร้านอื่น
    await verifyShopAccess(safeData.shopId);

    // ตรวจสอบว่า Shop มีอยู่จริงไหม 
    const shop = await db.shop.findUnique({
      where: { id: safeData.shopId },
      select: { id: true }
    });

    if (!shop) {
      return { success: false, error: "ไม่พบข้อมูลร้านค้านี้ในระบบ" };
    }

    // 🌟 สร้างรหัสคิวซ่อมแบบสุ่ม 4 หลัก (เช่น Q-8F2A)
    const randomCode = Math.random().toString(36).substring(2, 6).toUpperCase();
    const generatedJobRef = `Q-${randomCode}`;

    // 💾 สั่ง Prisma บันทึกข้อมูลลง Database
    const newQueue = await db.queue.create({
      data: {
        shopId: safeData.shopId,
        jobRef: generatedJobRef,
        customerName: safeData.customerName,
        phoneNumber: safeData.phoneNumber, // เบอร์นี้สะอาด ไร้ขีดแล้ว
        deviceModel: safeData.deviceModel,
        deviceColor: safeData.deviceColor || null,
        serialNumber: safeData.serialNumber || null,
        imei: safeData.imei || null,
        issue: safeData.issue || null,
        serviceName: safeData.serviceName,
        isManualEntry: safeData.isManualEntry,
        status: "PENDING",
      },
    });

    return {
      success: true,
      data: newQueue,
      message: "สร้างคิวสำเร็จ!"
    };

  } catch (error: any) {
    console.error("❌ Error creating queue:", error);

    // ถ้าพังเพราะ Zod ให้ดึงข้อความแจ้งเตือนภาษาไทยออกมาแสดงที่ UI
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message };
    }

    return {
      success: false,
      // ส่ง error.message ออกไปเผื่อเป็น Error จาก verifyShopAccess
      error: error.message || "เกิดข้อผิดพลาดในการสร้างคิว กรุณาลองใหม่อีกครั้ง"
    };
  }
}

// ==========================================
// ฟังก์ชันดึงข้อมูลคิวทั้งหมดของร้าน
// ==========================================
export async function getQueues(shopId: string) {
  try {
    // 🌟 ด่านตรวจ: ถ้าไม่ใช่เจ้าร้าน มันจะ Error และเด้งไป catch ทันที
    await verifyShopAccess(shopId);

    const queues = await db.queue.findMany({
      where: { shopId: shopId },
      orderBy: { createdAt: 'asc' },
    });

    return { success: true, data: queues };
  } catch (error: any) {
    console.error("❌ Error fetching queues:", error);
    return { success: false, error: error.message || "ดึงข้อมูลคิวไม่สำเร็จ" };
  }
}

// ==========================================
// 🌟 อัปเดตสถานะคิวซ่อม
// ==========================================
export async function updateQueueStatus(id: string, status: string, additionalData?: any) {
  try {
    // 1. ดึงข้อมูลคิวขึ้นมาก่อน
    const existingQueue = await db.queue.findUnique({
      where: { id }
    });

    if (!existingQueue) {
      return { success: false, error: "ไม่พบข้อมูลคิวนี้ในระบบ" };
    }

    // 🌟 2. ด่านตรวจ: ป้องกันการแอบสุ่ม ID คิวของร้านอื่นเพื่ออัปเดต
    await verifyShopAccess(existingQueue.shopId);

    const updateData: any = {
      status,
      ...additionalData
    };

    // บันทึกเวลาตามสถานะ
    if (status === "WAITING" && !existingQueue.acceptedAt) {
      updateData.acceptedAt = new Date();
    }
    else if (status === "PROCESSING" && !existingQueue.startedAt) {
      updateData.startedAt = new Date();
    }
    else if (status === "REPAIRED" && !existingQueue.repairedAt) {
      updateData.repairedAt = new Date();
    }
    else if (status === "COMPLETED" && !existingQueue.completedAt) {
      updateData.completedAt = new Date();
    }
    else if (status === "CANCELLED" && !existingQueue.cancelledAt) {
      updateData.cancelledAt = new Date();
    }

    const updatedQueue = await db.queue.update({
      where: { id },
      data: updateData,
    });

    return {
      success: true,
      data: updatedQueue,
      message: "อัปเดตสถานะสำเร็จ"
    };

  } catch (error: any) {
    console.error("❌ Error updating queue status:", error);
    return {
      success: false,
      error: error.message || "เกิดข้อผิดพลาดในการอัปเดตสถานะ"
    };
  }
}

// ==========================================
// 🌟 ดึงข้อมูลคิวสำหรับหน้าเช็คสถานะของลูกค้า
// 🚨 หมายเหตุ: ฟังก์ชันนี้สำหรับ PUBLIC (ลูกค้า) จึงไม่มี verifyShopAccess
// ==========================================
export async function getCustomerQueues(shopId: string, searchKey: string) {
  try {
    // 💡 ถ้า searchKey เป็นเบอร์โทรที่มีขีด ก็ Normalize ออกก่อนค้นหา
    const cleanSearchKey = searchKey.replace(/[-\s]/g, "");

    const queues = await db.queue.findMany({
      where: {
        shopId,
        OR: [
          { phoneNumber: { contains: cleanSearchKey } },
          { jobRef: { contains: searchKey.toUpperCase() } },
          { customerName: { contains: searchKey, mode: 'insensitive' } }
        ]
      },
      orderBy: { createdAt: 'desc' },
    });

    return { success: true, data: queues };
  } catch (error) {
    console.error("Error fetching customer queues:", error);
    return { success: false, error: "ไม่สามารถค้นหาข้อมูลได้ในขณะนี้" };
  }
}

// ==========================================
// 🌟 ดึงงาน Top 50 สำหรับ Dashboard
// ==========================================
export async function getTop50Jobs(shopId: string) {
  try {
    // 🌟 ด่านตรวจ
    await verifyShopAccess(shopId);

    const jobs = await db.queue.findMany({
      where: {
        shopId,
        status: { in: ["PROCESSING", "WAITING", "PENDING", "REPAIRED"] }
      },
      orderBy: { updatedAt: 'desc' },
      take: 100,
    })

    if (jobs.length < 50) {
      const otherJobs = await db.queue.findMany({
        where: { shopId, status: { notIn: ["PROCESSING", "WAITING", "PENDING", "REPAIRED"] } },
        orderBy: { updatedAt: 'desc' },
        take: 50 - jobs.length
      })
      jobs.push(...otherJobs)
    }

    const getPriority = (status: string) => {
      switch (status) {
        case "PROCESSING": return 1
        case "WAITING": return 2
        case "PENDING": return 3
        case "REPAIRED": return 4
        case "COMPLETED": return 5
        case "ARCHIVED": return 6
        case "CANCELLED": return 7
        default: return 8
      }
    }

    const sortedJobs = jobs.sort((a, b) => {
      const pDiff = getPriority(a.status) - getPriority(b.status)
      if (pDiff !== 0) return pDiff
      return b.updatedAt.getTime() - a.updatedAt.getTime()
    }).slice(0, 50)

    return { success: true, data: sortedJobs }
  } catch (error: any) {
    console.error("Error fetching top 50 jobs:", error)
    return { success: false, error: error.message || "ไม่สามารถโหลดข้อมูลคิวล่าสุดได้" }
  }
}

// ==========================================
// 🌟 ค้นหา / ดูประวัติ (รองรับ Pagination)
// ==========================================
export async function searchJobHistory(shopId: string, query: string, page = 1, limit = 20) {
  try {
    // 🌟 ด่านตรวจ
    await verifyShopAccess(shopId);

    const skip = (page - 1) * limit;

    // 💡 Normalize query ถ้าผู้ใช้พิมพ์เบอร์โทรแบบมีขีดมาค้นหา
    const cleanQuery = query ? query.replace(/[-\s]/g, "") : query;

    const searchFilter = query ? {
      OR: [
        { jobRef: { contains: query, mode: 'insensitive' as const } },
        { customerName: { contains: query, mode: 'insensitive' as const } },
        { phoneNumber: { contains: cleanQuery } },
        { deviceModel: { contains: query, mode: 'insensitive' as const } },
      ]
    } : {};

    const [jobs, total] = await Promise.all([
      db.queue.findMany({
        where: { shopId, ...searchFilter },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      db.queue.count({ where: { shopId, ...searchFilter } })
    ]);

    return { success: true, data: { jobs, total, page, totalPages: Math.ceil(total / limit) } };
  } catch (error: any) {
    console.error("Error searching history:", error);
    return { success: false, error: error.message || "ค้นหาข้อมูลล้มเหลว" };
  }
}