// actions/carousel.ts
"use server"

import { db } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { createClient } from "@supabase/supabase-js"

// 🌟 สร้าง Supabase Client สำหรับฝั่ง Server
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
// หากมี Service Role Key ให้ใช้ (เพื่อ bypass RLS) ถ้าไม่มีใช้ Anon Key ได้
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

// 🚨 อย่าลืม! คุณต้องไปสร้าง Bucket ชื่อนี้ใน Supabase Storage และตั้งเป็น "Public"
const BUCKET_NAME = "assets" 

// ==========================================
// 1. ดึงข้อมูล Carousel (หน้า Landing Page ใช้ isActiveOnly = true)
// ==========================================
export async function getCarouselItems(isActiveOnly = false) {
  try {
    const items = await db.carouselItem.findMany({
      where: isActiveOnly ? { isActive: true } : undefined,
      orderBy: { order: 'asc' }
    })
    return { success: true, data: items }
  } catch (error: any) {
    console.error("Error fetching carousel:", error)
    return { success: false, error: "ไม่สามารถดึงข้อมูลแบนเนอร์ได้" }
  }
}

// ==========================================
// 2. อัปโหลดรูปภาพลง Supabase และบันทึกลง Database
// ==========================================
export async function createCarouselItem(formData: FormData) {
  try {
    const file = formData.get("image") as File
    if (!file) throw new Error("ไม่พบไฟล์รูปภาพ")

    // 1. หาจำนวนรูปที่มีอยู่ เพื่อรันลำดับ (Order) ไปไว้ท้ายสุด
    const currentCount = await db.carouselItem.count()
    const nextOrder = currentCount + 1

    // 2. เตรียมไฟล์สำหรับอัปโหลดขึ้น Supabase Storage
    const buffer = Buffer.from(await file.arrayBuffer())
    const fileExt = file.name.split('.').pop()
    const fileName = `carousel-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
    const filePath = `carousel/${fileName}` // เก็บในโฟลเดอร์ carousel

    // 3. สั่ง Upload
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: false
      })

    if (uploadError) throw new Error(`อัปโหลดรูปภาพล้มเหลว: ${uploadError.message}`)

    // 4. ดึง Public URL ของรูปที่เพิ่งอัปโหลด
    const { data: { publicUrl } } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(filePath)

    // 5. บันทึกข้อมูลลง Prisma Database
    const newItem = await db.carouselItem.create({
      data: {
        imageUrl: publicUrl,
        isActive: true, // ค่า Default เมื่ออัปโหลดเสร็จให้เปิดใช้งานเลย
        order: nextOrder
      }
    })

    // สั่งล้าง Cache เพื่อให้หน้าเว็บอัปเดตทันที
    revalidatePath("/")
    revalidatePath("/super-admin")

    return { success: true, data: newItem }
  } catch (error: any) {
    console.error("Error creating carousel item:", error)
    return { success: false, error: error.message || "เกิดข้อผิดพลาดในการสร้างแบนเนอร์" }
  }
}

// ==========================================
// 3. อัปเดตข้อมูล (สถานะเปิด/ปิด, ลิงก์, ชื่อ)
// ==========================================
export async function updateCarouselItem(id: string, data: { title?: string, link?: string, isActive?: boolean }) {
  try {
    const updated = await db.carouselItem.update({
      where: { id },
      data: {
        title: data.title,
        link: data.link,
        isActive: data.isActive
      }
    })

    revalidatePath("/")
    revalidatePath("/super-admin")
    return { success: true, data: updated }
  } catch (error: any) {
    return { success: false, error: "ไม่สามารถอัปเดตแบนเนอร์ได้" }
  }
}

// ==========================================
// 4. บันทึกลำดับใหม่ (เมื่อมีการ Drag & Drop)
// ==========================================
export async function reorderCarouselItems(items: { id: string, order: number }[]) {
  try {
    // วนลูปอัปเดตลำดับทีละรายการ (Transaction)
    await db.$transaction(
      items.map(item =>
        db.carouselItem.update({
          where: { id: item.id },
          data: { order: item.order }
        })
      )
    )

    revalidatePath("/")
    return { success: true }
  } catch (error: any) {
    return { success: false, error: "ไม่สามารถบันทึกลำดับได้" }
  }
}

// ==========================================
// 5. ลบรูปภาพ (ลบจาก Storage และ Database)
// ==========================================
export async function deleteCarouselItem(id: string, imageUrl: string) {
  try {
    // 1. แกะชื่อไฟล์ออกจาก Public URL เพื่อไปลบใน Storage
    // รูปแบบ URL: https://[projectId].supabase.co/storage/v1/object/public/assets/carousel/[filename]
    const urlParts = imageUrl.split('/')
    const fileName = urlParts[urlParts.length - 1]
    const filePath = `carousel/${fileName}`

    // 2. สั่งลบรูปใน Supabase (ไม่พังถ้าไม่เจอรูป)
    await supabase.storage.from(BUCKET_NAME).remove([filePath])

    // 3. ลบใน Database
    await db.carouselItem.delete({ where: { id } })

    revalidatePath("/")
    revalidatePath("/super-admin")
    return { success: true }
  } catch (error: any) {
    console.error("Error deleting carousel:", error)
    return { success: false, error: "ไม่สามารถลบแบนเนอร์ได้" }
  }
}