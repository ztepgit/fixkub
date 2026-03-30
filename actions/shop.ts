"use server"

import { z } from "zod"
import { db } from "@/lib/prisma"
import { supabase } from "@/lib/supabase"
import { revalidatePath } from "next/cache"
import { addDays } from "date-fns"
import { verifyShopAccess } from "@/lib/auth-guard" // 🌟 1. เพิ่ม import ด่านตรวจ

// ==========================================
// 🌟 Schemas สำหรับ Validate และ Trim ข้อมูล
// ==========================================
const shopIdSchema = z.string().trim().min(1, "ไม่พบรหัสร้านค้า")
const shopNameSchema = z.string().trim().min(1, "กรุณากรอกชื่อร้านค้า")

const publicRegisterSchema = z.object({
  name: z.string().trim().min(1, "กรุณากรอกชื่อร้าน"),
  slug: z.string().trim().min(3, "URL ต้องมีอย่างน้อย 3 ตัวอักษร"),
  ownerEmail: z.string().trim().email("อีเมลไม่ถูกต้อง"),
})

// ==========================================
// 🌟 ฟังก์ชันใหม่: เช็คว่าผู้ใช้นี้เคยเปิดร้านหรือยัง (ให้หน้า Landing Page เรียกใช้)
// ==========================================
export async function checkUserHasShop(email: string) {
  try {
    const owner = await db.shopOwner.findFirst({
      where: { email: email }
    })
    return { hasShop: !!owner }
  } catch (error) {
    console.error("Check User Shop Error:", error)
    return { hasShop: false }
  }
}

// ==========================================
// 1. ลูกค้าสมัครเปิดร้านเองหน้าเว็บ (Flow 1: ล็อคค่าตายตัว รอจ่ายเงิน)
// ==========================================
export async function registerPublicShop(formData: FormData) {
  try {
    const data = publicRegisterSchema.parse({
      name: formData.get("name"),
      slug: formData.get("slug"),
      ownerEmail: formData.get("email"),
    })

    const exists = await db.shop.findUnique({ where: { slug: data.slug } })
    if (exists) {
      return { success: false, message: "URL นี้มีผู้ใช้งานแล้ว กรุณาเปลี่ยนใหม่" }
    }

    const newShop = await db.$transaction(async (tx) => {
      const shop = await tx.shop.create({
        data: {
          name: data.name,
          slug: data.slug,
          // --- ล็อคค่าสำหรับคนรอจ่ายเงิน ---
          isActive: false,
          planType: "FREE_TRIAL",
          trialEndsAt: null,
          expiresAt: null,
          subscriptionStartsAt: null,
        }
      })

      await tx.shopOwner.create({
        data: {
          email: data.ownerEmail,
          shopId: shop.id,
          role: "OWNER"
        }
      })

      return shop
    })

    return { success: true, shopId: newShop.id }

  } catch (error) {
    console.error("Public Register Error:", error)
    if (error instanceof z.ZodError) {
      return { success: false, message: error.errors[0].message }
    }
    return { success: false, message: "เกิดข้อผิดพลาดในการสร้างร้านค้า" }
  }
}

