"use server"

import { db } from "@/lib/prisma"
import { z } from "zod" // 🌟 1. Import Zod

// ==========================================
// 🌟 2. สร้าง Zod Schema (The Gatekeeper)
// ==========================================
const paymentSettingsSchema = z.object({
  promptpayId: z.string()
    .trim()
    .min(1, "กรุณากรอก PromptPay ID")
    .transform((val) => val.replace(/[-\s]/g, "")) // 🪄 Normalize: ลบขีดและช่องว่างทิ้ง
    .pipe(z.string().min(10, "เลขพร้อมเพย์ต้องมีอย่างน้อย 10 หลัก").max(15, "เลขพร้อมเพย์ยาวเกินไป")),
    
  accountName: z.string()
    .trim()
    .min(1, "กรุณากรอกชื่อบัญชีรับเงิน")
    .max(100, "ชื่อบัญชียาวเกินไป")
})

export async function getSystemSettings() {
  try {
    const settings = await db.systemSetting.findUnique({
      where: { id: "global" }
    })
    return { success: true, data: settings }
  } catch (error) {
    console.error("Error fetching system settings:", error)
    return { success: false, error: "ไม่สามารถดึงการตั้งค่าได้" }
  }
}

export async function updatePaymentSettings(rawPromptpayId: string, rawAccountName: string) {
  try {
    // 🛡️ 3. ให้ Zod ทำหน้าที่ล้างข้อมูล (Trim & Normalize) และตรวจสอบความถูกต้อง
    const safeData = paymentSettingsSchema.parse({
      promptpayId: rawPromptpayId,
      accountName: rawAccountName
    })

    // 💾 4. บันทึกข้อมูลที่ "สะอาด" แล้วลง Database
    const settings = await db.systemSetting.upsert({
      where: { id: "global" },
      update: { 
        promptpayId: safeData.promptpayId, 
        accountName: safeData.accountName 
      },
      create: { 
        id: "global", 
        promptpayId: safeData.promptpayId, 
        accountName: safeData.accountName 
      }
    })
    
    return { success: true, data: settings }
    
  } catch (error: any) {
    console.error("Error updating payment settings:", error)
    
    // 🌟 5. ถ้าข้อมูลไม่ผ่านเกณฑ์ Zod ให้ส่งข้อความแจ้งเตือนกลับไปที่ UI
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message }
    }
    
    return { success: false, error: "ไม่สามารถบันทึกการตั้งค่าได้" }
  }
}