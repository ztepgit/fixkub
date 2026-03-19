"use client"

import { useState, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { CheckCircle2, QrCode, ArrowLeft, UploadCloud, Send, ShieldCheck, HelpCircle, FileImage, X,Loader2 } from "lucide-react"

function PaymentForm() {
  const searchParams = useSearchParams()
  const plan = searchParams.get("plan") || "yearly"
  const { toast } = useToast()
  
  const [paymentMethod, setPaymentMethod] = useState("promptpay")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  // 🌟 State สำหรับเก็บไฟล์สลิป และชื่อร้าน/เบอร์โทร
  const [slipFile, setSlipFile] = useState<File | null>(null)
  const [shopName, setShopName] = useState("")
  const [phone, setPhone] = useState("")

  const packageDetails = plan === "monthly" ? {
    title: "แพ็กเกจรายเดือน",
    price: 199,
    priceText: "฿199",
    period: "ต่อเดือน",
    features: ["สร้างบิลซ่อมไม่จำกัด", "กระดานคิวอัจฉริยะ", "รองรับ 1 สาขา", "หน้าเช็คสถานะสำหรับลูกค้า"]
  } : {
    title: "แพ็กเกจรายปี (คุ้มที่สุด)",
    price: 1690,
    priceText: "฿1,690",
    period: "ต่อปี",
    features: ["สร้างบิลซ่อมไม่จำกัด", "ป้าย QR Code ตั้งโต๊ะ", "ฟรี อัปเดตฟีเจอร์ใหม่", "ซัพพอร์ตด่วน (Priority)"]
  }

  // 🌟 ฟังก์ชันจัดการตอนเลือกไฟล์
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      if (file.size > 5 * 1024 * 1024) {
        toast({ title: "ไฟล์ใหญ่เกินไป", description: "กรุณาอัปโหลดรูปภาพขนาดไม่เกิน 5MB", variant: "destructive" })
        return
      }
      setSlipFile(file)
    }
  }

  // 🌟 ฟังก์ชันส่งข้อมูลชำระเงิน
  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!slipFile) {
      toast({ title: "กรุณาอัปโหลดสลิป", description: "ต้องแนบหลักฐานการโอนเงินเพื่อดำเนินการต่อ", variant: "destructive" })
      return
    }

    setIsSubmitting(true)
    
    try {
      // 1. เตรียมไฟล์เพื่อยิงไปหา API หลังบ้านของเรา
      const formData = new FormData()
      formData.append("files", slipFile)

      // 2. เรียก API ตรวจสลิป
      const res = await fetch("/api/verify-slip", {
        method: "POST",
        body: formData
      })
      
      const result = await res.json()

      if (result.success) {
        // 3. ตรวจสอบยอดเงิน ว่าโอนมาตรงกับแพ็กเกจไหม
        const paidAmount = result.data.amount
        
        if (paidAmount < packageDetails.price) {
          toast({ 
            title: "ยอดเงินไม่ถูกต้อง", 
            description: `คุณโอนมา ${paidAmount} บาท (ขาดอีก ${packageDetails.price - paidAmount} บาท) กรุณาตรวจสอบอีกครั้ง`, 
            variant: "destructive" 
          })
          setIsSubmitting(false)
          return
        }

        // ✅ ผ่านทุกเงื่อนไข: สลิปจริง ยอดเงินตรง! 
        // (ตรงนี้คุณปิ๊กสามารถแทรกโค้ดบันทึกข้อมูล Shop ลง Database ได้เลยครับ)
        console.log("บันทึกข้อมูลร้านค้า:", { shopName, phone, plan, paidAmount, transRef: result.data.transRef })

        setIsSuccess(true)
      } else {
        toast({ title: "ตรวจสลิปไม่ผ่าน", description: result.message, variant: "destructive" })
      }
    } catch (error) {
      toast({ title: "ระบบขัดข้อง", description: "ไม่สามารถตรวจสอบสลิปได้ในขณะนี้ กรุณาลองใหม่", variant: "destructive" })
    }
    
    setIsSubmitting(false)
  }

  if (isSuccess) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center animate-in fade-in zoom-in duration-500">
        <div className="h-20 w-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-6">
          <CheckCircle2 className="h-10 w-10" />
        </div>
        <h2 className="text-3xl font-bold text-slate-800 mb-2">ตรวจสอบสลิปสำเร็จ!</h2>
        <p className="text-slate-600 mb-8 max-w-md mx-auto">
          ระบบได้รับยอดเงินจำนวน <span className="font-bold text-emerald-600">{packageDetails.priceText}</span> เรียบร้อยแล้ว ระบบกำลังสร้างพื้นที่ร้านค้าของคุณ กรุณารอสักครู่...
        </p>
        <Link href="/login">
          <Button className="bg-emerald-600 hover:bg-emerald-700">
            เข้าสู่ระบบร้านค้าของคุณ
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="grid gap-8 md:grid-cols-5 max-w-5xl mx-auto">
      <div className="md:col-span-2 space-y-6">
        <Card className="border-slate-200 shadow-sm sticky top-24">
          <CardHeader className="bg-slate-50/50 border-b pb-4">
            <CardTitle className="text-lg">สรุปคำสั่งซื้อ</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="font-bold text-slate-800">{packageDetails.title}</h3>
                <p className="text-sm text-slate-500 mt-1">ESYQ Repair</p>
              </div>
              <div className="text-right">
                <span className="text-2xl font-bold text-emerald-600">{packageDetails.priceText}</span>
                <span className="text-xs text-slate-500 block">{packageDetails.period}</span>
              </div>
            </div>

            <div className="space-y-3 mb-6">
              {packageDetails.features.map((feature, idx) => (
                <div key={idx} className="flex items-center gap-2 text-sm text-slate-600">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                  <span>{feature}</span>
                </div>
              ))}
            </div>

            <div className="border-t pt-4 flex justify-between items-center font-bold text-lg">
              <span>ยอดชำระสุทธิ</span>
              <span className="text-emerald-700">{packageDetails.priceText}</span>
            </div>
          </CardContent>
          <CardFooter className="bg-slate-50/50 text-xs text-slate-500 flex justify-center py-4 border-t">
            <ShieldCheck className="h-4 w-4 mr-1 text-emerald-600" /> ตรวจสอบสลิปอัตโนมัติ ใช้งานได้ทันที
          </CardFooter>
        </Card>
        
        <div className="text-center text-sm text-slate-500 flex items-center justify-center gap-2">
          <HelpCircle className="h-4 w-4" /> มีปัญหาการชำระเงิน? <Link href="#" className="text-emerald-600 font-medium hover:underline">ติดต่อผ่าน facebook</Link>
        </div>
      </div>

      <div className="md:col-span-3">
        <form onSubmit={handleCheckout}>
          <Card className="border-slate-200 shadow-md">
            <CardHeader>
              <CardTitle className="text-xl">เลือกช่องทางการชำระเงิน</CardTitle>
              <CardDescription>สแกน QR Code เพื่อโอนเงิน และอัปโหลดสลิปยืนยัน</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              
              <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod} className="grid grid-cols-2 gap-4">
                <div>
                  <RadioGroupItem value="promptpay" id="promptpay" className="peer sr-only" />
                  <Label htmlFor="promptpay" className="flex flex-col items-center justify-between rounded-md border-2 border-slate-200 bg-transparent p-4 hover:bg-slate-50 peer-data-[state=checked]:border-emerald-600 peer-data-[state=checked]:bg-emerald-50 [&:has([data-state=checked])]:border-emerald-600 cursor-pointer">
                    <QrCode className="mb-2 h-6 w-6 text-slate-700" />
                    <span className="font-semibold text-sm">พร้อมเพย์ / QR</span>
                  </Label>
                </div>
                <div>
                  <RadioGroupItem value="bank" id="bank" className="peer sr-only" disabled />
                  <Label htmlFor="bank" className="flex flex-col items-center justify-between rounded-md border-2 border-slate-200 bg-transparent p-4 opacity-50 cursor-not-allowed">
                    <span className="mb-2 font-bold text-lg text-slate-400">BANK</span>
                    <span className="font-semibold text-sm">โอนเงินธนาคาร</span>
                  </Label>
                </div>
              </RadioGroup>

              {paymentMethod === "promptpay" && (
                <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 flex flex-col items-center text-center">
                  <Badge className="mb-4 bg-blue-900 hover:bg-blue-900">พร้อมเพย์ (PromptPay)</Badge>
                  
                  {/* เปลี่ยน Placeholder QR เป็นภาพ หรือ QR โค้ดรับเงินจริงของคุณปิ๊กได้เลย */}
                  <div className="h-48 w-48 bg-white border-2 border-slate-200 rounded-lg flex items-center justify-center mb-4 shadow-sm overflow-hidden">
                     {/* ใส่ <img src="qr-code-url" /> ตรงนี้ */}
                    <QrCode className="h-20 w-20 text-slate-300" />
                  </div>
                  
                  <p className="font-bold text-slate-800 text-lg">บจก. อีซี่คิว โซลูชั่น</p>
                  <p className="text-slate-500 font-mono mt-1">012-3456-789-0</p>
                  <div className="mt-4 bg-emerald-100 text-emerald-800 px-4 py-2 rounded-full font-bold text-lg">
                    ยอดโอน: {packageDetails.priceText}
                  </div>
                </div>
              )}

              <div className="space-y-4 pt-4 border-t">
                <h3 className="font-bold text-slate-800">ข้อมูลร้านค้า และหลักฐาน</h3>
                
                <div className="grid gap-2">
                  <Label htmlFor="shopName">ชื่อร้านค้าของคุณ <span className="text-red-500">*</span></Label>
                  <Input id="shopName" value={shopName} onChange={(e) => setShopName(e.target.value)} placeholder="เช่น ร้านปิ๊กโมบาย" required />
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="phone">เบอร์โทรศัพท์ติดต่อ <span className="text-red-500">*</span></Label>
                  <Input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="08X-XXX-XXXX" required />
                </div>

                <div className="grid gap-2">
                  <Label>อัปโหลดสลิปโอนเงิน <span className="text-red-500">*</span></Label>
                  
                  {!slipFile ? (
                    <Label htmlFor="slip" className="border-2 border-dashed border-slate-300 rounded-lg p-8 flex flex-col items-center justify-center text-center hover:bg-slate-50 transition-colors cursor-pointer group">
                      <div className="h-12 w-12 bg-emerald-50 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                        <UploadCloud className="h-6 w-6 text-emerald-600" />
                      </div>
                      <p className="text-sm font-semibold text-slate-700">คลิกเพื่ออัปโหลดสลิปโอนเงิน</p>
                      <p className="text-xs text-slate-500 mt-1">รองรับ JPG, PNG ขนาดไม่เกิน 5MB</p>
                      <Input id="slip" type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                    </Label>
                  ) : (
                    <div className="flex items-center justify-between p-4 border rounded-lg bg-slate-50 border-emerald-200">
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className="h-10 w-10 bg-emerald-100 rounded flex items-center justify-center shrink-0">
                          <FileImage className="h-5 w-5 text-emerald-600" />
                        </div>
                        <div className="truncate">
                          <p className="text-sm font-medium text-slate-700 truncate">{slipFile.name}</p>
                          <p className="text-xs text-slate-500">{(slipFile.size / 1024 / 1024).toFixed(2)} MB</p>
                        </div>
                      </div>
                      <Button type="button" variant="ghost" size="icon" onClick={() => setSlipFile(null)} className="text-slate-400 hover:text-rose-500 shrink-0">
                        <X className="h-5 w-5" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
            <CardFooter className="bg-slate-50 pt-6">
              <Button type="submit" className="w-full h-12 text-lg bg-emerald-600 hover:bg-emerald-700 shadow-md" disabled={isSubmitting || !slipFile}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="animate-spin h-5 w-5 mr-2" /> กำลังตรวจสอบสลิป...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-5 w-5" /> ยืนยันการชำระเงิน
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        </form>
      </div>
    </div>
  )
}

export default function PaymentPage() {
  return (
    <div className="min-h-screen bg-slate-50/50 py-10 px-4">
      <div className="container mx-auto max-w-5xl mb-8">
        <Link href="/">
          <Button variant="ghost" className="text-slate-500 hover:text-slate-800 -ml-4">
            <ArrowLeft className="h-4 w-4 mr-2" /> กลับหน้าหลัก
          </Button>
        </Link>
      </div>
      
      <Suspense fallback={<div className="flex justify-center py-20"><Loader2 className="animate-spin h-8 w-8 text-emerald-600" /></div>}>
        <PaymentForm />
      </Suspense>
    </div>
  )
}