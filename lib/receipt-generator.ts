// lib/receipt-generator.ts
import { PDFDocument, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import fs from 'fs';
import path from 'path';

interface ReceiptData {
  receiptNo: string;
  issuedAt: Date;
  shopName: string;
  plan: string;
  amount: number;
  subscriptionStartsAt: Date | null;
  expiresAt: Date | null;
}

export async function generateReceiptPDF(data: ReceiptData): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  
  // ลงทะเบียน fontkit สำหรับรองรับฟอนต์ภาษาไทยและภาษาอื่นๆ ที่ซับซ้อน
  pdfDoc.registerFontkit(fontkit);

  let regularFont;
  let boldFont;

  try {
    // 🌟 1. กำหนด Path ไปยังโฟลเดอร์ public/fonts ในโปรเจกต์ของคุณ
    // ให้แน่ใจว่าคุณเอาไฟล์ .ttf 2 ไฟล์นี้ไปวางไว้ในโฟลเดอร์ public/fonts/ แล้ว
    const regularFontPath = path.join(process.cwd(), 'public', 'fonts', 'NotoSansThai-Regular.ttf');
    const boldFontPath = path.join(process.cwd(), 'public', 'fonts', 'NotoSansThai-Bold.ttf');

    // 🌟 2. อ่านไฟล์ฟอนต์โดยตรง (เร็วและเสถียรกว่าการ fetch ผ่าน network)
    const regularFontBytes = fs.readFileSync(regularFontPath);
    const boldFontBytes = fs.readFileSync(boldFontPath);

    // 🌟 3. ฝังฟอนต์ลงในเอกสาร PDF
    regularFont = await pdfDoc.embedFont(regularFontBytes);
    boldFont = await pdfDoc.embedFont(boldFontBytes);
    
  } catch (error) {
    console.error("❌ ไม่สามารถโหลดไฟล์ฟอนต์ได้ ตรวจสอบว่ามีไฟล์ใน public/fonts/ หรือไม่", error);
    throw new Error("PDF Font Loading Failed");
  }

  const page = pdfDoc.addPage([595.28, 841.89]); // A4 Size (pts)
  const { width, height } = page.getSize();
  const margin = 50;

  // --- Title ---
  page.drawText('ใบเสร็จรับเงิน', {
    x: width / 2 - 60,
    y: height - margin - 30,
    size: 24,
    font: boldFont, // ใช้ตัวหนา
    color: rgb(0, 0, 0),
  });
  
  page.drawText('Receipt', {
    x: width / 2 - 30,
    y: height - margin - 50,
    size: 16,
    font: regularFont,
    color: rgb(0.3, 0.3, 0.3),
  });

  // --- Info ---
  let cursorY = height - margin - 100;
  const drawLine = (label: string, value: string) => {
    page.drawText(label, { x: margin, y: cursorY, size: 12, font: boldFont, color: rgb(0,0,0) });
    page.drawText(value, { x: margin + 100, y: cursorY, size: 12, font: regularFont, color: rgb(0,0,0) });
    cursorY -= 20;
  };

  const formatDate = (d: Date | null) => d ? new Date(d).toLocaleDateString("th-TH") : "-";

  drawLine("เลขที่ใบเสร็จ:", data.receiptNo);
  drawLine("วันที่:", formatDate(data.issuedAt));
  drawLine("ผู้รับเงิน:", "จตุรชัย รณเกียรติเมธา");
  drawLine("ผู้ชำระเงิน:", data.shopName);

  cursorY -= 20;

  // --- Details ---
  page.drawLine({ start: { x: margin, y: cursorY }, end: { x: width - margin, y: cursorY }, thickness: 1, color: rgb(0.8, 0.8, 0.8) });
  cursorY -= 25;
  
  drawLine("รายการ:", "ค่าบริการ ระบบคิวซ่อมมือถือ Getfixx");
  drawLine("แพ็กเกจ:", data.plan.replace('_', ' '));
  drawLine("วันที่เริ่มใช้งาน:", formatDate(data.subscriptionStartsAt));
  drawLine("วันหมดอายุ:", formatDate(data.expiresAt));
  
  cursorY -= 10;
  page.drawLine({ start: { x: margin, y: cursorY }, end: { x: width - margin, y: cursorY }, thickness: 1, color: rgb(0.8, 0.8, 0.8) });
  cursorY -= 25;

  // --- Summary ---
  page.drawText("ยอดชำระ:", { x: width - margin - 150, y: cursorY, size: 14, font: boldFont });
  page.drawText(`฿${data.amount.toLocaleString()}`, { x: width - margin - 60, y: cursorY, size: 14, font: boldFont });
  cursorY -= 25;
  
  page.drawText("สถานะ:", { x: width - margin - 150, y: cursorY, size: 12, font: boldFont });
  page.drawText("ชำระแล้ว", { x: width - margin - 60, y: cursorY, size: 12, font: regularFont, color: rgb(0.1, 0.6, 0.2) });

  // --- Footer ---
  const footerText = "เอกสารฉบับนี้จัดทำขึ้นโดยระบบอัตโนมัติ\nเพื่อเป็นหลักฐานการชำระค่าบริการ ไม่ใช่ใบกำกับภาษี";
  page.drawText(footerText, {
    x: width / 2 - 120,
    y: 80,
    size: 10,
    font: regularFont,
    color: rgb(0.4, 0.4, 0.4),
    lineHeight: 14,
  });

  return await pdfDoc.save();
}