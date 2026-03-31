"use server"

import { db } from "@/lib/prisma"
import { addHours, subHours, subDays } from "date-fns"
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { headers, cookies } from "next/headers"

// 🌟 1. สร้าง Supabase Admin Client
const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function createDemoShopAction() {
  let authUserId: string | null = null;

  try {
    // ==========================================
    // 🛡️ ด่านป้องกันที่ 1: Check Cookie (Soft Block) อนุญาต 3 ครั้ง
    // ==========================================
    const cookieStore = await cookies()
    const demoCookie = cookieStore.get("esyq_demo_created")

    let cookieCount = 0
    if (demoCookie) {
      // รองรับทั้งคุกกี้แบบเก่า (ที่เก็บเป็นคำว่า "true") และแบบใหม่ (ที่เก็บตัวเลข)
      cookieCount = demoCookie.value === "true" ? 1 : parseInt(demoCookie.value, 10)
      if (isNaN(cookieCount)) cookieCount = 0

      if (cookieCount >= 3) {
        return { success: false, error: "ท่านสร้างร้านตัวอย่างครบ 3 ครั้งแล้ว กรุณาลองใหม่ในวันพรุ่งนี้" }
      }
    }

    // ==========================================
    // 🛡️ ด่านป้องกันที่ 2: Check IP (Hard Block)
    // ==========================================
    const headersList = await headers()
    const forwardedFor = headersList.get("x-forwarded-for")
    const realIp = headersList.get("x-real-ip")

    const ip = forwardedFor ? forwardedFor.split(",")[0].trim() : realIp?.trim() || "unknown_ip"

    if (ip !== "unknown_ip") {
      const demoCountToday = await db.shop.count({
        where: {
          isDemo: true,
          creatorIp: ip,
          createdAt: { gte: subHours(new Date(), 24) }
        }
      })

      if (demoCountToday >= 3) {
        return { success: false, error: "IP ของท่านเกินขีดจำกัดการสร้างร้านตัวอย่าง (จำกัด 3 ครั้ง/วัน)" }
      }
    }

    // --- สร้างบัญชีผี ---
    const demoId = crypto.randomUUID().split('-')[0];
    const dummyEmail = `demo_${demoId}@esyq.net`;
    const dummyPassword = crypto.randomUUID();

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: dummyEmail,
      password: dummyPassword,
      email_confirm: true,
      user_metadata: { isDemo: true }
    })

    if (authError || !authData.user) {
      throw new Error(authError?.message || "สร้าง Demo User ใน Auth ไม่สำเร็จ")
    }

    authUserId = authData.user.id;

    // --- สร้างข้อมูลร้าน ---
    const demoSlug = `demo-${demoId}`
    const expiresAt = addHours(new Date(), 24)

    const shop = await db.shop.create({
      data: {
        name: "สมหมาย โมบาย (ร้านตัวอย่าง)",
        slug: demoSlug,
        planType: "PRO_YEARLY",
        planStatus: "ACTIVE",
        isDemo: true,
        creatorIp: ip,
        expiresAt: expiresAt,
        owners: {
          create: {
            userId: authUserId,
            email: dummyEmail,
            role: "OWNER"
          }
        },
        queues: {
          create: [
            {
              jobRef: "REP-001",
              customerName: "คุณสมชาย",
              phoneNumber: "0812345678",
              deviceModel: "iPhone 13 Pro",
              issue: "จอเขียว รอตีราคา",
              serviceName: "เปลี่ยนจอ",
              status: "PENDING"
            },
            {
              jobRef: "REP-002",
              customerName: "คุณสมหญิง",
              deviceModel: "Samsung S23 Ultra",
              issue: "แบตบวม ประเมินแล้วรอซ่อม",
              serviceName: "เปลี่ยนแบตเตอรี่",
              estimatedPrice: 1500,
              status: "WAITING"
            },
            {
              jobRef: "REP-003",
              customerName: "คุณมานพ",
              deviceModel: "iPad Air 5",
              issue: "ชาร์จไม่เข้า กำลังแกะเครื่อง",
              serviceName: "ซ่อมบอร์ด/ตูดชาร์จ",
              estimatedPrice: 2500,
              status: "PROCESSING",
              startedAt: subHours(new Date(), 2)
            },
            {
              jobRef: "REP-004",
              customerName: "คุณวิภา",
              deviceModel: "iPhone 11",
              issue: "เปลี่ยนฟิล์ม+จอ เสร็จแล้ว",
              serviceName: "เปลี่ยนจอ",
              estimatedPrice: 2500,
              repairCost: 2500,
              status: "REPAIRED",
              startedAt: subDays(new Date(), 1),
              repairedAt: subHours(new Date(), 1)
            }
          ]
        }
      }
    })

    // 🌟 แปะ Cookie เพื่อนับจำนวนครั้ง (บวก 1 จากของเดิม)
    cookieStore.set("esyq_demo_created", (cookieCount + 1).toString(), {
      maxAge: 60 * 60 * 24,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production"
    })

    // 🌟 แปลง Date object เป็น JSON string เพื่อกัน Hydration Error
    const plainShop = JSON.parse(JSON.stringify(shop))

    // 🌟 สำคัญ: ส่ง credentials กลับไปให้ฝั่ง Client จัดการ Login เอง
    return {
      success: true,
      credentials: { email: dummyEmail, password: dummyPassword },
      shop: { ...plainShop, role: "OWNER" }
    }

  } catch (error: any) {
    console.error("Create Demo Error FULL:", error) // ดู Error แบบเต็มๆ

    if (authUserId) {
      await supabaseAdmin.auth.admin.deleteUser(authUserId).catch(console.error);
    }

    return { success: false, error: error?.message || "สร้างร้านตัวอย่างไม่สำเร็จ" }
  }
}