// ==========================================
// 2. ลูกค้าสมัครเปิดร้านแบบ "ทดลองใช้งานฟรี 14 วัน" (Flow 2: เปิดร้านทันที)
// ==========================================
export async function registerFreeTrialShop(formData: FormData) {
  try {
    const data = publicRegisterSchema.parse({
      name: formData.get("name"),
      slug: formData.get("slug"),
      ownerEmail: formData.get("email"),
    })

    // ด่านหลังบ้าน: เช็คว่าอีเมลนี้เคยสร้างร้านไปแล้วหรือยัง ป้องกันคนแอบยิง API ตรงๆ
    const existingOwner = await db.shopOwner.findFirst({
      where: { email: data.ownerEmail }
    })

    if (existingOwner) {
      return { success: false, message: "ขออภัย การทดลองใช้งานสำหรับผู้ใช้ครั้งแรกเท่านั้น" }
    }

    const exists = await db.shop.findUnique({ where: { slug: data.slug } })
    if (exists) {
      return { success: false, message: "URL นี้มีผู้ใช้งานแล้ว กรุณาเปลี่ยนใหม่" }
    }

    const now = new Date()
    const trialEndsAt = addDays(now, 14) // กำหนดวันหมดอายุทดลองใช้ (14 วัน)

    const newShop = await db.$transaction(async (tx) => {
      const shop = await tx.shop.create({
        data: {
          name: data.name,
          slug: data.slug,
          // --- ล็อคค่าสำหรับ Free Trial ---
          isActive: true,            // เปิดให้ใช้งานทันที
          planType: "FREE_TRIAL",
          trialEndsAt: trialEndsAt,  // เริ่มนับถอยหลัง 14 วัน
          expiresAt: null,
          subscriptionStartsAt: null,
        }
      })

      await tx.shopOwner.create({
        data: {
          email: data.ownerEmail,
          shopId: shop.id,
          role: "OWNER"
        }
      })

      // สร้างประวัติว่าเริ่มทดลองใช้
      await tx.subscriptionHistory.create({
        data: {
          shopId: shop.id,
          planType: "FREE_TRIAL",
          amountPaid: 0,
          newExpiresAt: trialEndsAt,
          status: "COMPLETED"
        }
      })

      return shop
    })

    return { success: true, shopId: newShop.id, trialEndsAt }

  } catch (error) {
    console.error("Free Trial Register Error:", error)
    if (error instanceof z.ZodError) {
      return { success: false, message: error.errors[0].message }
    }
    return { success: false, message: "เกิดข้อผิดพลาดในการสร้างร้านค้า" }
  }
}

// ==========================================
// 3. ดึงข้อมูลร้านค้าพื้นฐาน (สำหรับแสดงผลหน้า Checkout หรืออื่นๆ)
// ==========================================
export async function getShopById(shopId: string) {
  try {
    const validatedId = shopIdSchema.parse(shopId)

    // 🌟 ด่านตรวจ: ตรวจสอบสิทธิ์การเข้าถึงข้อมูลร้านค้านี้
    await verifyShopAccess(validatedId)

    const shop = await db.shop.findUnique({
      where: { id: validatedId },
      select: { name: true, slug: true }
    })

    if (!shop) return { success: false, message: "ไม่พบข้อมูลร้านค้าในระบบ" }

    return { success: true, data: shop }
  } catch (error: any) {
    console.error("[GET_SHOP_BY_ID_ERROR]", error)
    if (error instanceof z.ZodError) {
      return { success: false, message: error.errors[0].message }
    }
    return { success: false, message: error.message || "เกิดข้อผิดพลาดในการดึงข้อมูลร้านค้า" }
  }
}

// ==========================================
// 4. ดึงข้อมูลการตั้งค่าร้านค้า (มี Logo มาด้วย)
// ==========================================
export async function getShopSettings(shopId: string) {
  try {
    const validatedId = shopIdSchema.parse(shopId)

    // 🌟 ด่านตรวจ: ป้องกันการดึงข้อมูลการตั้งค่าของร้านอื่น
    await verifyShopAccess(validatedId)

    const shop = await db.shop.findUnique({
      where: { id: validatedId },
      select: { name: true, logoUrl: true, slug: true },
    })

    if (!shop) return { success: false, error: "ไม่พบข้อมูลร้านค้า" }

    return { success: true, data: shop }
  } catch (error: any) {
    console.error("Error fetching shop settings:", error)
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message }
    }
    return { success: false, error: error.message || "ไม่สามารถดึงข้อมูลร้านค้าได้" }
  }
}

