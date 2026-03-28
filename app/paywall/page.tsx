"use client"

import Link from "next/link"
import { useRouter } from "next/navigation" 
import { useEffect, useState } from "react"
import { format, addDays } from "date-fns"
import { th } from "date-fns/locale" 
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Clock, ShieldAlert, CreditCard, HelpCircle, Lock, AlertTriangle, Loader2 } from "lucide-react"

import { checkAndEnforceShopStatus } from "@/actions/shop-status"
// 🌟 1. Import เพิ่มเติมสำหรับการดึงร้านค้าของผู้ใช้
import { supabase } from "@/lib/supabase"
import { getUserShops } from "@/actions/shop"

export default function PaywallPage() {
  const router = useRouter()
  
  // 🌟 2. เพิ่ม State เก็บ shopId จริงของลูกค้า
  const [shopId, setShopId] = useState<string | null>(null)
  
  const [daysLeft, setDaysLeft] = useState<number | null>(null)
  const [deletionDate, setDeletionDate] = useState<string>("")

  // 🌟 3. อัปเดต useEffect ให้ดึงข้อมูลร้านจริงๆ จากอีเมลที่ล็อกอินอยู่
  useEffect(() => {
    const fetchRealStatus = async () => {
      try {
        // เช็ค Session
        const { data: { user }, error } = await supabase.auth.getUser()

        if (error || !user?.email) {
          router.push('/login')
          return
        }

        // ค้นหาร้านค้าที่ผูกกับอีเมลนี้
        const shopRes = await getUserShops(user.email)

        if (!shopRes.success || shopRes.shops.length === 0) {
          router.push('/')
          return
        }

        // 🌟 ได้รหัสร้านของจริงมาแล้ว นำไปเช็คสถานะแพ็กเกจต่อ
        const realShopId = shopRes.shops[0].id
        setShopId(realShopId)
        
        const res = await checkAndEnforceShopStatus(realShopId)

        // ถ้าร้านยังไม่หมดอายุ (ACTIVE) ไม่ควรอยู่หน้านี้ ให้เตะกลับไปหน้า Dashboard!
        if (res.status === "ACTIVE") {
          router.push("/dashboard")
          return
        }

        // ดึงวันคงเหลือจริงๆ จาก Database (ถ้าไม่มีให้เผื่อไว้ที่ 30)
        const actualDaysLeft = res.daysLeftToPurge !== undefined ? res.daysLeftToPurge : 30
        const safeDaysLeft = Math.max(0, actualDaysLeft) // ป้องกันค่าติดลบ
        
        setDaysLeft(safeDaysLeft)

        // คำนวณหาวันที่จะถูกลบถาวร (วันนี้ + วันที่เหลือ)
        const targetDate = addDays(new Date(), safeDaysLeft)
        
        // แปลงเป็นภาษาไทย + ปี พ.ศ.
        const formattedDate = format(targetDate, "d MMMM yyyy", { locale: th })
        const thaiYearDate = formattedDate.replace(
          targetDate.getFullYear().toString(), 
          (targetDate.getFullYear() + 543).toString()
        )
        
        setDeletionDate(thaiYearDate)
      } catch (error) {
        console.error("Error fetching paywall data:", error)
        router.push('/') // ถ้า Error อะไรแปลกๆ เด้งกลับหน้าหลักก่อน
      }
    }

    fetchRealStatus()
  }, [router])

  // โชว์ Loading ป้องกันหน้ากระพริบตอนกำลังดึงข้อมูลและดึง shopId
  if (daysLeft === null || !shopId) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center">
        <Loader2 className="h-10 w-10 text-emerald-600 animate-spin mb-4" />
        <p className="text-slate-500 font-medium">กำลังตรวจสอบข้อมูลแพ็กเกจ...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      
      {/* Background decoration */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-amber-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-rose-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>

      <div className="w-full max-w-md relative z-10">
        {/* โลโก้แอป */}
        <div className="text-center mb-6">
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">esy<span className="text-emerald-600">Q</span></h1>
          <p className="text-sm font-medium text-slate-500">ระบบจัดการร้านซ่อมมือถือ</p>
        </div>

        <Card className="border-none shadow-xl bg-white/95 backdrop-blur-sm overflow-hidden animate-in zoom-in-95 duration-300">
          
          {/* แถบแจ้งเตือน Grace Period */}
          <div className="bg-rose-500 text-white text-center py-2 px-4 text-sm font-medium flex items-center justify-center gap-2 shadow-sm">
            <AlertTriangle className="w-4 h-4" />
            ข้อมูลจะถูกลบถาวรในอีก {daysLeft} วัน ({deletionDate})
          </div>

          <CardHeader className="text-center pb-2 pt-6">
            <div className="mx-auto w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mb-4 relative shadow-inner">
              <Lock className="h-10 w-10 text-amber-600 relative z-10" />
              {/* จุดแจ้งเตือนสีแดง */}
              <span className="absolute top-0 right-1 w-5 h-5 bg-rose-500 border-4 border-white rounded-full"></span>
            </div>
            
            <Badge variant="outline" className="mx-auto bg-amber-50 text-amber-700 border-amber-200 mb-2 px-3 py-1">
              <Clock className="w-3 h-3 mr-1" /> สถานะ: หมดอายุการใช้งาน
            </Badge>
            
            <CardTitle className="text-2xl font-bold text-slate-800">แพ็กเกจของคุณหมดอายุแล้ว</CardTitle>
            <CardDescription className="text-slate-600 mt-2 text-base">
              ระบบได้ทำการระงับการเข้าถึงชั่วคราว<br/>เพื่อการใช้งานที่ต่อเนื่อง กรุณาต่ออายุแพ็กเกจ
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-4 pt-4">
            <div className="bg-slate-50 border border-slate-100 rounded-xl p-5 space-y-3">
              <div className="flex items-start gap-3">
                <ShieldAlert className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="text-sm text-slate-600 leading-relaxed">
                  <strong className="text-slate-800 block mb-1">ข้อมูลของคุณยังปลอดภัย</strong>
                  ประวัติงานซ่อม บิลลูกค้า และสถิติรายได้ทั้งหมด ยังถูกเก็บรักษาไว้อย่างปลอดภัยในระบบของเรา 
                </div>
              </div>
              
              {/* ข้อความแจ้งนโยบายการลบข้อมูล */}
              <div className="bg-rose-50 rounded-lg p-3 border border-rose-100 text-sm text-rose-800">
                ตามนโยบายการจัดเก็บข้อมูล (Data Retention Policy) ข้อมูลจะถูกเก็บรักษาไว้ 30 วันหลังหมดอายุ หลังจากนั้นระบบจะทำการ <strong>ลบข้อมูลทั้งหมดอย่างถาวรในวันที่ {deletionDate}</strong>
              </div>
            </div>
          </CardContent>

          <CardFooter className="flex flex-col gap-3 pb-8">
            {/* 🌟 4. แก้ไขลิงก์ให้พาไปหน้า Checkout พร้อมแนบ shopId และ plan ที่จะต่ออายุไปเลย */}
            <Link href={`/checkout?shopId=${shopId}&plan=yearly`} className="w-full">
              <Button className="w-full h-12 text-base font-bold bg-emerald-600 hover:bg-emerald-700 shadow-md transition-all hover:scale-[1.02]">
                <CreditCard className="mr-2 h-5 w-5" /> ต่ออายุรายปี (คุ้มที่สุด)
              </Button>
            </Link>
            
            <Link href={`/checkout?shopId=${shopId}&plan=monthly`} className="w-full">
              <Button variant="outline" className="w-full h-12 text-slate-600 border-slate-300 hover:bg-slate-50 font-medium">
                ต่ออายุแบบรายเดือน
              </Button>
            </Link>
          </CardFooter>
        </Card>

        <div className="text-center mt-8 space-y-2">
          <p className="text-sm text-slate-500 flex items-center justify-center gap-1.5">
            <HelpCircle className="h-4 w-4" /> หากคุณชำระเงินแล้วแต่ระบบยังไม่เปิดใช้งาน
          </p>
          <Button variant="link" className="text-emerald-600 font-semibold hover:text-emerald-700">
            ติดต่อผู้ดูแลระบบ (Support)
          </Button>
        </div>
      </div>
    </div>
  )
}