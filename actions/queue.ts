"use server";

import { db } from "@/lib/prisma";

// กำหนด Type ข้อมูลที่จะรับมาจากหน้าเว็บ
interface CreateQueueInput {
  shopId: string;
  customerName: string;
  phoneNumber?: string;
  deviceModel?: string;
  deviceColor?: string;
  issue?: string;
  serviceName?: string; // 🌟 1. เพิ่มบรรทัดนี้เข้าไปครับ
  isManualEntry?: boolean; // บอกว่าช่างคีย์เอง หรือลูกค้าสแกนมา
  serialNumber?: string; // 🌟 เพิ่มบรรทัดนี้
  imei?: string;         // 🌟 เพิ่มบรรทัดนี้
}

export async function createQueue(data: CreateQueueInput) {
  try {
    // 🌟 1. สร้างรหัสคิวซ่อมแบบสุ่ม 4 หลัก (เช่น Q-8F2A)
    const randomCode = Math.random().toString(36).substring(2, 6).toUpperCase();
    const generatedJobRef = `Q-${randomCode}`;

    // 2. สั่ง Prisma บันทึกข้อมูลลง Database
    const newQueue = await db.queue.create({
      data: {
        shopId: data.shopId,
        jobRef: generatedJobRef, // 🌟 3. เซฟรหัสคิวจริงลง DB ทันที
        customerName: data.customerName,
        phoneNumber: data.phoneNumber,
        deviceModel: data.deviceModel,
        deviceColor: data.deviceColor,
        serialNumber: data.serialNumber, // 🌟 ส่งเข้า DB
        imei: data.imei,                 // 🌟 ส่งเข้า DB
        issue: data.issue,
        serviceName: data.serviceName, 
        isManualEntry: data.isManualEntry || false,
        status: "PENDING", 
      },
    });

    return { 
      success: true, 
      data: newQueue, 
      message: "สร้างคิวสำเร็จ!" 
    };

  } catch (error) {
    console.error("❌ Error creating queue:", error);
    return { 
      success: false, 
      error: "เกิดข้อผิดพลาดในการสร้างคิว กรุณาลองใหม่อีกครั้ง" 
    };
  }
}

// --- วางต่อท้ายไฟล์ actions/queue.ts ---

// 1. ฟังก์ชันดึงข้อมูลคิวทั้งหมดของร้าน
export async function getQueues(shopId: string) {
  try {
    const queues = await db.queue.findMany({
      where: { 
        shopId: shopId,
        // (Option) ถ้าอยากซ่อนงานที่ถูกลบไปแล้ว ให้เพิ่มเงื่อนไขตรงนี้ได้
      },
      orderBy: { createdAt: 'asc' }, // เรียงตามเวลาที่สร้าง (คิวแรกอยู่บน)
    });
    return { success: true, data: queues };
  } catch (error) {
    console.error("❌ Error fetching queues:", error);
    return { success: false, error: "ดึงข้อมูลคิวไม่สำเร็จ" };
  }
}

// 🌟 เปลี่ยนให้รับข้อมูลอื่นๆ เพิ่มเติมได้ เช่น เหตุผลการยกเลิก หรือ เวลาที่ปิดจ๊อบ
export async function updateQueueStatus(id: string, status: string, additionalData?: any) {
  try {
    // 🌟 1. ดึงข้อมูลคิวเดิมจาก Database มาตรวจสอบก่อน
    // เพื่อป้องกันไม่ให้เวลารีเซ็ตใหม่ ตอนที่ช่างแค่กดอัปเดตราคาหรือเลข IMEI
    const existingQueue = await db.queue.findUnique({
      where: { id }
    });

    if (!existingQueue) {
      return { success: false, error: "ไม่พบข้อมูลคิวนี้ในระบบ" };
    }

    // 2. เตรียมข้อมูลที่จะอัปเดต
    const updateData: any = { 
      status, 
      ...additionalData 
    };

    // 🌟 3. ดักจับสถานะ โดยเช็คจาก existingQueue ว่าเคยมีเวลาประทับไว้หรือยัง?
    if (status === "WAITING" && !existingQueue.acceptedAt) {
      updateData.acceptedAt = new Date(); // เวลารับเครื่องเข้าคิว
    } 
    else if (status === "PROCESSING" && !existingQueue.startedAt) {
      updateData.startedAt = new Date(); // เวลาเริ่มแกะซ่อม
    } 
    else if (status === "REPAIRED" && !existingQueue.repairedAt) {
      updateData.repairedAt = new Date(); // เวลาซ่อมเสร็จ
    } 
    else if (status === "COMPLETED" && !existingQueue.completedAt) {
      updateData.completedAt = new Date(); // เวลาส่งมอบเครื่อง/รับเงิน
    }
    else if (status === "CANCELLED" && !existingQueue.cancelledAt) {
      updateData.cancelledAt = new Date(); // เวลายกเลิกคิว
    }

    // 4. บันทึกลง Database
    const updatedQueue = await db.queue.update({
      where: { id },
      data: updateData,
    });

    return { 
      success: true, 
      data: updatedQueue,
      message: "อัปเดตสถานะสำเร็จ"
    };

  } catch (error) {
    console.error("❌ Error updating queue status:", error);
    return { 
      success: false, 
      error: "เกิดข้อผิดพลาดในการอัปเดตสถานะ" 
    };
  }
}
// --- วางต่อท้ายไฟล์ actions/queue.ts ---


