// actions/receipt.ts
"use server"

import { db } from "@/lib/prisma"
import { Prisma } from "@prisma/client"
import { verifyShopAccess } from "@/lib/auth-guard"
import { createClient } from "@/lib/supabase/server"

// ==========================================
// 🌟 1. สร้างใบเสร็จแบบรันลำดับ (Optimistic Concurrency & Race-condition safe)
// ==========================================
export async function generateAndCreateReceipt(data: {
  paymentTransactionId: string;
  shopId: string;
  amount: number;
  issuedAt: Date;
}) {
  const now = data.issuedAt;
  const yearMonth = `${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}`; // "202606"
  const prefix = `R-${yearMonth}-`;

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const lastReceipt = await db.receipt.findFirst({
        where: { receiptNo: { startsWith: prefix } },
        orderBy: { receiptNo: 'desc' },
        select: { receiptNo: true }
      });

      let nextNumber = 1;
      if (lastReceipt) {
        const parts = lastReceipt.receiptNo.split('-');
        const lastSeq = parseInt(parts[2], 10);
        nextNumber = lastSeq + 1;
      }

      const receiptNo = `${prefix}${nextNumber.toString().padStart(4, '0')}`;

      const yearPath = now.getFullYear().toString();
      const monthPath = (now.getMonth() + 1).toString().padStart(2, '0');
      const pdfPath = `receipts/${yearPath}/${monthPath}/${receiptNo}.pdf`;

      const receipt = await db.receipt.create({
        data: {
          receiptNo,
          paymentTransactionId: data.paymentTransactionId,
          shopId: data.shopId,
          amount: data.amount,
          pdfPath,
          issuedAt: now,
        }
      });

      return receipt;

    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        continue;
      }
      throw error;
    }
  }

  throw new Error("Failed to generate unique receipt number");
}

// ==========================================
// 🌟 2. ดึงประวัติการชำระเงินของร้านค้า
// ==========================================
export async function getShopPaymentHistory(shopId: string) {
  try {
    await verifyShopAccess(shopId);

    const history = await db.paymentTransaction.findMany({
      where: { shopId },
      include: { receipt: true },
      orderBy: { createdAt: 'desc' }
    });

    

    return { success: true, data: history };
  } catch (error) {
    return { success: false, error: "ไม่สามารถดึงประวัติการชำระเงินได้" };
  }
}

// ==========================================
// 🌟 3. ตรวจสอบสิทธิ์และสร้างลิงก์ดาวน์โหลดใบเสร็จ (Signed URL)
// ==========================================
export async function downloadReceiptPDF(shopId: string, receiptNo: string) {
  try {
    await verifyShopAccess(shopId);

    const receipt = await db.receipt.findUnique({
      where: { receiptNo }
    });

    

    if (!receipt || receipt.shopId !== shopId) {
      return { success: false, error: "ไม่มีสิทธิ์เข้าถึงเอกสารนี้ หรือไม่พบเอกสาร" };
    }

    const supabase = await createClient();
    const { data, error } = await supabase.storage
      .from('receipts')
      .createSignedUrl(receipt.pdfPath, 60);
  

    if (error || !data) {
      return { success: false, error: "ระบบเอกสารขัดข้อง กรุณาลองใหม่" };
    }

    return { success: true, url: data.signedUrl };
  } catch (error) {
    console.error("🔥 DOWNLOAD RECEIPT ERROR", error)
    return { success: false, error: "เกิดข้อผิดพลาดในการดึงเอกสาร" };
  }
}

// ==========================================
// 🌟 4. ดึงข้อมูลประวัติใบเสร็จล่าสุด 10 รายการ (สำหรับ Widget)
// ==========================================
export async function getLatestReceiptHistory(shopId: string) {

  try {
    await verifyShopAccess(shopId);

    // 💡 แก้ไข Type Error: เช็คจากการที่ receipt มี id แทน
    const history = await db.paymentTransaction.findMany({
      where: {
        shopId,
        receipt: { id: { not: undefined } }
      },
      include: { receipt: true },
      orderBy: { approvedAt: 'desc' },
      take: 10
    });


    return { success: true, data: history };
  } catch (error) {
    return { success: false, error: "ไม่สามารถดึงประวัติใบเสร็จได้" };
  }
}

// ==========================================
// 🌟 5. ค้นหาใบเสร็จจากเลขที่ หรือวันที่ (จำกัด 10 รายการ)
// ==========================================
export async function searchReceiptHistory({
  shopId,
  receiptNo,
  date
}: {
  shopId: string;
  receiptNo?: string;
  date?: Date;
}) {
  try {
    await verifyShopAccess(shopId);

    let dateFilter = {};
    if (date) {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      dateFilter = {
        approvedAt: {
          gte: startOfDay,
          lte: endOfDay
        }
      };
    }

    // 💡 แก้ไข Type Error: ส่ง Query ไปฝั่ง Receipt แทนถ้ามีการค้นหาด้วย receiptNo
    const history = await db.paymentTransaction.findMany({
      where: {
        shopId,
        receipt: receiptNo
          ? { receiptNo: { contains: receiptNo, mode: "insensitive" } }
          : { id: { not: undefined } },
        ...dateFilter
      },
      include: { receipt: true },
      orderBy: { approvedAt: 'desc' },
      take: 10
    });

    

    return { success: true, data: history };
  } catch (error) {
    return { success: false, error: "ไม่สามารถค้นหาใบเสร็จได้" };
  }
}