"use server"

import { db } from "@/lib/prisma"
import { supabase } from "@/lib/supabase" 

export async function getShopSettings(shopId: string) {
  try {
    const shop = await db.shop.findUnique({
      where: { id: shopId },
      select: { name: true, logoUrl: true },
    })
    
    if (!shop) return { success: false, error: "ไม่พบข้อมูลร้านค้า" }
    
    return { success: true, data: shop }
  } catch (error) {
    console.error("Error fetching shop settings:", error)
    return { success: false, error: "ไม่สามารถดึงข้อมูลร้านค้าได้" }
  }
}

export async function updateShopSettings(formData: FormData) {
  try {
    const shopId = formData.get("shopId") as string
    const name = formData.get("name") as string
    const logoFile = formData.get("logo") as File | null
    let logoUrl = formData.get("existingLogoUrl") as string | null

    if (!shopId || !name) {
      return { success: false, error: "ข้อมูลไม่ครบถ้วน" }
    }

    // 🌟 ถ้ามีการอัปโหลดไฟล์โลโก้ใหม่
    if (logoFile && logoFile.size > 0) {
      const fileExt = 'webp'
      const fileName = `logo-${shopId}-${Date.now()}.${fileExt}`

      // 🌟 แปลง File ให้เป็น Buffer เพื่อแก้บัคการอัปโหลดผ่าน Server Action ของ Next.js
      const arrayBuffer = await logoFile.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)

      // อัปโหลดขึ้น Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('shop-logos')
        .upload(fileName, buffer, {
          contentType: 'image/webp',
          upsert: true, // อนุญาตให้อัปเดตทับได้
        })

      if (uploadError) {
        console.error("Supabase Upload Error Details:", uploadError)
        return { success: false, error: "ไม่สามารถอัพโหลดโลโก้ได้ (ติด Permission หรือไม่มี Bucket)" }
      }

      // ดึง Public URL ของรูปภาพกลับมา
      const { data: publicUrlData } = supabase.storage
        .from('shop-logos')
        .getPublicUrl(fileName)

      logoUrl = publicUrlData.publicUrl
    }

    // 🌟 บันทึก URL และชื่อร้านลง Database
    const updatedShop = await db.shop.update({
      where: { id: shopId },
      data: {
        name: name,
        logoUrl: logoUrl, 
      },
    })
    
    return { success: true, data: updatedShop }
  } catch (error) {
    console.error("Error updating shop settings:", error)
    return { success: false, error: "ไม่สามารถบันทึกข้อมูลร้านค้าได้" }
  }
}