// ==========================================
// 🌟 ดึงข้อมูลคิวสำหรับหน้าเช็คสถานะของลูกค้า
// ==========================================
export async function getCustomerQueues(shopId: string, searchKey: string) {
  try {
    const queues = await db.queue.findMany({
      where: {
        shopId,
        // 🌟 ค้นหาได้ทั้ง เบอร์โทร, รหัสคิว, และ ชื่อลูกค้า (ตัวเล็ก/ตัวใหญ่ได้หมด)
        OR: [
          { phoneNumber: { contains: searchKey } },
          { jobRef: { contains: searchKey.toUpperCase() } },
          { customerName: { contains: searchKey, mode: 'insensitive' } } // 🌟 เพิ่มการค้นหาด้วยชื่อ
        ]
      },
      // เรียงจากงานล่าสุดไปหางานเก่าสุด
      orderBy: { createdAt: 'desc' },
      
      // 🌟 เอา take: 5 ออก เพื่อให้แสดงประวัติงานซ่อมทั้งหมดที่เคยมาทำกับร้านเรา
    });
    
    return { success: true, data: queues };
  } catch (error) {
    console.error("Error fetching customer queues:", error);
    return { success: false, error: "ไม่สามารถค้นหาข้อมูลได้ในขณะนี้" };
  }
}


export async function getTop50Jobs(shopId: string) {
  try {
    // 🌟 ดึงข้อมูลโดยใช้ประโยชน์จาก Index: ดึงเฉพาะ Active งานและงานล่าสุด
    const jobs = await db.queue.findMany({
      where: { 
        shopId,
        // ดึงงานที่ยังไม่เสร็จเป็นหลักก่อน เพื่อให้บอร์ดไม่โล่ง
        status: { in: ["PROCESSING", "WAITING", "PENDING", "REPAIRED"] }
      },
      orderBy: { updatedAt: 'desc' }, 
      take: 100, // ดึงมาเผื่อเรียง
    })

    // ถ้างาน Active มีไม่ถึง 50 ให้ดึงงานอื่นๆ มาเติมให้ครบ (กันบอร์ดโล่ง)
    if (jobs.length < 50) {
      const otherJobs = await db.queue.findMany({
        where: { shopId, status: { notIn: ["PROCESSING", "WAITING", "PENDING", "REPAIRED"] } },
        orderBy: { updatedAt: 'desc' },
        take: 50 - jobs.length
      })
      jobs.push(...otherJobs)
    }

    // 🌟 จัดเรียง Priority บน Server เล็กน้อยก่อนส่งให้ Client
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
    }).slice(0, 50) // ส่งไปแค่ Top 50 ตามเป้าหมาย

    return { success: true, data: sortedJobs }
  } catch (error) {
    console.error("Error fetching top 50 jobs:", error)
    return { success: false, error: "ไม่สามารถโหลดข้อมูลคิวล่าสุดได้" }
  }
}

// 🌟 ฟังก์ชันแยกสำหรับหน้า "ค้นหา / ดูประวัติ" โดยเฉพาะ (รองรับ Pagination)
export async function searchJobHistory(shopId: string, query: string, page = 1, limit = 20) {
  try {
    const skip = (page - 1) * limit;
    const searchFilter = query ? {
      OR: [
        { jobRef: { contains: query, mode: 'insensitive' as const } },
        { customerName: { contains: query, mode: 'insensitive' as const } },
        { phoneNumber: { contains: query } },
        { phone: { contains: query } },
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
  } catch (error) {
    console.error("Error searching history:", error);
    return { success: false, error: "ค้นหาข้อมูลล้มเหลว" };
  }
}