//app/checkout/page.tsx
"use client"

import { useState, Suspense, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { CheckCircle2, QrCode, ArrowLeft, UploadCloud, Send, ShieldCheck, HelpCircle, FileImage, X, Loader2, Copy, Store, Globe, CircleAlert } from "lucide-react"

// 🌟 Import UI สำหรับทำ Modal (Dialog)
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"

import generatePayload from "promptpay-qr"
import { QRCodeCanvas } from "qrcode.react"

import { getSystemSettings } from "@/actions/setting"
import { getShopById } from "@/actions/shop"
import { processPaymentSuccess } from "@/actions/subscription"
import { checkAndEnforceShopStatus } from "@/actions/shop-status"

function CheckoutForm() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const plan = searchParams.get("plan") || "yearly"
  const shopId = searchParams.get("shopId")

  const { toast } = useToast()

  const [paymentMethod, setPaymentMethod] = useState("promptpay")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [isCopied, setIsCopied] = useState(false)

  const [slipFile, setSlipFile] = useState<File | null>(null)

  const [promptpayId, setPromptpayId] = useState("")
  const [accountName, setAccountName] = useState("")
  const [isLoadingPaymentInfo, setIsLoadingPaymentInfo] = useState(true)

  const [shopInfo, setShopInfo] = useState<{ name: string, url: string } | null>(null)
  const [isLoadingShop, setIsLoadingShop] = useState(true)

  const [isExpired, setIsExpired] = useState(false)

  // 🌟 เพิ่ม State สำหรับคุม Modal แจ้งเตือนข้อผิดพลาดจาก SlipOK
  const [errorModalOpen, setErrorModalOpen] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")

  const packageDetails = plan === "monthly" ? {
    title: "แพ็กเกจรายเดือน",
    price: 1,
    priceText: "฿1.00",
    period: "ต่อเดือน",
    features: ["สร้างคิวซ่อมไม่จำกัด", "กระดานคิวอัจฉริยะ", "รายงานรายได้", "หน้าเช็คสถานะสำหรับลูกค้า"]
  } : {
    title: "แพ็กเกจรายปี (190.83/เดือน)",
    price: 2290,
    priceText: "฿2,290.00",
    period: "ต่อปี",
    features: ["ทุกอย่างในแพ็กเกจรายเดือน", "ประหยัดกว่าถึง 36%", "ซัพพอร์ตด่วน (Priority)", "เพิ่มสิทธิ์ Lucky Draw"]
  }

  useEffect(() => {
    if (!shopId) {
      toast({ title: "ไม่พบข้อมูลร้านค้า", description: "กรุณาทำรายการตามขั้นตอน", variant: "destructive" })
      router.push("/#pricing")
    }
  }, [shopId, router, toast])

  useEffect(() => {
    const fetchInitialData = async () => {
      const sysRes = await getSystemSettings()
      if (sysRes.success && sysRes.data) {
        setPromptpayId(sysRes.data.promptpayId || "")
        setAccountName(sysRes.data.accountName || "")
      }
      setIsLoadingPaymentInfo(false)

      if (shopId) {
        try {
          const shopRes = await getShopById(shopId)
          if (shopRes.success && shopRes.data) {
            setShopInfo({
              name: shopRes.data.name,
              url: `${window.location.origin}/${shopRes.data.slug}`
            })
          }

          const statusRes = await checkAndEnforceShopStatus(shopId)
          if (statusRes.status === "EXPIRED" || statusRes.status === "PENDING_DELETION") {
            setIsExpired(true)
          }

        } catch (error) {
          console.error("Failed to fetch shop info", error)
        } finally {
          setIsLoadingShop(false)
        }
      }
    }

    fetchInitialData()
  }, [shopId])

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
      const file = e.target.files[0]
      if (file.size > 5 * 1024 * 1024) {
        toast({ title: "ไฟล์ใหญ่เกินไป", description: "กรุณาอัปโหลดรูปภาพขนาดไม่เกิน 5MB", variant: "destructive" })
        return
      }
      setSlipFile(file)
    }
  }

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!slipFile || !shopId) {
      toast({ title: "ข้อมูลไม่ครบถ้วน", description: "กรุณาอัปโหลดสลิปยืนยันการโอนเงิน", variant: "destructive" })
      return
    }

    setIsSubmitting(true)

    try {
      const formData = new FormData()
      formData.append("files", slipFile)
      formData.append("shopId", shopId)
      formData.append("plan", plan)

      const res = await fetch("/api/verify-slip", {
        method: "POST",
        body: formData
      })

      const result = await res.json()

      if (result.success) {
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

        const planEnum = plan === "monthly" ? "BASIC_MONTHLY" : "BASIC_YEARLY"

        const updateRes = await processPaymentSuccess(shopId, planEnum, paidAmount, result.data.transRef)

        if (updateRes.success) {
          setIsSuccess(true)
        } else {
          toast({
            title: "เกิดข้อผิดพลาด",
            description: updateRes.error || "ตรวจสลิปผ่านแล้ว แต่ไม่อัปเดตฐานข้อมูล กรุณาติดต่อแอดมิน",
            variant: "destructive"
          })
        }

      } else {
        // 🌟 เปลี่ยนจาก Toast เป็นการเปิด Modal Center Screen แทนเมื่อตรวจสลิปจาก SlipOK ไม่ผ่าน
        setErrorMessage(result.message || "ไม่สามารถตรวจสอบสลิปได้")
        setErrorModalOpen(true)
      }
    } catch (error) {
      // 🌟 เปลี่ยนจาก Toast เป็นเปิด Modal กรณีที่ระบบ Network หรือ API ล่ม
      setErrorMessage("ไม่สามารถตรวจสอบสลิปได้ในขณะนี้ กรุณาลองใหม่อีกครั้งในภายหลัง")
      setErrorModalOpen(true)
    }

    setIsSubmitting(false)
  }

  if (isSuccess) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center animate-in fade-in zoom-in duration-500">
        <div className="h-20 w-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-6 shadow-inner">
          <CheckCircle2 className="h-10 w-10" />
        </div>
        <h2 className="text-3xl font-bold text-slate-800 mb-2">เปิดใช้งานแพ็กเกจสำเร็จ!</h2>
        <p className="text-slate-600 mb-8 max-w-md mx-auto">
          ระบบได้รับยอดเงินจำนวน <span className="font-bold text-emerald-600">{packageDetails.priceText}</span> เรียบร้อยแล้ว สิทธิ์การใช้งานถูกเพิ่มเข้าสู่ร้านค้าของคุณแล้ว
        </p>
        <Button
          onClick={() => window.location.href = "/dashboard"}
          className="bg-emerald-600 hover:bg-emerald-700 h-12 px-8 text-base shadow-md hover:scale-105 transition-all"
        >
          เข้าสู่ระบบจัดการร้านค้า
        </Button>
      </div>
    )
  }

  if (!shopId) return null

  return (
    <>
      <div className="container mx-auto max-w-5xl mb-8">
        <Link href={isExpired ? "/paywall" : "/#pricing"}>
          <Button variant="ghost" className="text-slate-500 hover:text-slate-800 -ml-4 font-bold">
            <ArrowLeft className="h-4 w-4 mr-2" /> {isExpired ? "กลับไปหน้าแจ้งเตือน (Paywall)" : "ต้องการแพ็กเกจอื่น"}
          </Button>
        </Link>
      </div>

      <div className="grid gap-8 md:grid-cols-5 max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">

        {/* คอลัมน์ซ้าย: สรุปคำสั่งซื้อ */}
        <div className="md:col-span-2 space-y-6">
          <Card className="border-slate-200 shadow-sm sticky top-24">
            <CardHeader className="bg-slate-50/50 border-b pb-4">
              <CardTitle className="text-lg">สรุปคำสั่งซื้อ</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">

              <div className="mb-6 p-4 bg-emerald-50/50 rounded-xl border border-emerald-100">
                <h4 className="text-sm font-semibold text-slate-500 mb-2">ชำระเงินสำหรับร้านค้า:</h4>
                {isLoadingShop ? (
                  <div className="flex items-center gap-2 text-slate-400 text-sm">
                    <Loader2 className="animate-spin h-4 w-4" /> กำลังโหลดข้อมูลร้าน...
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Store className="h-5 w-5 text-emerald-600" />
                      <span className="font-bold text-slate-800 text-base">{shopInfo?.name || "ไม่พบชื่อร้านค้า"}</span>
                    </div>
                    {shopInfo?.url && (
                      <div className="flex items-center gap-2 text-sm text-blue-600 mt-1 pl-7">
                        <Globe className="h-4 w-4 shrink-0" />
                        <a href={shopInfo.url} target="_blank" rel="noopener noreferrer" className="hover:underline truncate">
                          {shopInfo.url.replace(/^https?:\/\//, '')}
                        </a>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="font-bold text-slate-800">{packageDetails.title}</h3>
                  <p className="text-xs text-slate-400 mt-1">รหัสอ้างอิง: {shopId.substring(0, 8).toUpperCase()}</p>
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
            <HelpCircle className="h-4 w-4" /> มีปัญหาการชำระเงิน? <Link href="#" className="text-emerald-600 font-medium hover:underline">ติดต่อแอดมิน</Link>
          </div>
        </div>

        {/* คอลัมน์ขวา: ฟอร์มชำระเงิน */}
        <div className="md:col-span-3">
          <form onSubmit={handleCheckout}>
            <Card className="border-slate-200 shadow-md">
              <CardHeader>
                <CardTitle className="text-xl">ชำระเงิน</CardTitle>
                <CardDescription>สแกน QR Code เพื่อชำระเงิน และอัปโหลดสลิปยืนยัน</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">

                {paymentMethod === "promptpay" && (
                  <div className="bg-slate-50/80 p-6 rounded-2xl border border-slate-200 flex flex-col items-center text-center animate-in fade-in duration-300 min-h-[300px] justify-center">

                    {isLoadingPaymentInfo ? (
                      <div className="flex flex-col items-center space-y-4">
                        <Loader2 className="animate-spin h-8 w-8 text-blue-600" />
                        <p className="text-slate-500 text-sm">กำลังโหลดข้อมูลบัญชีรับเงิน...</p>
                      </div>
                    ) : !promptpayId ? (
                      <div className="flex flex-col items-center space-y-4 py-8">
                        <div className="h-16 w-16 bg-slate-100 rounded-full flex items-center justify-center">
                          <ShieldCheck className="h-8 w-8 text-slate-300" />
                        </div>
                        <p className="text-slate-500 text-sm">ระบบยังไม่ได้ตั้งค่าบัญชีรับเงิน (PromptPay ID)</p>
                      </div>
                    ) : (
                      <>
                        <Badge className="mb-5 bg-[#003D7C] hover:bg-[#003D7C] text-white px-3 py-1 text-xs">PromptPay</Badge>

                        <div className="bg-white p-3 rounded-2xl border-[3px] border-[#003D7C]/20 flex items-center justify-center mb-6 shadow-sm overflow-hidden transition-transform hover:scale-105 duration-300">
                          <QRCodeCanvas
                            value={qrPayload}
                            size={200}
                            bgColor={"#ffffff"}
                            fgColor={"#0f172a"}
                            level={"H"}
                            includeMargin={false}
                          />
                        </div>

                        <div className="w-full bg-white p-4 rounded-xl border border-slate-200 space-y-3 relative overflow-hidden">
                          <div className="absolute top-0 left-0 w-full h-1.5 bg-[#003D7C]"></div>
                          <div className="space-y-0.5">
                            <p className="text-xs text-slate-500 font-bold uppercase tracking-wide">ชื่อบัญชีรับเงิน</p>
                            <p className="font-bold text-slate-800 text-base">{accountName || "ไม่ได้ระบุชื่อบัญชี"}</p>
                          </div>

                          <div className="flex items-center justify-between bg-slate-50 rounded-lg p-2.5 border border-slate-100">
                            <span className="font-mono font-bold text-slate-700 tracking-wider text-base pl-2">{promptpayId}</span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={handleCopyPromptPay}
                              className={`h-8 px-3 rounded-md font-medium transition-colors ${isCopied ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-700' : 'text-blue-600 hover:bg-blue-50 hover:text-blue-700'}`}
                            >
                              {isCopied ? <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" /> : <Copy className="w-3.5 h-3.5 mr-1.5" />}
                              {isCopied ? "คัดลอกแล้ว" : "คัดลอก"}
                            </Button>
                          </div>
                        </div>

                        <div className="mt-5 text-slate-600 font-medium">
                          สแกนจ่ายยอด <span className="text-2xl font-black text-emerald-600 ml-1">{packageDetails.priceText}</span>
                        </div>
                      </>
                    )}
                  </div>
                )}

                <div className="space-y-4 pt-6 border-t">
                  <h3 className="font-bold text-slate-800 flex items-center gap-2">
                    <Store className="w-5 h-5 text-slate-400" /> หลักฐานการโอนเงิน
                  </h3>

                  <div className="grid gap-2 pt-2">
                    <Label>อัปโหลดสลิปโอนเงิน <span className="text-red-500">*</span></Label>

                    {!slipFile ? (
                      <Label htmlFor="slip" className="border-2 border-dashed border-emerald-200 bg-emerald-50/50 rounded-xl p-8 flex flex-col items-center justify-center text-center hover:bg-emerald-50 transition-colors cursor-pointer group">
                        <div className="h-12 w-12 bg-white rounded-full flex items-center justify-center mb-3 shadow-sm group-hover:scale-110 transition-transform">
                          <UploadCloud className="h-6 w-6 text-emerald-600" />
                        </div>
                        <p className="text-sm font-bold text-emerald-800">คลิกเพื่ออัปโหลดสลิปโอนเงิน</p>
                        <p className="text-xs text-emerald-600/70 mt-1">รองรับ JPG, PNG ขนาดไม่เกิน 5MB</p>
                        <Input id="slip" type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                      </Label>
                    ) : (
                      <div className="flex items-center justify-between p-4 border-2 rounded-xl bg-emerald-50 border-emerald-200 animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex items-center gap-3 overflow-hidden">
                          <div className="h-12 w-12 bg-white rounded-full flex items-center justify-center shrink-0 shadow-sm">
                            <FileImage className="h-5 w-5 text-emerald-600" />
                          </div>
                          <div className="truncate">
                            <p className="text-sm font-bold text-slate-800 truncate">{slipFile.name}</p>
                            <p className="text-xs font-medium text-emerald-600 mt-0.5">{(slipFile.size / 1024 / 1024).toFixed(2)} MB</p>
                          </div>
                        </div>
                        <Button type="button" variant="ghost" size="icon" onClick={() => setSlipFile(null)} className="text-slate-400 hover:bg-white hover:text-rose-500 shrink-0 rounded-full h-8 w-8">
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
              <CardFooter className="bg-slate-50 pt-6 rounded-b-xl border-t border-slate-100">
                <Button type="submit" className="w-full h-14 text-lg bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-200 rounded-xl transition-all hover:scale-[1.01]" disabled={isSubmitting || !slipFile || isLoadingPaymentInfo || !promptpayId}>
                  {isSubmitting ? (
                    <><Loader2 className="animate-spin h-5 w-5 mr-2" /> กำลังตรวจสอบสลิปอัตโนมัติ...</>
                  ) : (
                    <><Send className="mr-2 h-5 w-5" /> ยืนยันการชำระเงิน</>
                  )}
                </Button>
              </CardFooter>
            </Card>
          </form>
        </div>
      </div>

      {/* 🌟 เพิ่ม Modal แจ้งเตือนข้อผิดพลาดกลางหน้าจอ */}
      <Dialog open={errorModalOpen} onOpenChange={setErrorModalOpen}>
        <DialogContent className="sm:max-w-md border-rose-100">
          <DialogHeader className="flex flex-col items-center pt-2">
            <div className="mx-auto w-12 h-12 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mb-4">
              <CircleAlert className="h-6 w-6" />
            </div>
            <DialogTitle className="text-xl font-bold text-rose-600 text-center">
              ตรวจสอบสลิปไม่สำเร็จ
            </DialogTitle>
            <DialogDescription className="whitespace-pre-wrap break-words text-base pt-3 text-center text-slate-600">
              {errorMessage}
            </DialogDescription>
          </DialogHeader>

          <div className="flex justify-center pt-2">
            <Button
              type="button"
              variant="outline"
              className="w-full sm:w-auto min-w-[120px]"
              onClick={() => setErrorModalOpen(false)}
            >
              ปิด
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
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