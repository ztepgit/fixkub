//app/checkout/success/page.tsx
"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { CheckCircle2, Loader2 } from "lucide-react"

export default function CheckoutSuccessPage() {
  const router = useRouter()

  useEffect(() => {
    // หน้านี้มีไว้แสดงผลชั่วคราวเท่านั้น
    // ระบบหลังบ้าน (Webhook) ของ Stripe กำลังทำงานเพื่ออัปเดตวันหมดอายุให้อยู่
    const timer = setTimeout(() => {
      router.push("/dashboard")
    }, 5000) // เด้งกลับหน้า Dashboard อัตโนมัติใน 5 วินาที

    return () => clearTimeout(timer)
  }, [router])

  return (
    <div className="min-h-screen bg-slate-50/50 flex flex-col items-center justify-center p-4">
      <div className="flex flex-col items-center justify-center py-16 text-center animate-in fade-in zoom-in duration-500 max-w-md w-full bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
        <div className="h-20 w-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-6 shadow-inner">
          <CheckCircle2 className="h-10 w-10" />
        </div>
        <h2 className="text-3xl font-bold text-slate-800 mb-4">ชำระเงินสำเร็จ!</h2>
        <p className="text-slate-600 mb-8 leading-relaxed">
          ระบบกำลังประมวลผลรายการของคุณ <br/>
          สิทธิ์การใช้งานจะถูกอัปเดตโดยอัตโนมัติภายในไม่กี่อึดใจ
        </p>
        
        <div className="flex items-center text-sm text-slate-500 mb-6">
          <Loader2 className="w-4 h-4 mr-2 animate-spin text-emerald-600" />
          กำลังพากลับไปหน้าแดชบอร์ด...
        </div>

        <Button
          onClick={() => router.push("/dashboard")}
          className="bg-emerald-600 hover:bg-emerald-700 w-full h-12 text-base shadow-md transition-all"
        >
          กลับสู่หน้าแดชบอร์ดทันที
        </Button>
      </div>
    </div>
  )
}