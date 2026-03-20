import { db } from "@/lib/prisma"
import { CustomerBookingForm } from "@/components/customer-booking-form"
import { notFound } from "next/navigation"

export default async function CustomerPage({
  params,
}: {
  params: { shopSlug: string }
}) {
  try {
    // 🌟 ดึงข้อมูลเฉพาะที่จำเป็น (Select) ลดภาระ Database
    const shop = await db.shop.findUnique({
      // ⚠️ ถ้า DB มีฟิลด์ slug แล้ว ค่อยเปลี่ยนเป็น slug: params.shopSlug นะครับ
      // ⚠️ ถ้ามีระบบเปิด/ปิดร้าน ค่อยเพิ่ม isActive: true 
      where: { 
        id: params.shopSlug, 
      },
      select: {
        id: true,
        name: true,
        logoUrl: true,
      },
    })

    // ถ้าหาร้านไม่เจอ หรือ URL ผิด ให้แสดงหน้า 404
    if (!shop) {
      notFound()
    }

    return (
      <div className="min-h-screen bg-slate-50/50 py-10 px-4 flex flex-col items-center justify-center">
        <CustomerBookingForm
          shopId={shop.id}
          shopName={shop.name}
          shopLogoUrl={shop.logoUrl}
        />
      </div>
    )
  } catch (error) {
    // 🌟 ดัก Error กรณี Database ล่ม จะได้รู้สาเหตุและหน้าเว็บไม่ Crash รุนแรง
    console.error("❌ Failed to load shop:", error)
    throw new Error("ไม่สามารถโหลดข้อมูลร้านค้าได้ในขณะนี้")
  }
}