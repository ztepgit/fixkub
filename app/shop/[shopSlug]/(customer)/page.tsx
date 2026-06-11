//app/shop/[shopSlug]/(customer)/page.tsx
import { db } from "@/lib/prisma"
import { CustomerBookingForm } from "@/components/customer-booking-form"
import { notFound } from "next/navigation"

export default async function CustomerPage({
  params,
}: {
  // Next.js 15 บังคับให้ params เป็น Promise
  params: Promise<{ shopSlug: string }> 
}) {
  // 🌟 1. Await params ก่อนใช้งาน (กฎใหม่ของ Next.js 15)
  const resolvedParams = await params;
  const shopSlug = resolvedParams.shopSlug;

  let shop;

  try {
    shop = await db.shop.findUnique({
      where: { 
        slug: shopSlug, // ✅ เปลี่ยนจาก id เป็น slug ครับ เพื่อให้หาข้อมูลร้านเจอ
      },
      select: {
        id: true,       // ✅ ดึง id ออกมาด้วย เพราะ CustomerBookingForm ยังต้องใช้
        name: true,
        logoUrl: true,
      },
    })
  } catch (error) {
    console.error("❌ Failed to load shop:", error)
    throw new Error("ไม่สามารถโหลดข้อมูลร้านค้าได้ในขณะนี้")
  }

  // 🌟 2. ย้าย notFound() ออกมานอก try...catch !!!
  if (!shop) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-slate-50/50 py-10 px-4 flex flex-col items-center justify-center">
      <CustomerBookingForm
        shopId={shop.id} // ✅ โยน ID จริงให้ฟอร์ม เพื่อเอาไปเซฟลง DB ได้ถูกต้อง
        shopName={shop.name}
        shopLogoUrl={shop.logoUrl}
      />
    </div>
  )
}