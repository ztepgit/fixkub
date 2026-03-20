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
        id: shopSlug, 
      },
      select: {
        id: true,
        name: true,
        logoUrl: true,
      },
    })
  } catch (error) {
    console.error("❌ Failed to load shop:", error)
    throw new Error("ไม่สามารถโหลดข้อมูลร้านค้าได้ในขณะนี้")
  }

  // 🌟 2. ย้าย notFound() ออกมานอก try...catch !!!
  // เพราะ notFound() จะ throw error ออกมาเพื่อพาไปหน้า 404 
  // ถ้าอยู่ใน try...catch มันจะถูกดักไว้แล้วหน้าเว็บจะพังครับ
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
}