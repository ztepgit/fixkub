"use server"; // 🌟 บรรทัดนี้สำคัญมาก! เป็นการบอก Next.js ว่าไฟล์นี้คือฝั่ง Server เท่านั้น

import { db } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

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
export async function updateQueueStatus(queueId: string, newStatus: any, additionalData?: any) {
  try {
    const updatedQueue = await db.queue.update({
      where: { id: queueId },
      data: { 
        status: newStatus,
        ...additionalData // 🌟 ใส่จุดสามจุดตรงนี้ เพื่อให้มันเอาข้อมูลอื่นมาบันทึกด้วย
      },
    });
    return { success: true, data: updatedQueue };
  } catch (error) {
    console.error("❌ Error updating status:", error);
    return { success: false, error: "อัปเดตสถานะไม่สำเร็จ" };
  }
}

// --- วางต่อท้ายไฟล์ actions/queue.ts ---

// ค้นหาคิวสำหรับลูกค้า (ค้นจากเลขบิล หรือ เบอร์โทร)
export async function getQueueByRefOrPhone(shopId: string, searchQuery: string) {
  try {
    const job = await db.queue.findFirst({
      where: {
        shopId: shopId,
        OR: [
          { jobRef: { equals: searchQuery, mode: 'insensitive' } }, // ค้นหาเลขบิลแบบไม่สนตัวพิมพ์เล็ก/ใหญ่
          { phoneNumber: searchQuery } // หรือค้นจากเบอร์โทร
        ]
      },
      orderBy: { createdAt: 'desc' } // ถ้าเบอร์โทรซ้ำ ให้เอาบิลล่าสุดมาโชว์
    });

    if (!job) {
      return { success: false, error: "ไม่พบข้อมูลใบสั่งซ่อมจากรหัสหรือเบอร์โทรนี้" };
    }

    return { success: true, data: job };
  } catch (error) {
    console.error("❌ Error fetching queue by ref:", error);
    return { success: false, error: "ค้นหาข้อมูลไม่สำเร็จ ระบบขัดข้อง" };
  }
}