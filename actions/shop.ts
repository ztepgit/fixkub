"use server"

import { z } from "zod"
import { db } from "@/lib/prisma"
import { supabase } from "@/lib/supabase" 
import { revalidatePath } from "next/cache" 

// ==========================================
// 🌟 Schemas สำหรับ Validate และ Trim ข้อมูล
// ==========================================
const shopIdSchema = z.string().trim().min(1, "ไม่พบรหัสร้านค้า")
const shopNameSchema = z.string().trim().min(1, "กรุณากรอกชื่อร้านค้า")

// ==========================================
// 1. ดึงข้อมูลร้านค้าพื้นฐาน (สำหรับแสดงผลหน้า Checkout หรืออื่นๆ)
// ==========================================
export async function getShopById(shopId: string) {
  try {
    // 🌟 1. Validate และ Trim ค่า shopId
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
// 2. ดึงข้อมูลการตั้งค่าร้านค้า (มี Logo มาด้วย)
// ==========================================
export async function getShopSettings(shopId: string) {
  try {
    // 🌟 2. Validate ค่า shopId ด้วย Zod เช่นกัน
    const validatedId = shopIdSchema.parse(shopId)

    const shop = await db.shop.findUnique({
      where: { id: validatedId },
      // เพิ่ม slug: true ตรงนี้ครับ เพื่อให้ Store ดึงไปสร้างลิงก์ Subdomain ได้
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
// 3. อัปเดตข้อมูลร้านค้า
// ==========================================
export async function updateShopSettings(formData: FormData) {
  try {
    const rawShopId = formData.get("shopId") as string
    const rawName = formData.get("name") as string

    // 🌟 3. Validate และ Trim ค่าที่ได้จาก Form ก่อนนำไปใช้
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
    
    // เปลี่ยนมาสั่งล้าง Cache โดยใช้ slug (เพราะเราทำ URL Rewrite หลังบ้านเป็น /shop/[slug] แล้ว)
    if (updatedShop.slug) {
      revalidatePath(`/shop/${updatedShop.slug}`)
    }
    revalidatePath('/') // ล้าง cache หน้าหลักเผื่อไว้ด้วย
    
    return { success: true, data: updatedShop }
  } catch (error) {
    console.error("Error updating shop settings:", error)
    
    // ดักจับ Error จาก Zod
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message }
    }
    
    return { success: false, error: "ไม่สามารถบันทึกข้อมูลร้านค้าได้" }
  }
}