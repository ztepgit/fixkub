"use client"

import { useState, Suspense, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { CheckCircle2, QrCode, UploadCloud, Send, ShieldCheck, FileImage, X, Loader2, Copy, Store } from "lucide-react"

import generatePayload from "promptpay-qr"
import { QRCodeCanvas } from "qrcode.react"
import { getSystemSettings } from "@/actions/setting"

function CheckoutForm() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const plan = searchParams.get("plan") || "yearly"
  const shopId = searchParams.get("shopId") // 🌟 ดึง shopId ที่ส่งมาจากหน้า Process/Onboarding
  
  const { toast } = useToast()
  
  const [paymentMethod, setPaymentMethod] = useState("promptpay")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [isCopied, setIsCopied] = useState(false) 
  const [slipFile, setSlipFile] = useState<File | null>(null)

  const [promptpayId, setPromptpayId] = useState("")
  const [accountName, setAccountName] = useState("")
  const [isLoadingPaymentInfo, setIsLoadingPaymentInfo] = useState(true)

  const packageDetails = plan === "monthly" ? {
    title: "แพ็กเกจรายเดือน",
    price: 199,
    priceText: "฿199.00",
    period: "ต่อเดือน",
  } : {
    title: "แพ็กเกจรายปี (คุ้มที่สุด)",
    price: 1690,
    priceText: "฿1,690.00",
    period: "ต่อปี",
  }

  // เด้งกลับถ้ายิงตรงมาหน้านี้โดยไม่มี shopId
  useEffect(() => {
    if (!shopId) {
      toast({ title: "ไม่พบข้อมูลร้านค้า", description: "กรุณาทำรายการตามขั้นตอน", variant: "destructive" })
      router.push("/payment")
    }
  }, [shopId, router, toast])

  useEffect(() => {
    const fetchPaymentInfo = async () => {
      const res = await getSystemSettings()
      if (res.success && res.data) {
        setPromptpayId(res.data.promptpayId || "")
        setAccountName(res.data.accountName || "")
      }
      setIsLoadingPaymentInfo(false)
    }
    fetchPaymentInfo()
  }, [])

  const qrPayload = promptpayId ? generatePayload(promptpayId, { amount: packageDetails.price }) : ""

  const handleCopyPromptPay = () => {
    if (!promptpayId) return
    navigator.clipboard.writeText(promptpayId)
    setIsCopied(true)
    toast({ title: "✅ คัดลอกสำเร็จ", description: "คัดลอกเลขพร้อมเพย์เรียบร้อยแล้ว" })
    setTimeout(() => setIsCopied(false), 2000)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSlipFile(e.target.files[0])
    }
  }

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!slipFile || !shopId) return

    setIsSubmitting(true)
    
    try {
      const formData = new FormData()
      formData.append("files", slipFile)
      
      // 🌟 ส่ง shopId ไปด้วยถ้าใน API รองรับ
      formData.append("shopId", shopId)
      formData.append("plan", plan)

      const res = await fetch("/api/verify-slip", {
        method: "POST",
        body: formData
      })
      const result = await res.json()

      if (result.success) {
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
        <h2 className="text-3xl font-bold text-slate-800 mb-2">เปิดใช้งานสำเร็จ!</h2>
        <p className="text-slate-600 mb-8 max-w-md mx-auto">
          ระบบได้รับยอดเงินเรียบร้อยแล้ว และได้ทำการผูกแพ็กเกจเข้ากับร้านค้าของคุณเสร็จสิ้น
        </p>
        <Button onClick={() => window.location.href = '/dashboard'} className="bg-emerald-600 hover:bg-emerald-700">
          เข้าสู่ระบบจัดการร้านค้า
        </Button>
      </div>
    )
  }

  if (!shopId) return null

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
                <p className="text-sm text-slate-500 mt-1">รหัสอ้างอิง: {shopId.substring(0, 8)}</p>
              </div>
              <div className="text-right">
                <span className="text-2xl font-bold text-emerald-600">{packageDetails.priceText}</span>
              </div>
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
      </div>

      <div className="md:col-span-3">
        <form onSubmit={handleCheckout}>
          <Card className="border-slate-200 shadow-md">
            <CardHeader>
              <CardTitle className="text-xl">เลือกช่องทางการชำระเงิน</CardTitle>
              <CardDescription>สแกน QR Code เพื่อโอนเงิน และอัปโหลดสลิปยืนยัน</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* โค้ดส่วน QR Code ยืนยันคงเดิมเหมือนของคุณปิ๊กเลยครับ */}
              <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod} className="grid grid-cols-2 gap-4">
                <div>
                  <RadioGroupItem value="promptpay" id="promptpay" className="peer sr-only" />
                  <Label htmlFor="promptpay" className="flex flex-col items-center justify-between rounded-md border-2 border-slate-200 bg-transparent p-4 hover:bg-slate-50 peer-data-[state=checked]:border-blue-600 peer-data-[state=checked]:bg-blue-50 cursor-pointer">
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
                <div className="bg-slate-50/80 p-6 rounded-2xl border border-slate-200 flex flex-col items-center text-center min-h-[300px] justify-center">
                  {!isLoadingPaymentInfo && promptpayId && (
                    <>
                      <Badge className="mb-5 bg-[#003D7C] hover:bg-[#003D7C] text-white px-3 py-1 text-xs">PromptPay</Badge>
                      <div className="bg-white p-3 rounded-2xl border-[3px] border-[#003D7C]/20 flex items-center justify-center mb-6 shadow-sm overflow-hidden transition-transform hover:scale-105 duration-300">
                        <QRCodeCanvas value={qrPayload} size={200} bgColor={"#ffffff"} fgColor={"#0f172a"} level={"H"} includeMargin={false} />
                      </div>
                      <div className="w-full bg-white p-4 rounded-xl border border-slate-200 space-y-3 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1.5 bg-[#003D7C]"></div>
                        <div className="space-y-0.5">
                          <p className="text-xs text-slate-500 font-bold uppercase">ชื่อบัญชีรับเงิน</p>
                          <p className="font-bold text-slate-800 text-base">{accountName}</p>
                        </div>
                        <div className="flex items-center justify-between bg-slate-50 rounded-lg p-2.5 border border-slate-100">
                          <span className="font-mono font-bold text-slate-700 tracking-wider text-base pl-2">{promptpayId}</span>
                          <Button type="button" variant="ghost" size="sm" onClick={handleCopyPromptPay} className="text-blue-600">
                            {isCopied ? <CheckCircle2 className="w-4 h-4 mr-1" /> : <Copy className="w-4 h-4 mr-1" />}
                            {isCopied ? "คัดลอกแล้ว" : "คัดลอก"}
                          </Button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}

              <div className="space-y-4 pt-6 border-t">
                <div className="grid gap-2">
                  <Label>อัปโหลดสลิปโอนเงิน <span className="text-red-500">*</span></Label>
                  {!slipFile ? (
                    <Label htmlFor="slip" className="border-2 border-dashed border-emerald-200 bg-emerald-50/50 rounded-xl p-8 flex flex-col items-center text-center hover:bg-emerald-50 cursor-pointer">
                      <UploadCloud className="h-8 w-8 text-emerald-600 mb-2" />
                      <p className="text-sm font-bold text-emerald-800">คลิกเพื่ออัปโหลดสลิปโอนเงิน</p>
                      <Input id="slip" type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                    </Label>
                  ) : (
                    <div className="flex items-center justify-between p-4 border-2 rounded-xl bg-emerald-50 border-emerald-200">
                      <div className="flex items-center gap-3">
                        <FileImage className="h-6 w-6 text-emerald-600" />
                        <p className="text-sm font-bold text-slate-800">{slipFile.name}</p>
                      </div>
                      <Button type="button" variant="ghost" size="icon" onClick={() => setSlipFile(null)}>
                        <X className="h-4 w-4 text-slate-400 hover:text-rose-500" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
            <CardFooter className="bg-slate-50 pt-6 rounded-b-xl border-t border-slate-100">
              <Button type="submit" className="w-full h-14 text-lg bg-emerald-600 hover:bg-emerald-700 rounded-xl" disabled={isSubmitting || !slipFile}>
                {isSubmitting ? <><Loader2 className="animate-spin h-5 w-5 mr-2" /> กำลังตรวจสอบ...</> : <><Send className="mr-2 h-5 w-5" /> ยืนยันการชำระเงิน</>}
              </Button>
            </CardFooter>
          </Card>
        </form>
      </div>
    </div>
  )
}

export default function CheckoutPage() {
  return (
    <div className="min-h-screen bg-slate-50/50 py-10 px-4">
      <Suspense fallback={<div className="flex justify-center py-20"><Loader2 className="animate-spin h-8 w-8 text-emerald-600" /></div>}>
        <CheckoutForm />
      </Suspense>
    </div>
  )
}