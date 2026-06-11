// app/auth/callback/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server' // ตัวจัดการ Cookie ที่เราสร้างไว้ก่อนหน้านี้

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  
  // ในไฟล์ app/auth/callback/route.ts (ประมาณบรรทัดที่ 9)
  // 🌟 แก้ไข: ถ้าพารามิเตอร์ next ไม่มี ให้ตั้งค่าเริ่มต้นเด้งไปหน้า Landing Page (/) แทน
  const next = requestUrl.searchParams.get('next') || '/'

  if (code) {
    const supabase = await createClient()
    
    // 🌟 นำ Code ที่ได้มาแลกเปลี่ยนเป็น Session (Cookie)
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      // แลกสำเร็จ! พาผู้ใช้เข้าสู่ระบบ (Redirect ไปยังหน้า Dashboard)
      return NextResponse.redirect(new URL(next, requestUrl.origin))
    }
  }

  // ถ้าแลกโค้ดไม่สำเร็จ หรือลิงก์หมดอายุ ให้เด้งกลับไปหน้า Login พร้อมแจ้งเตือน
  return NextResponse.redirect(new URL('/login?error=Could-not-authenticate', requestUrl.origin))
}