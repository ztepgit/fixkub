"use server"

import { z } from "zod"
import { db } from "@/lib/prisma"
import { supabase } from "@/lib/supabase" 
import { revalidatePath } from "next/cache" 
import { addDays } from "date-fns" // 🌟 เพิ่ม import สำหรับคำนวณเวลาทดลองใช้ฟรี

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

    const exists = await db.shop.findUnique({ where: { slug: data.slug } })
    if (exists) {
      return { success: false, message: "URL นี้มีผู้ใช้งานแล้ว กรุณาเปลี่ยนใหม่" }
    }

    const now = new Date()
    const trialEndsAt = addDays(now, 14) // 🌟 กำหนดวันหมดอายุทดลองใช้ (14 วัน)

    const newShop = await db.$transaction(async (tx) => {
      const shop = await tx.shop.create({
        data: {
          name: data.name,
          slug: data.slug,
          // --- ล็อคค่าสำหรับ Free Trial ---
          isActive: true,            // 🌟 เปิดให้ใช้งานทันที
          planType: "FREE_TRIAL",    
          trialEndsAt: trialEndsAt,  // 🌟 เริ่มนับถอยหลัง 14 วัน
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

    const shop = await db.shop.findUnique({
      where: { id: validatedId },
      select: { name: true, slug: true }
    })

    if (!shop) return { success: false, message: "ไม่พบข้อมูลร้านค้าในระบบ" }

    return { success: true, data: shop }
  } catch (error) {
    console.error("[GET_SHOP_BY_ID_ERROR]", error)
    if (error instanceof z.ZodError) {
      return { success: false, message: error.errors[0].message }
    }
    return { success: false, message: "เกิดข้อผิดพลาดในการดึงข้อมูลร้านค้า" }
  }
}

// ==========================================
// 4. ดึงข้อมูลการตั้งค่าร้านค้า (มี Logo มาด้วย)
// ==========================================
export async function getShopSettings(shopId: string) {
  try {
    const validatedId = shopIdSchema.parse(shopId)

    const shop = await db.shop.findUnique({
      where: { id: validatedId },
      select: { name: true, logoUrl: true, slug: true },
    })
    
    if (!shop) return { success: false, error: "ไม่พบข้อมูลร้านค้า" }
    
    return { success: true, data: shop }
  } catch (error) {
    console.error("Error fetching shop settings:", error)
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message }
    }
    return { success: false, error: "ไม่สามารถดึงข้อมูลร้านค้าได้" }
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
  } catch (error) {
    console.error("Error updating shop settings:", error)
    
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message }
    }
    
    return { success: false, error: "ไม่สามารถบันทึกข้อมูลร้านค้าได้" }
  }
}