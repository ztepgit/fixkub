import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { db } from "@/lib/prisma"

// Next.js 15 บังคับให้ searchParams เป็น Promise
export default async function PaymentProcessPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string }>
}) {
  const resolvedParams = await searchParams
  const plan = resolvedParams.plan

  // ถ้าไม่มีแพ็กเกจส่งมา (คนอาจจะเผลอพิมพ์ URL เข้ามาตรงๆ) ให้เตะกลับไปหน้า payment
  if (!plan) {
    redirect("/payment")
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || !user.email) {
    redirect(`/login?next=/payment/process?plan=${plan}`)
  }

  // 🌟 1. ค้นหาว่าอีเมลนี้ เป็นเจ้าของร้านค้ากี่ร้านในระบบ
  const ownedShops = await db.shopOwner.findMany({
    where: { 
      email: user.email,
      role: "OWNER" 
    },
    select: { shopId: true }
  })

  // 🌟 2. ลอจิกการแยกทางจราจร (Routing)
  if (ownedShops.length === 0) {
    // 🚦 กรณีไม่มีร้าน: พาไปหน้าสร้างร้าน พร้อมแนบแพ็กเกจไปด้วย
    redirect(`/onboarding?plan=${plan}`)
  } 
  
  else if (ownedShops.length === 1) {
    // 🚦 กรณีมี 1 ร้าน: พาไปหน้าจ่ายเงิน (Checkout) เลย
    redirect(`/checkout?shopId=${ownedShops[0].shopId}&plan=${plan}`)
  } 
  
  else {
    // 🚦 กรณีเซียน (มีมากกว่า 1 ร้าน): พาไปหน้าเลือกร้านค้าก่อนจ่ายเงิน
    redirect(`/payment/select-shop?plan=${plan}`)
  }

  // ใส่เผื่อไว้เฉยๆ ปกติโค้ดจะวิ่งไม่ถึงบรรทัดนี้ครับ
  return (
    <div className="flex items-center justify-center min-h-screen">
      <p>กำลังประมวลผลข้อมูล...</p>
    </div>
  )
}