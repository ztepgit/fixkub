"use server"

import { db } from "@/lib/prisma"
import { supabase } from "@/lib/supabase" 
import { revalidatePath } from "next/cache" // 🌟 1. Import revalidatePath เข้ามา

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
        return { success: false, error: "ไม่สามารถอัพโหลดโลโก้ได้" }
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
    
    // 🌟 2. สั่งล้าง Cache ของ Next.js เพื่อให้หน้าเว็บอัปเดตทันที
    revalidatePath(`/shop/${shopId}`)
    revalidatePath('/') // ล้าง cache หน้าหลักเผื่อไว้ด้วย
    
    return { success: true, data: updatedShop }
  } catch (error) {
    console.error("Error updating shop settings:", error)
    return { success: false, error: "ไม่สามารถบันทึกข้อมูลร้านค้าได้" }
  }
}