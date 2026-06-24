// app/checkout/page.tsx
"use client"

import { useState, Suspense, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { CheckCircle2, ArrowLeft, ShieldCheck, HelpCircle, Loader2, Store, Globe, CreditCard } from "lucide-react"

// 🌟 Import UI สำหรับทำ Modal (Dialog)
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"

import { getShopById } from "@/actions/shop"
import { checkShopStatus } from "@/actions/shop-status"
import { createStripeCheckoutSession } from "@/actions/stripe" // 🌟 Import Stripe Action
import { PlanType } from "@prisma/client" // 🌟 Import PlanType
import { Badge } from "@/components/ui/badge"

// 🌟 Reusable Helper: Map Query String to PlanType
function getPlanTypeFromQuery(plan: string): PlanType {
  switch (plan) {
    case "monthly":
      return PlanType.BASIC_MONTHLY

    case "yearly":
      return PlanType.BASIC_YEARLY

    default:
      throw new Error("Invalid plan")
  }
}

function CheckoutForm() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const plan = searchParams.get("plan") || "yearly"
  const shopId = searchParams.get("shopId")

  const { toast } = useToast()

  const [isStripeLoading, setIsStripeLoading] = useState(false) // 🌟 Stripe loading state
  const [isSuccess, setIsSuccess] = useState(false) // Code เก่า ตอนนี้ใช้ Stripe redirect flow แทน
  const [shopInfo, setShopInfo] = useState<{
    name: string
    url: string
    slug: string
  } | null>(null)

  const [isLoadingShop, setIsLoadingShop] = useState(true)

  const [isExpired, setIsExpired] = useState(false)

  // 🌟 State สำหรับคุม Modal แจ้งเตือนข้อผิดพลาด
  const [errorModalOpen, setErrorModalOpen] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")

  //เทส1บาท
  const packageDetails = plan === "monthly" ? {
    title: "แพ็กเกจรายเดือน",
    price: 299,
    priceText: "฿299.00",
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
      if (shopId) {
        try {
          const shopRes = await getShopById(shopId)
          if (shopRes.success && shopRes.data) {
            setShopInfo({
              name: shopRes.data.name,
              url: `${window.location.origin}/${shopRes.data.slug}`,
              slug: shopRes.data.slug
            })
          }

          const statusRes = await checkShopStatus(shopId)
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

  const shopUrl = shopInfo?.slug
    ? `https://${shopInfo.slug}.getfixx.net`
    : ""

  // 🌟 Stripe Checkout Handler
  const handleStripeCheckout = async () => {
    if (!shopId) return
    setIsStripeLoading(true)

    try {
      const planEnum = getPlanTypeFromQuery(plan)
      const result = await createStripeCheckoutSession(shopId, planEnum)

      if (result.success && result.url) {
        window.location.href = result.url // 🌟 Redirect immediately
      } else {
        setErrorMessage(result.error || "ไม่สามารถสร้างรายการชำระเงินได้")
        setErrorModalOpen(true)
        setIsStripeLoading(false)
      }
    } catch (error: any) {
      setErrorMessage(error.message || "เกิดข้อผิดพลาดในการเชื่อมต่อระบบชำระเงิน")
      setErrorModalOpen(true)
      setIsStripeLoading(false)
    }
  }

  // 🌟 (Existing success UI remains intact, but trigger might change depending on webhook return flow)
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

        {/* คอลัมน์ซ้าย: สรุปคำสั่งซื้อ (Unchanged) */}
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
                    {shopUrl && (
                      <div className="flex items-center gap-2 text-sm text-blue-600 mt-1 pl-7">
                        <Globe className="h-4 w-4 shrink-0" />
                        <a href={shopUrl} target="_blank" rel="noopener noreferrer" className="hover:underline truncate">
                          {shopUrl.replace(/^https?:\/\//, '')}
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
              <ShieldCheck className="h-4 w-4 mr-1 text-emerald-600" /> ระบบต่ออายุและคำนวณส่วนลดอัตโนมัติ
            </CardFooter>
          </Card>

          <div className="text-center text-sm text-slate-500 flex items-center justify-center gap-2">
            <HelpCircle className="h-4 w-4" /> มีปัญหาการชำระเงิน? <Link href="https://m.me/pik.jaturachai"
              target="_blank"
              rel="noopener noreferrer" className="text-emerald-600 font-medium hover:underline">ติดต่อแอดมิน</Link>
          </div>
        </div>

        {/* คอลัมน์ขวา: ฟอร์มชำระเงิน (🌟 Replaced with Stripe Card) */}
        <div className="md:col-span-3">
          <Card className="border-slate-200 shadow-md">
            <CardHeader>
              <CardTitle className="text-xl">ชำระเงิน (ใช้ได้ทั้งบัตร และ PromptPay)</CardTitle>
              <CardDescription>ดำเนินการชำระเงินผ่าน Stripe Checkout</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">

              <div className="space-y-6 animate-in fade-in duration-300">
                <div className="bg-slate-50/80 p-8 rounded-2xl border border-slate-200 flex flex-col items-center text-center justify-center space-y-4 min-h-[300px]">
                  <div className="h-16 w-16 bg-[#635BFF]/10 rounded-full flex items-center justify-center mb-2">
                    <CreditCard className="h-8 w-8 text-[#635BFF]" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-800">คุณจะถูกนำไปยังหน้าชำระเงินของ Stripe</h3>
                    <p className="text-sm text-slate-500 mt-2 max-w-sm mx-auto leading-relaxed">
                      ระบบชำระเงินมีความปลอดภัยสูงสุดและไม่เก็บข้อมูลบัตรเครดิตของคุณไว้ในระบบของเรา
                    </p>
                  </div>

                  <div className="w-full max-w-xs bg-white p-4 rounded-xl border border-slate-200 space-y-3 relative overflow-hidden mt-4 text-left">
                    <div className="absolute top-0 left-0 w-full h-1.5 bg-[#635BFF]"></div>
                    <div className="flex justify-between items-center">
                      <p className="text-xs text-slate-500 font-bold uppercase tracking-wide">แพ็กเกจ</p>
                      <Badge variant="outline" className="text-[10px] text-[#635BFF] border-[#635BFF]/30 bg-[#635BFF]/5">{packageDetails.period}</Badge>
                    </div>
                    <p className="font-bold text-slate-800 text-sm truncate">{packageDetails.title}</p>
                    <div className="flex justify-between items-end pt-2 border-t border-slate-100">
                      <span className="text-xs font-medium text-slate-500">ยอดชำระสุทธิ</span>
                      <span className="text-xl font-black text-[#635BFF]">{packageDetails.priceText}</span>
                    </div>
                  </div>
                </div>
              </div>

            </CardContent>
            <CardFooter className="bg-slate-50 pt-6 rounded-b-xl border-t border-slate-100 flex flex-col gap-3">
              <Button
                type="button"
                onClick={handleStripeCheckout}
                className="w-full h-14 text-lg bg-[#635BFF] hover:bg-[#635BFF]/90 shadow-lg shadow-[#635BFF]/30 rounded-xl transition-all hover:scale-[1.01]"
                disabled={isStripeLoading || isLoadingShop}
              >
                {isStripeLoading ? (
                  <><Loader2 className="animate-spin h-5 w-5 mr-2" /> กำลังเชื่อมต่อ Stripe...</>
                ) : (
                  <><CreditCard className="mr-2 h-5 w-5" /> ชำระเงินด้วย Stripe</>
                )}
              </Button>
              <div className="flex items-center justify-center gap-1.5 text-xs font-medium text-slate-400 w-full">
                <ShieldCheck className="h-3.5 w-3.5" /> Secured by Stripe
              </div>
            </CardFooter>
          </Card>
        </div>
      </div>

      {/* 🌟 Modal แจ้งเตือนข้อผิดพลาดกลางหน้าจอ */}
      <Dialog open={errorModalOpen} onOpenChange={setErrorModalOpen}>
        <DialogContent className="sm:max-w-md border-rose-100">
          <DialogHeader className="flex flex-col items-center pt-2">
            <div className="mx-auto w-12 h-12 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mb-4">
              <ShieldCheck className="h-6 w-6" /> {/* Reused ShieldCheck as general icon since CircleAlert wasn't in original import list and I can't add it */}
            </div>
            <DialogTitle className="text-xl font-bold text-rose-600 text-center">
              ไม่สามารถดำเนินการชำระเงินได้
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