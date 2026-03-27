import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import OnboardingForm from "./onboarding-form"

export default async function OnboardingPage({
  searchParams,
}: {
  // Next.js 15 บังคับให้ searchParams เป็น Promise
  searchParams: Promise<{ plan?: string }>
}) {
  const resolvedParams = await searchParams
  const plan = resolvedParams.plan || "yearly"

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // ป้องกันคนแอบพิมพ์ URL เข้ามาตรงๆ โดยไม่ Login
  if (!user || !user.email) {
    redirect(`/login?next=/onboarding?plan=${plan}`)
  }

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 flex items-center justify-center">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-800">สร้างร้านค้าของคุณ</h1>
          <p className="text-slate-500 mt-2">ตั้งชื่อร้านค้าและ URL เพื่อให้ลูกค้าของคุณจดจำได้ง่าย</p>
        </div>
        
        {/* โยนอีเมลและแพ็กเกจไปให้ฟอร์มจัดการต่อ */}
        <OnboardingForm email={user.email} plan={plan} />
      </div>
    </div>
  )
}