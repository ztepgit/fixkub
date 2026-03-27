"use server"

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod' // 🌟 1. Import Zod

// ==========================================
// 🌟 2. สร้าง Schema สำหรับ Validate
// ==========================================
const loginSchema = z.object({
  email: z.string()
    .min(1, "กรุณากรอกอีเมล")
    .trim() // ลบช่องว่างหัวท้าย
    .toLowerCase() // บังคับเป็นตัวพิมพ์เล็กเสมอ
    .email("รูปแบบอีเมลไม่ถูกต้อง"),
  password: z.string()
    .min(1, "กรุณากรอกรหัสผ่าน")
    // ⚠️ ห้ามใส่ .trim() ที่ password เด็ดขาด ป้องกันกรณีผู้ใช้ตั้งรหัสผ่านมีช่องว่าง
})

// 🌟 ฟังก์ชันล็อกอิน
export async function loginAction(formData: FormData) {
  // 🛡️ 1. ดึงข้อมูลจาก FormData
  const rawEmail = formData.get('email')
  const rawPassword = formData.get('password')

  // 🛡️ 2. ตรวจสอบและล้างข้อมูลด้วย Zod (The Gatekeeper)
  const validatedFields = loginSchema.safeParse({
    email: rawEmail,
    password: rawPassword,
  })

  // ถ้าข้อมูลดิบไม่ผ่านเกณฑ์ ให้ตีกลับทันที ไม่ต้องคุยกับ Supabase
  if (!validatedFields.success) {
    return { 
      success: false, 
      error: validatedFields.error.errors[0].message 
    }
  }

  // แตกตัวแปรที่ "สะอาดและปลอดภัย" แล้วออกมาใช้งาน
  const { email, password } = validatedFields.data

  const supabase = await createClient()

  // 💾 3. ยิงคำสั่งเข้า Supabase
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    // หลักความปลอดภัย: ไม่ควรบอกเจาะจงว่า "อีเมลไม่มีในระบบ" หรือ "รหัสผิด" ให้บอกคลุมๆ ไว้ครับ
    return { success: false, error: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" }
  }

  // 🚀 4. ล้างแคชและเตะเข้า Dashboard
  revalidatePath('/dashboard')
  redirect('/dashboard')
}

// 🌟 ฟังก์ชันออกจากระบบ
export async function logoutAction() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  
  redirect('/login')
}