// ==========================================
// 5. อัปเดตข้อมูลร้านค้า
// ==========================================
export async function updateShopSettings(formData: FormData) {
  try {
    const rawShopId = formData.get("shopId") as string
    const rawName = formData.get("name") as string

    const shopId = shopIdSchema.parse(rawShopId)
    const name = shopNameSchema.parse(rawName)

    // 🌟 ด่านตรวจ: ป้องกันการแอบแก้ไขข้อมูลร้านค้าอื่น (สำคัญมาก)
    await verifyShopAccess(shopId)

    const logoFile = formData.get("logo") as File | null
    let logoUrl = formData.get("existingLogoUrl") as string | null

    if (logoFile && logoFile.size > 0) {
      const fileExt = 'webp'
      const fileName = `logo-${shopId}-${Date.now()}.${fileExt}`

      const arrayBuffer = await logoFile.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('shop-logos')
        .upload(fileName, buffer, {
          contentType: 'image/webp',
          upsert: true,
        })

      if (uploadError) {
        console.error("Supabase Upload Error Details:", uploadError)
        return { success: false, error: "ไม่สามารถอัปโหลดโลโก้ได้" }
      }

      const { data: publicUrlData } = supabase.storage
        .from('shop-logos')
        .getPublicUrl(fileName)

      logoUrl = publicUrlData.publicUrl
    }

    const updatedShop = await db.shop.update({
      where: { id: shopId },
      data: {
        name: name,
        logoUrl: logoUrl,
      },
    })

    if (updatedShop.slug) {
      revalidatePath(`/shop/${updatedShop.slug}`)
    }
    revalidatePath('/')

    return { success: true, data: updatedShop }
  } catch (error: any) {
    console.error("Error updating shop settings:", error)

    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message }
    }

    return { success: false, error: error.message || "ไม่สามารถบันทึกข้อมูลร้านค้าได้" }
  }
}

// ==========================================
// 6. ดึงรายชื่อร้านค้าทั้งหมดของ User (สำหรับให้เลือกตอนเติมเงิน)
// ==========================================
export async function getUserShops(email: string) {
  try {
    const owners = await db.shopOwner.findMany({
      where: { email: email },
      include: {
        shop: {
          select: {
            id: true,
            name: true,
            slug: true,
            planType: true,
            expiresAt: true,
            isDemo: true,
            logoUrl: true,
          }
        }
      }
    })

    // 🌟 อัปเดต: แนบ role (OWNER / STAFF) ของ User ในร้านนั้นๆ กลับไปให้ Frontend ด้วย
    const shops = owners.map(owner => ({
      ...owner.shop,
      role: owner.role
    }))

    return { success: true, shops }
  } catch (error) {
    console.error("Get User Shops Error:", error)
    return { success: false, shops: [] }
  }
}

// ==========================================
// 🌟 7. ระบบจัดการพนักงาน (Staff Management)
// ==========================================
export async function getShopStaff(shopId: string) {
  try {
    await verifyShopAccess(shopId);
    // ดึงเฉพาะคนที่มี Role เป็น STAFF ของร้านนี้
    const staff = await db.shopOwner.findMany({
      where: { shopId, role: "STAFF" },
      select: { id: true, email: true }
    });
    return { success: true, data: staff };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function addShopStaff(shopId: string, staffEmail: string) {
  try {
    const access = await verifyShopAccess(shopId);

    // ป้องกันไม่ให้ Staff มาเชิญ Staff เอง (ต้องเป็น OWNER เท่านั้น)
    if (access.role !== "OWNER") {
      throw new Error("เฉพาะเจ้าของร้านเท่านั้นที่สามารถเพิ่มพนักงานได้");
    }

    // เช็คจำนวน Staff ว่าเกินโควต้า 2 คนสำหรับแพ็กเกจปัจจุบันหรือไม่
    const currentStaffCount = await db.shopOwner.count({
      where: { shopId, role: "STAFF" }
    });

    if (currentStaffCount >= 2) {
      throw new Error("แพ็กเกจปัจจุบันจำกัดพนักงาน 2 คน (รออัปเกรด PRO ใน Phase 2)");
    }

    // เช็คว่าอีเมลนี้ถูกเชิญมาในร้านนี้แล้วหรือยัง
    const existing = await db.shopOwner.findFirst({
      where: { shopId, email: staffEmail }
    });

    if (existing) {
      throw new Error("อีเมลนี้อยู่ในร้านค้านี้แล้ว");
    }

    // เพิ่มพนักงาน
    await db.shopOwner.create({
      data: { shopId, email: staffEmail, role: "STAFF" }
    });

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function removeShopStaff(shopId: string, staffEmail: string) {
  try {
    const access = await verifyShopAccess(shopId);
    if (access.role !== "OWNER") throw new Error("ไม่มีสิทธิ์ลบพนักงาน");

    await db.shopOwner.deleteMany({
      where: { shopId, email: staffEmail, role: "STAFF" }
    });

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}