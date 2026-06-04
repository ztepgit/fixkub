// actions/receipt.ts
"use server"

import { db } from "@/lib/prisma"
import { Prisma } from "@prisma/client" // 🌟 เพิ่ม Import Prisma สำหรับเช็ค Error Code
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

  // 🌟 รันลูป Retry สูงสุด 3 ครั้งเมื่อเกิดการชนกันของเลขที่ใบเสร็จ
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      // 1. หาเลขที่ล่าสุดของเดือนนี้
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

      const receiptNo = `${prefix}${nextNumber.toString().padStart(4, '0')}`; // R-202606-0001
      
      // สร้าง PDF Path ล่วงหน้า
      const yearPath = now.getFullYear().toString();
      const monthPath = (now.getMonth() + 1).toString().padStart(2, '0');
      const pdfPath = `receipts/${yearPath}/${monthPath}/${receiptNo}.pdf`;

      // 2. พยายามสร้าง Receipt Record ทันที
      // 🚨 หากมี 2 Request ดึงเลขเดียวกันไปใช้ จังหวะที่ Create ตรงนี้จะเกิด Error P2002 ทันที
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

      // ถ้าผ่านบรรทัดบนมาได้ แสดงว่าจองเลขสำเร็จและไม่ซ้ำแน่นอน
      return receipt;

    } catch (error) {
      // 3. ดักจับ Error ทะเบียนซ้ำ (Unique Constraint Violation)
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        continue; // 🔄 ชนกับ Request อื่น ให้เริ่มลูปเพื่อรันเลขใหม่
      }

      // ถ้าเป็น Error อื่นๆ เช่น DB ล่ม ให้โยน Error ออกไป
      throw error;
    }
  }

  // 💥 กรณีที่ลองครบ 3 รอบแล้วยังชนอยู่
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
      include: { receipt: true }, // 🌟 ดึงข้อมูลใบเสร็จติดมาด้วย
      orderBy: { createdAt: 'desc' }
    });

    return { success: true, data: history };
  } catch (error: any) {
    return { success: false, error: "ไม่สามารถดึงประวัติการชำระเงินได้" };
  }
}

// ==========================================
// 🌟 3. ตรวจสอบสิทธิ์และสร้างลิงก์ดาวน์โหลดใบเสร็จ (Signed URL)
// ==========================================
export async function downloadReceiptPDF(shopId: string, receiptNo: string) {
  try {
    // 🛡️ ด่านที่ 1: ยืนยันสิทธิ์ว่าเป็นคนในร้านจริงไหม (IDOR Guard)
    await verifyShopAccess(shopId);

    // 🛡️ ด่านที่ 2: ดึงข้อมูลใบเสร็จและตรวจสอบว่าใบเสร็จนี้เป็นของร้านตัวเอง
    const receipt = await db.receipt.findUnique({
      where: { receiptNo }
    });

    if (!receipt || receipt.shopId !== shopId) {
       return { success: false, error: "ไม่มีสิทธิ์เข้าถึงเอกสารนี้ หรือไม่พบเอกสาร" };
    }

    // 🔗 สร้าง Signed URL อายุ 60 วินาทีให้ลูกค้าดาวน์โหลดจาก Supabase Storage แบบ Private
    const supabase = await createClient();
    const { data, error } = await supabase.storage
      .from('receipts')
      .createSignedUrl(receipt.pdfPath, 60);

    if (error || !data) {
       return { success: false, error: "ระบบเอกสารขัดข้อง กรุณาลองใหม่" };
    }

    return { success: true, url: data.signedUrl };
  } catch (error: any) {
    return { success: false, error: "เกิดข้อผิดพลาดในการดึงเอกสาร" };
  }
}