"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CheckCircle2, ArrowLeft, LogIn } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

export default function PaymentSelectionPage() {
  const router = useRouter()
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [showLoginPopup, setShowLoginPopup] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null)

  // 🌟 1. เช็คว่าผู้ใช้ล็อกอินหรือยัง ตั้งแต่เปิดหน้าเว็บ
  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setIsLoggedIn(!!session)
    }
    checkUser()
  }, [])

  // 🌟 2. เมื่อกดปุ่ม "เลือกแพ็กเกจ"
  const handleSelectPlan = (plan: string) => {
    if (!isLoggedIn) {
      // ถ้ายังไม่ Login ให้เปิด Pop-up และจำแพ็กเกจไว้
      setSelectedPlan(plan)
      setShowLoginPopup(true)
    } else {
      // ถ้า Login แล้ว ส่งไปหน้าจัดสรรเส้นทาง (Process) ทันที
      router.push(`/payment/process?plan=${plan}`)
    }
  }

  // 🌟 3. เมื่อกดดำเนินการต่อใน Pop-up
  const handleContinueToLogin = () => {
    // แนบ URL ไปด้วยว่า พอล็อกอินเสร็จ ให้กลับมาประมวลผลแพ็กเกจที่เลือกไว้นะ
    router.push(`/login?next=/payment/process?plan=${selectedPlan}`)
  }

  return (
    <div className="min-h-screen bg-slate-50/50 py-10 px-4">
      <div className="container mx-auto max-w-5xl mb-8">
        <Link href="/">
          <Button variant="ghost" className="text-slate-500 hover:text-slate-800 -ml-4 font-bold">
            <ArrowLeft className="h-4 w-4 mr-2" /> กลับหน้าหลัก
          </Button>
        </Link>
      </div>

      <div className="text-center mb-12">
        <h1 className="text-3xl font-bold text-slate-800 mb-4">เลือกแพ็กเกจที่เหมาะกับร้านคุณ</h1>
        <p className="text-slate-600">ยกระดับการจัดการร้านซ่อมมือถือของคุณให้เป็นมืออาชีพ</p>
      </div>

      <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
        {/* แพ็กเกจรายเดือน */}
        <Card className="border-slate-200 shadow-md relative overflow-hidden flex flex-col">
          <CardHeader className="text-center pb-8 pt-10">
            <CardTitle className="text-2xl text-slate-700">รายเดือน</CardTitle>
            <div className="mt-4 flex items-baseline justify-center gap-1">
              <span className="text-4xl font-black text-slate-800">฿199</span>
              <span className="text-slate-500 font-medium">/เดือน</span>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 flex-1">
            {["สร้างบิลซ่อมไม่จำกัด", "กระดานคิวอัจฉริยะ", "รองรับ 1 สาขา", "หน้าเช็คสถานะสำหรับลูกค้า"].map((feat, i) => (
              <div key={i} className="flex items-center gap-3 text-slate-600">
                <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
                <span>{feat}</span>
              </div>
            ))}
          </CardContent>
          <CardFooter>
            <Button onClick={() => handleSelectPlan("monthly")} variant="outline" className="w-full h-12 text-base font-bold text-emerald-600 border-emerald-200 hover:bg-emerald-50">
              เลือกรายเดือน
            </Button>
          </CardFooter>
        </Card>

        {/* แพ็กเกจรายปี (คุ้มที่สุด) */}
        <Card className="border-emerald-500 shadow-xl relative overflow-hidden flex flex-col scale-105 z-10">
          <div className="absolute top-0 inset-x-0 h-1.5 bg-emerald-500"></div>
          <Badge className="absolute top-4 right-4 bg-amber-500 hover:bg-amber-500 text-white font-bold px-3 py-1">คุ้มที่สุด</Badge>
          
          <CardHeader className="text-center pb-8 pt-10">
            <CardTitle className="text-2xl text-emerald-700">รายปี</CardTitle>
            <div className="mt-4 flex items-baseline justify-center gap-1">
              <span className="text-4xl font-black text-slate-800">฿1,690</span>
              <span className="text-slate-500 font-medium">/ปี</span>
            </div>
            <p className="text-sm text-emerald-600 font-medium mt-2">ประหยัดไปถึง 698 บาท!</p>
          </CardHeader>
          <CardContent className="space-y-4 flex-1">
            {["สร้างบิลซ่อมไม่จำกัด", "ป้าย QR Code ตั้งโต๊ะ", "ฟรี อัปเดตฟีเจอร์ใหม่", "ซัพพอร์ตด่วน (Priority)"].map((feat, i) => (
              <div key={i} className="flex items-center gap-3 text-slate-600">
                <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
                <span className="font-medium">{feat}</span>
              </div>
            ))}
          </CardContent>
          <CardFooter>
            <Button onClick={() => handleSelectPlan("yearly")} className="w-full h-12 text-base font-bold bg-emerald-600 hover:bg-emerald-700 shadow-md">
              เลือกแพ็กเกจรายปี
            </Button>
          </CardFooter>
        </Card>
      </div>

      {/* 🌟 ดัก Pop-up แจ้งเตือน Login */}
      <Dialog open={showLoginPopup} onOpenChange={setShowLoginPopup}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="mx-auto w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-4">
              <LogIn className="h-6 w-6" />
            </div>
            <DialogTitle className="text-center text-xl">กรุณาเข้าสู่ระบบ</DialogTitle>
            <DialogDescription className="text-center text-base pt-2">
              ระบบต้องการให้ท่านเข้าสู่ระบบก่อนชำระเงิน<br/>เพื่อเชื่อมโยงแพ็กเกจเข้ากับข้อมูลร้านค้าของท่านได้อย่างถูกต้อง
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col sm:flex-row gap-2 mt-4">
            <Button type="button" variant="outline" onClick={() => setShowLoginPopup(false)} className="w-full">
              ยกเลิก
            </Button>
            <Button type="button" onClick={handleContinueToLogin} className="w-full bg-blue-600 hover:bg-blue-700">
              ไปหน้าเข้าสู่ระบบ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}