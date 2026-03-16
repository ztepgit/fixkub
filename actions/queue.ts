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
  isManualEntry?: boolean; // บอกว่าช่างคีย์เอง หรือลูกค้าสแกนมา
}

export async function createQueue(data: CreateQueueInput) {
  try {
    // 1. สั่ง Prisma บันทึกข้อมูลลง Database
    const newQueue = await db.queue.create({
      data: {
        shopId: data.shopId,
        customerName: data.customerName,
        phoneNumber: data.phoneNumber,
        deviceModel: data.deviceModel,
        deviceColor: data.deviceColor,
        issue: data.issue,
        isManualEntry: data.isManualEntry || false,
        status: "PENDING", // ค่าเริ่มต้น (ตั้งเป็น PENDING เสมอเวลาสร้างใหม่)
      },
    });

    // 2. ส่งข้อมูลที่บันทึกสำเร็จกลับไปให้หน้าเว็บ
    return { 
      success: true, 
      data: newQueue, 
      message: "สร้างคิวสำเร็จ!" 
    };

  } catch (error) {
    console.error("❌ Error creating queue:", error);
    
    // จัดการ Error ส่งกลับไปบอกหน้าเว็บ
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

// 2. ฟังก์ชันอัปเดตสถานะคิว (ตอนช่างกดย้ายการ์ด)
export async function updateQueueStatus(queueId: string, newStatus: any) {
  try {
    const updatedQueue = await db.queue.update({
      where: { id: queueId },
      data: { status: newStatus },
    });
    return { success: true, data: updatedQueue };
  } catch (error) {
    console.error("❌ Error updating status:", error);
    return { success: false, error: "อัปเดตสถานะไม่สำเร็จ" };
  }
}