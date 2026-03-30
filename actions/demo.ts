"use server"

import { db } from "@/lib/prisma"
import { addHours, subHours, subDays } from "date-fns"
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createClient } from "@/lib/supabase/server" // 🌟 Import Supabase SSR สำหรับ Set Cookie Login

// 🌟 1. สร้าง Supabase Admin Client (ใช้ SERVICE_ROLE_KEY)
const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // ⚠️ Key นี้ห้ามไปโผล่ฝั่ง Client เด็ดขาด
)

export async function createDemoShopAction() {
  let authUserId: string | null = null;

  try {
    // 🌟 ใช้ randomUUID แทน Math.random ตาม Best Practice
    const demoId = crypto.randomUUID().split('-')[0];
    const dummyEmail = `demo_${demoId}@esyq.net`;
    const dummyPassword = crypto.randomUUID(); // ใช้ UUID สุ่มเป็น Password ไปเลย ปลอดภัยสุดๆ

    // 🌟 2. ใช้ Admin API สร้าง User พร้อมใส่ user_metadata และสั่ง Auto-Confirm
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: dummyEmail,
      password: dummyPassword,
      email_confirm: true,
      user_metadata: { isDemo: true } // แยก user demo ออกจาก user จริงให้ชัดเจน
    })

    if (authError || !authData.user) {
      throw new Error(authError?.message || "สร้าง Demo User ใน Auth ไม่สำเร็จ")
    }

    authUserId = authData.user.id;

    // 3. หลังจากได้ Auth User แล้ว ไปสร้างข้อมูลร้านใน Prisma ต่อ
    const demoSlug = `demo-${demoId}`
    const expiresAt = addHours(new Date(), 24) // 🌟 TTL 24 ชั่วโมง

    const shop = await db.shop.create({
      data: {
        name: "สมหมาย โมบาย (ร้านตัวอย่าง)",
        slug: demoSlug,
        planType: "PRO_YEARLY", 
        planStatus: "ACTIVE",
        isDemo: true, 
        expiresAt: expiresAt,
        owners: {
          create: {
            userId: authUserId,
            email: dummyEmail,
            role: "OWNER"
          }
        },
        // เสกคิวจำลองให้ดูสมจริง
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

    // 🌟 4. Login ให้ User อัตโนมัติฝั่ง Server (Set Session / Cookie ให้เรียบร้อย)
    const supabase = await createClient(); // เรียกใช้ Supabase Client ของฝั่ง SSR
    const { error: loginError } = await supabase.auth.signInWithPassword({
      email: dummyEmail,
      password: dummyPassword,
    });

    if (loginError) {
      throw new Error("ระบบไม่สามารถ Auto-login ให้ได้");
    }

    // 🌟 5. คืนค่าแค่ Shop กลับไป (ไม่ส่ง Password กลับไปฝั่ง Client เด็ดขาด)
    return { 
      success: true, 
      shop: { ...shop, role: "OWNER" } 
    }

  } catch (error) {
    console.error("Create Demo Error:", error)

    // 🌟 6. Rollback: ถ้า Error กลางทาง และมีการสร้าง User Auth ไปแล้ว ให้ลบทิ้งทันที ข้อมูลจะได้ไม่ตกค้าง
    if (authUserId) {
      await supabaseAdmin.auth.admin.deleteUser(authUserId).catch(console.error);
    }

    return { success: false, error: "สร้างร้านตัวอย่างไม่สำเร็จ" }
  }
}