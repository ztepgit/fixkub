// lib/auth-guard.ts
import { db } from "@/lib/prisma"
import { createClient } from "@/lib/supabase/server" 

export async function verifyShopAccess(shopId: string) {
  // 🌟 แก้ไขตรงนี้: เติม await ด้านหน้า createClient()
  const supabase = await createClient()
  
  const { data: { session } } = await supabase.auth.getSession()

  // 1. เช็คว่าล็อกอินอยู่ไหม
  if (!session?.user?.email) {
    throw new Error("Unauthorized: กรุณาเข้าสู่ระบบ")
  }

  // 2. เช็คว่าอีเมลนี้ เป็นเจ้าของของ shopId นี้หรือไม่
  const access = await db.shopOwner.findFirst({
    where: {
      shopId: shopId,
      email: session.user.email
    }
  })

  // ถ้าไม่มีข้อมูลในตาราง ShopOwner แปลว่าคนนี้พยายามเจาะดูร้านคนอื่น
  if (!access) {
    throw new Error("Forbidden: ท่านไม่มีสิทธิ์เข้าถึงข้อมูลของร้านค้านี้")
  }

  // ถ้าผ่านหมด คืนค่าสิทธิ์กลับไป เผื่อเอาไปเช็ค Role (OWNER / STAFF) ต่อในอนาคต
  return access; 
}