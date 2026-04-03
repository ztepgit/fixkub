"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { AlertTriangle, Clock, AlertCircle, X, Sparkles, Loader2 } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"

// 🌟 Import supabase สำหรับให้ปุ่มเปิดร้านจริงทำการ Logout
import { supabase } from "@/lib/supabase"

export function SubscriptionBanner({
  trialEndsAt,
  isDemo = false
}: {
  trialEndsAt: Date | string,
  isDemo?: boolean
}) {

  const router = useRouter()
  const [isVisible, setIsVisible] = useState(true)
  const [isMounted, setIsMounted] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  // ✅ FIX: ประกาศ storageKey ที่ TOP LEVEL ใช้ได้ทั้งไฟล์
  const storageKey = `esyq_dismissed_threshold_${isDemo ? "demo" : "real"}`

  useEffect(() => {
    setIsMounted(true)
  }, [])

  // 🌟 ฟังก์ชันจัดการการกดปุ่ม "เปิดร้านจริง" สำหรับบัญชี Demo
  const handleOpenRealShop = async () => {
    setIsLoggingOut(true)
    try {
      // 1. ล็อกเอาท์ออกจากบัญชี Demo ปลอมทิ้งซะ
      await supabase.auth.signOut()
      
      // 2. ล้างค่า Auto-Route ที่เราเพิ่งทำไว้ เพื่อให้หน้า Landing ทำงานได้ปกติ
      sessionStorage.removeItem("hasAutoRouted")
      
      // 3. เตะไปหน้า Landing Page ตรงส่วนราคา เพื่อให้เขาเริ่ม Flow การสมัครด้วยอีเมลจริง
      router.push('/#pricing')
    } catch (error) {
      console.error("Error signing out from demo:", error)
      // เผื่อพัง ก็เตะไปหน้าแรกดื้อๆ เลย
      window.location.href = '/#pricing'
    } finally {
      setIsLoggingOut(false)
    }
  }

  // ✅ กัน hydration bug
  if (!isMounted) return null

  // ✅ DEMO MODE: ไม่โชว์เตือนหมดอายุ แต่จะโชว์ปุ่มเปิดร้านจริง
  if (isDemo) {
    return (
      <Alert className="mb-6 border-emerald-200 bg-emerald-50 text-emerald-800">
        <Sparkles className="h-5 w-5 text-emerald-600" />
        <AlertTitle className="font-bold text-emerald-900">
          🚀 คุณกำลังทดลองใช้งานระบบจริง
        </AlertTitle>
        <AlertDescription className="mt-1">
          <p>ทดลองได้เต็มระบบ 24 ชั่วโมง</p>

          <Button 
            size="sm" 
            onClick={handleOpenRealShop}
            disabled={isLoggingOut}
            className="mt-3 bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {isLoggingOut ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            เปิดร้านจริง
          </Button>
        </AlertDescription>
      </Alert>
    )
  }

  // ================= NORMAL MODE =================

  const today = new Date()
  const endDate = new Date(trialEndsAt)
  const diffTime = endDate.getTime() - today.getTime()
  const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  let currentThreshold = 0
  if (daysRemaining === 1) {
    currentThreshold = 1
  } else if (daysRemaining <= 3 && daysRemaining > 1) {
    currentThreshold = 3
  } else if (daysRemaining <= 7 && daysRemaining > 3) {
    currentThreshold = 7
  }

  const handleDismiss = () => {
    setIsVisible(false)
    localStorage.setItem(storageKey, currentThreshold.toString())
  }

  // ✅ FIX: ใช้ storageKey ที่ถูกต้อง
  const savedThreshold =
    typeof window !== "undefined"
      ? localStorage.getItem(storageKey)
      : null

  const isHiddenByThreshold =
    savedThreshold && parseInt(savedThreshold) === currentThreshold

  if (daysRemaining > 7 || !isVisible || isHiddenByThreshold) return null

  const PricingBlock = () => (
    <div className="flex flex-col space-y-1 my-3 bg-white/60 p-3 rounded-md border border-black/5 w-fit">
      <span className="text-sm font-medium text-slate-700">฿ 299 / เดือน</span>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-bold text-emerald-700">⭐ ฿ 2,490 / ปี</span>
        <span className="text-xs bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-semibold">
          ประหยัด 1,098 บาท
        </span>
      </div>
    </div>
  )

  // หมดอายุ
  if (daysRemaining <= 0) {
    return (
      <Alert variant="destructive" className="mb-6 border-red-500 bg-red-50">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle className="font-bold">วันใช้งานหมดแล้ว!</AlertTitle>
        <AlertDescription className="mt-2">
          <p>กรุณาต่ออายุแพ็กเกจ</p>
          <PricingBlock />
          <Link href="/#pricing">
            <Button variant="destructive" size="sm" className="mt-1">
              ต่ออายุทันที
            </Button>
          </Link>
        </AlertDescription>
      </Alert>
    )
  }

  let bannerStyle = "border-yellow-400 bg-yellow-50 text-yellow-800"
  let icon = <Clock className="h-4 w-4 text-yellow-600" />

  if (currentThreshold === 3) {
    bannerStyle = "border-orange-400 bg-orange-50 text-orange-800"
    icon = <AlertTriangle className="h-4 w-4 text-orange-600" />
  } else if (currentThreshold === 1) {
    bannerStyle = "border-red-400 bg-red-50 text-red-800"
    icon = <AlertCircle className="h-4 w-4 text-red-600" />
  }

  return (
    <Alert className={`mb-6 relative ${currentThreshold !== 1 ? 'pr-10' : ''} ${bannerStyle}`}>
      {icon}

      {currentThreshold !== 1 && (
        <button
          onClick={handleDismiss}
          className="absolute top-3 right-3 p-1.5 rounded-md opacity-60 hover:opacity-100 hover:bg-black/5"
        >
          <X className="h-4 w-4" />
        </button>
      )}

      <AlertTitle className="font-bold">
        {daysRemaining === 1 ? "เตือนครั้งสุดท้าย!" : "แจ้งเตือนวันหมดอายุ"}
      </AlertTitle>

      <AlertDescription className="mt-2">
        <p>ระบบจะหมดอายุในอีก <strong>{daysRemaining} วัน</strong></p>

        <PricingBlock />

        <Link href="/#pricing">
          <Button className="bg-emerald-600 hover:bg-emerald-700 text-white mt-1" size="sm">
            ต่ออายุทันที
          </Button>
        </Link>
      </AlertDescription>
    </Alert>
  )
}