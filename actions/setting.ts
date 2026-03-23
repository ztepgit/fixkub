"use server"

import { db } from "@/lib/prisma"

export async function getSystemSettings() {
  try {
    const settings = await db.systemSetting.findUnique({
      where: { id: "global" }
    })
    return { success: true, data: settings }
  } catch (error) {
    return { success: false, error: "ไม่สามารถดึงการตั้งค่าได้" }
  }
}

export async function updatePaymentSettings(promptpayId: string, accountName: string) {
  try {
    const settings = await db.systemSetting.upsert({
      where: { id: "global" },
      update: { promptpayId, accountName },
      create: { id: "global", promptpayId, accountName }
    })
    return { success: true, data: settings }
  } catch (error) {
    return { success: false, error: "ไม่สามารถบันทึกการตั้งค่าได้" }
  }
}