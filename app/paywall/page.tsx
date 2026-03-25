"use client"

import Link from "next/link"
import { useSearchParams } from "next/navigation" // 🌟 1. Import สำหรับดึงค่าจาก URL
import { useEffect, useState } from "react"
import { format, addDays } from "date-fns" // 🌟 2. Import date-fns สำหรับจัดการวันที่
import { th } from "date-fns/locale" // 🌟 3. Import ภาษาไทย
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Clock, ShieldAlert, ArrowRight, CreditCard, HelpCircle, Lock, AlertTriangle } from "lucide-react"

export default function PaywallPage() {
  const searchParams = useSearchParams()
  const [daysLeft, setDaysLeft] = useState<number>(30)
  const [deletionDate, setDeletionDate] = useState<string>("")

  // 🌟 4. ดึงค่า daysLeft จาก URL และคำนวณวันที่ลบถาวร
  useEffect(() => {
    // ถ้าไม่มีการส่งค่ามา ให้ค่าเริ่มต้นคือ 30 วัน
    const urlDaysLeft = parseInt(searchParams.get("daysLeft") || "30", 10)
    
    // ป้องกันค่าติดลบ (ถ้าหมดเวลาแล้วให้เป็น 0)
    const safeDaysLeft = Math.max(0, urlDaysLeft)
    setDaysLeft(safeDaysLeft)

    // คำนวณหาวันที่จะถูกลบถาวร (วันนี้ + วันที่เหลือ)
    const targetDate = addDays(new Date(), safeDaysLeft)
    
    // จัดรูปแบบวันที่ให้อ่านง่าย เช่น "25 เมษายน 2569" (บวก 543 เพื่อแปลงเป็น พ.ศ.)
    const formattedDate = format(targetDate, "d MMMM yyyy", { locale: th })
    const thaiYearDate = formattedDate.replace(
      targetDate.getFullYear().toString(), 
      (targetDate.getFullYear() + 543).toString()
    )
    
    setDeletionDate(thaiYearDate)
  }, [searchParams])

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      
      {/* Background decoration (วงกลมเบลอๆ พื้นหลัง) */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-amber-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-rose-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>

      <div className="w-full max-w-md relative z-10">
        {/* โลโก้แอป */}
        <div className="text-center mb-6">
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">esy<span className="text-emerald-600">Q</span></h1>
          <p className="text-sm font-medium text-slate-500">ระบบจัดการร้านซ่อมมือถือ</p>
        </div>

        <Card className="border-none shadow-xl bg-white/95 backdrop-blur-sm overflow-hidden">
          
          {/* 🌟 5. แถบแจ้งเตือน Grace Period สุดเด่น */}
          <div className="bg-rose-500 text-white text-center py-2 px-4 text-sm font-medium flex items-center justify-center gap-2">
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
              
              {/* 🌟 6. ข้อความแจ้งนโยบายการลบข้อมูล */}
              <div className="bg-rose-50 rounded-lg p-3 border border-rose-100 text-sm text-rose-800">
                ตามนโยบายการจัดเก็บข้อมูล (Data Retention Policy) ข้อมูลจะถูกเก็บรักษาไว้ 30 วันหลังหมดอายุ หลังจากนั้นระบบจะทำการ <strong>ลบข้อมูลทั้งหมดอย่างถาวรในวันที่ {deletionDate}</strong>
              </div>
            </div>
          </CardContent>

          <CardFooter className="flex flex-col gap-3 pb-8">
            {/* ปุ่มนำไปหน้า Payment ที่เราสร้างไว้ */}
            <Link href="/payment?plan=yearly" className="w-full">
              <Button className="w-full h-12 text-base font-bold bg-emerald-600 hover:bg-emerald-700 shadow-md transition-all hover:scale-[1.02]">
                <CreditCard className="mr-2 h-5 w-5" /> ต่ออายุแพ็กเกจทันที
              </Button>
            </Link>
            
            <Link href="/payment?plan=monthly" className="w-full">
              <Button variant="outline" className="w-full h-12 text-slate-600 border-slate-300 hover:bg-slate-50 font-medium">
                ดูแพ็กเกจแบบรายเดือน
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