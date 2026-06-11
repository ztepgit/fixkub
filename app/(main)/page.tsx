//app/(main)/page.tsx
"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { supabase } from "@/lib/supabase"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Smartphone, Wrench, QrCode, Clock, ArrowRight, CheckCircle2, Zap, LogIn, LayoutDashboard, LogOut, Store, PlusCircle, Loader2, Play } from "lucide-react"
import { checkUserHasShop, getUserShops } from "@/actions/shop"
import { createDemoShopAction } from "@/actions/demo"
import { useShopStore } from "@/store/useShopStore"
import Autoplay from "embla-carousel-autoplay" // 🌟 เพิ่มบรรทัดนี้เพื่อทำ Auto Slide
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious, CarouselDots } from "@/components/ui/carousel"
import { getCarouselItems } from "@/actions/carousel"
import { Footer } from "@/components/footer"
import { HowToTry } from "@/components/how-to-try"


export default function LandingPage() {
  const router = useRouter()
  const { toast } = useToast()
  const updateShop = useShopStore((s) => s.updateShop)

  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [showLoginPopup, setShowLoginPopup] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null)

  const [showShopSelectPopup, setShowShopSelectPopup] = useState(false)
  const [userShops, setUserShops] = useState<any[]>([])
  const [selectedShopId, setSelectedShopId] = useState<string>("")

  const [shopSelectAction, setShopSelectAction] = useState<"checkout" | "dashboard">("checkout")
  const [isDemoLoading, setIsDemoLoading] = useState(false)

  // 🌟 เพิ่ม flag กันยิงซ้ำ (Context Selection Problem Guard)

  const [banners, setBanners] = useState<any[]>([])
  const [showPendingPaymentModal, setShowPendingPaymentModal] = useState(false)
  const [pendingPaymentShopId, setPendingPaymentShopId] = useState<string | null>(null)

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      console.log("SESSION", session)
      setIsLoggedIn(!!session)
      if (session?.user?.email) {
        setUserEmail(session.user.email)
      }
    }
    checkUser()

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      setIsLoggedIn(!!session)
      setUserEmail(session?.user?.email || null)
    })

    return () => {
      authListener.subscription.unsubscribe()
    }
  }, [])



  // 🌟 ฟังก์ชันการเลือกแพ็กเกจ
  const handleSelectPlan = async (plan: string) => {
    if (!isLoggedIn) {
      setSelectedPlan(plan)
      setShowLoginPopup(true)
      return
    }

    setSelectedPlan(plan)

    if (plan === "free" && userEmail) {
      const res = await checkUserHasShop(userEmail)

      if (res.hasShop) {
        toast({
          title: "ไม่สามารถรับสิทธิ์ได้",
          description: "ขออภัย การทดลองใช้งานสำหรับผู้ใช้เปิดร้านครั้งแรกเท่านั้น",
          variant: "destructive",
        })
        return
      }

      router.push(`/onboarding?plan=${plan}`)
      return
    }

    if (userEmail && (plan === "monthly" || plan === "yearly")) {
      const res = await getUserShops(userEmail)

      if (res.success && res.shops.length > 0) {
        setShopSelectAction("checkout")
        setUserShops(res.shops);
        setSelectedShopId(res.shops[0]?.id || "");
        setShowShopSelectPopup(true)
        return
      } else {
        toast({
          title: "🎉 ยินดีด้วย!",
          description: "เนื่องจากเป็นการเปิดร้านครั้งแรก ระบบจะบวกวันทดลองใช้ฟรี 30 วันให้ท่านโดยอัตโนมัติ",
        })
        router.push(`/onboarding?plan=${plan}`)
        return
      }
    }

    router.push(`/onboarding?plan=${plan}`)
  }

  const handleContinueToLogin = () => {
    router.push(`/login?next=/onboarding?plan=${selectedPlan}`)
  }

  const handleConfirmShopSelection = () => {
    if (shopSelectAction === "dashboard") {
      if (selectedShopId === "new_shop") {
        router.push(`/onboarding`)
      } else {
        const selectedShop = userShops.find(
          s => String(s.id) === String(selectedShopId)
        )

        if (selectedShop?.planType === "PENDING_PAYMENT") {
          setPendingPaymentShopId(selectedShop.id)
          setShowPendingPaymentModal(true)
          return
        }

        if (selectedShop) {
          updateShop(selectedShop)
          router.push(`/dashboard?shopId=${selectedShop.id}`)
        }
      }
    } else {
      if (selectedShopId === "new_shop") {
        router.push(`/onboarding?plan=${selectedPlan}`)
      } else {
        router.push(`/checkout?shopId=${selectedShopId}&plan=${selectedPlan}`)
      }
    }

    setShowShopSelectPopup(false)
  }

  const handleGoToDashboard = async () => {
    if (!userEmail) return;

    const res = await getUserShops(userEmail);

    if (res.success) {
      setShopSelectAction("dashboard");
      setUserShops(res.shops || []);
      setSelectedShopId(res.shops?.[0]?.id || "new_shop");
      setShowShopSelectPopup(true);
    } else {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถดึงข้อมูลร้านค้าได้ กรุณาลองใหม่อีกครั้ง",
        variant: "destructive",
      });
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setIsLoggedIn(false)
    setUserEmail(null)

    router.refresh()
  }

  const handlePlayDemo = async () => {
    setIsDemoLoading(true)
    try {
      const res = await createDemoShopAction()

      if (res.success && res.credentials && res.shop) {
        const { error: loginError } = await supabase.auth.signInWithPassword({
          email: res.credentials.email,
          password: res.credentials.password,
        })

        if (loginError) {
          throw new Error("ล็อกอินเข้าร้านตัวอย่างไม่สำเร็จ: " + loginError.message)
        }

        updateShop(res.shop)
        router.push(`/dashboard?shopId=${res.shop.id}`) // 🌟 เผื่อไว้ ส่ง id ผ่าน url ด้วย
      } else {
        throw new Error(res.error || "Failed to create demo shop")
      }
    } catch (error: any) {
      console.error("Demo Error:", error);
      toast({ title: "ไม่สามารถสร้างร้านตัวอย่างได้", description: error.message, variant: "destructive" })
    } finally {
      setIsDemoLoading(false)
    }
  }

  useEffect(() => {
    const fetchBanners = async () => {
      // 🌟 ดึงมาเฉพาะที่ isActive = true
      const res = await getCarouselItems(true)
      if (res.success && res.data) {
        setBanners(res.data)
      }
    }
    fetchBanners()
  }, [])

  return (
    <div className="min-h-screen bg-slate-50 font-sans">

      <header className="sticky top-0 z-50 w-full border-b bg-white/80 backdrop-blur-md">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white">
              <Wrench className="h-5 w-5" />
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-900">getfixx <span className="text-emerald-600">Repair</span></span>
          </div>
          <nav className="hidden md:flex gap-6">
            <Link href="#features" className="text-sm font-medium text-slate-600 hover:text-emerald-600">ฟีเจอร์เด่น</Link>
            <Link href="#pricing" className="text-sm font-medium text-slate-600 hover:text-emerald-600">ราคา</Link>
          </nav>

          <div className="flex items-center gap-3">
            {!isLoggedIn ? (
              <Link href="/login">
                <Button variant="outline" className="hidden md:inline-flex border-emerald-200 text-emerald-700 hover:bg-emerald-50">
                  เข้าสู่ระบบ
                </Button>
              </Link>
            ) : (
              <>
                <Button
                  onClick={handleGoToDashboard}
                  className="hidden md:inline-flex bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
                >
                  <LayoutDashboard className="w-4 h-4 mr-2" /> หน้าจัดการร้านค้า
                </Button>
                <Button
                  onClick={handleLogout}
                  variant="ghost"
                  className="hidden md:inline-flex text-slate-500 hover:text-rose-600 hover:bg-rose-50"
                >
                  <LogOut className="w-4 h-4 mr-2" /> ออกจากระบบ
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden bg-white pt-20 pb-24 lg:pt-32 lg:pb-40">
          <div className="container mx-auto px-4 md:px-6 text-center">
            <Badge className="mb-4 bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-none px-3 py-1 text-sm">
              ยินดีต้อนรับ
            </Badge>
            <h1 className="mx-auto max-w-4xl text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl md:text-6xl lg:text-7xl">
              บอกลาคิวกระดาษ <br className="hidden sm:block" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-500">
                มาใช้ระบบออนไลน์100%
              </span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-600 md:text-xl">
              จบปัญหาลูกค้าทักแชทถาม "พี่ซ่อมถึงไหนแล้ว?" ด้วยระบบคิวอัจฉริยะ
              รับเครื่องง่าย จัดการคิวเป็นระบบ ดูยอดรายได้ชัดเจนผ่านมือถือเครื่องเดียว
            </p>
            <div className="flex flex-col mt-2 sm:flex-row items-center justify-center gap-4 w-full">

              <Button
                size="lg"
                onClick={handlePlayDemo}
                disabled={isDemoLoading}
                className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-lg h-14 px-8 shadow-lg shadow-emerald-200 transition-all"
              >
                {isDemoLoading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    <span>กำลังสร้างร้านตัวอย่าง...</span>
                  </>
                ) : (
                  <>
                    <Play className="mr-2 h-5 w-5 fill-current" />
                    <span>เล่นร้านตัวอย่าง</span>
                  </>
                )}
              </Button>

              <Button
                size="lg"
                variant="outline"
                onClick={() => handleSelectPlan("free")}
                className="w-full sm:w-auto border-emerald-600 text-emerald-700 hover:bg-emerald-50 text-lg h-14 px-8 shadow-sm transition-all"
              >
                ทดลองใช้ฟรี 14วัน <ArrowRight className="ml-2 h-5 w-5" />
              </Button>

            </div>
            <p className="mt-4 text-sm text-slate-500">ไม่ต้องใช้บัตรเครดิต • ยกเลิกได้ตลอดเวลา</p>
            <p className="mt-4 text-sm text-slate-500">🧧 โปรโมชั่น: สมัครวันนี้ (ไม่ทดลองใช้ฟรี 14วัน) แถมฟรี 30วัน (เล่นร้านตัวอย่างได้)<Link href="#pricing" className="text-emerald-600 hover:underline"> ดูเลย!</Link></p>
            {banners.length > 0 && (
              <div className="w-full max-w-5xl mx-auto mt-16 px-4 relative z-10">
                <Carousel
                  plugins={[
                    Autoplay({
                      delay: 4000,
                    }),
                  ]}
                  opts={{
                    loop: true,
                  }}
                >
                  <CarouselContent>
                    {banners.map((banner) => {

                      // 🌟 ฟังก์ชันเช็คว่าเป็นลิงก์ภายนอกหรือไม่ (ขึ้นต้นด้วย http/https)
                      const isExternalLink = banner.link?.startsWith('http');

                      return (
                        <CarouselItem key={banner.id}>
                          <div className="p-1">
                            <Card className="border-none shadow-lg overflow-hidden rounded-2xl">
                              <CardContent className="p-0 aspect-[21/9] relative group bg-slate-100 flex items-center justify-center">

                                {/* กรณีมีลิงก์ */}
                                {banner.link ? (
                                  isExternalLink ? (
                                    // 🔗 ใช้ <a> สำหรับลิงก์ภายนอก
                                    <a href={banner.link} target="_blank" rel="noopener noreferrer" className="w-full h-full block relative">
                                      <img src={banner.imageUrl} alt={banner.title || "Banner"} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                                      <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition-colors duration-500"></div>
                                    </a>
                                  ) : (
                                    // 🔗 ใช้ <Link> สำหรับลิงก์ภายในแอป
                                    <Link href={banner.link} className="w-full h-full block relative">
                                      <img src={banner.imageUrl} alt={banner.title || "Banner"} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                                      <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition-colors duration-500"></div>
                                    </Link>
                                  )
                                ) : (
                                  // 🖼️ กรณีไม่มีลิงก์ ให้แสดงรูปเฉยๆ
                                  <div className="w-full h-full relative">
                                    <img src={banner.imageUrl} alt={banner.title || "Banner"} className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-black/10"></div>
                                  </div>
                                )}

                              </CardContent>
                            </Card>
                          </div>
                        </CarouselItem>
                      );
                    })}
                  </CarouselContent>
                  <CarouselPrevious className="hidden md:flex -left-4 bg-white/80 hover:bg-white border-none shadow-md" />
                  <CarouselNext className="hidden md:flex -right-4 bg-white/80 hover:bg-white border-none shadow-md" />
                  <CarouselDots className="mt-4 mx-auto" />
                </Carousel>
              </div>
            )}
          </div>
        </section>

        <HowToTry />
        <div className="flex flex-col mt-2 sm:flex-row items-center justify-center gap-4 w-full">
          <Button
            size="lg"
            onClick={handlePlayDemo}
            disabled={isDemoLoading}
            className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-lg h-14 px-8 shadow-lg shadow-emerald-200 transition-all"
          >
            {isDemoLoading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                <span>กำลังสร้างร้านตัวอย่าง...</span>
              </>
            ) : (
              <>
                <Play className="mr-2 h-5 w-5 fill-current" />
                <span>เล่นร้านตัวอย่าง</span>
              </>
            )}
          </Button>
        </div>

        <section id="features" className="py-20 bg-slate-50">
          <div className="container mx-auto px-4 md:px-6">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold text-slate-900 md:text-4xl">ทำไมร้านซ่อมมือถือยุคใหม่ ถึงเลือกเรา?</h2>
              <p className="mt-4 text-lg text-slate-600">ออกแบบมาเพื่อ Workflow ของช่างซ่อมโดยเฉพาะ ไม่ซับซ้อน ใช้งานง่าย</p>
            </div>

            <div className="grid gap-8 md:grid-cols-3">
              <Card className="border-none shadow-md">
                <CardContent className="pt-6">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
                    <QrCode className="h-6 w-6" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2">ลูกค้าสแกน QR แจ้งซ่อมเอง</h3>
                  <p className="text-slate-600">ลดภาระช่าง ไม่ต้องนั่งจดรายละเอียด ลูกค้ากรอกรุ่นมือถือ สี และอาการเสียผ่านฟอร์มได้เลย</p>
                </CardContent>
              </Card>

              <Card className="border-none shadow-md">
                <CardContent className="pt-6">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
                    <Clock className="h-6 w-6" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2">เช็คสถานะเรียลไทม์</h3>
                  <p className="text-slate-600">ลูกค้าได้ลิงก์เช็คสถานะงานซ่อมของตัวเอง (รอคิว, กำลังซ่อม, รอรับเครื่อง) ลดการโทรตามจิก</p>
                </CardContent>
              </Card>

              <Card className="border-none shadow-md">
                <CardContent className="pt-6">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-orange-100 text-orange-600">
                    <Smartphone className="h-6 w-6" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2">กระดานจัดการคิว (Kanban)</h3>
                  <p className="text-slate-600">ช่างเห็นภาพรวมทั้งหมด ตั้งแต่คิวใหม่ กำลังซ่อม ไปจนถึงรอเก็บเงิน เปลี่ยนสถานะง่ายๆ แค่คลิกเดียว</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        <section id="pricing" className="py-20 bg-white">
          <div className="container mx-auto px-4 md:px-6">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold text-slate-900 md:text-4xl">ราคาคุ้มค่า คืนทุนตั้งแต่บิลแรก</h2>
              <p className="mt-4 text-lg text-slate-600">แถมฟรี 30วัน สำหรับผู้ใช้ใหม่ (ระบบตรวจสอบอัตโนมัติ)</p>
            </div>

            <div className="mx-auto grid max-w-4xl gap-8 md:grid-cols-2">

              <Card className="border-slate-200 shadow-sm">
                <CardContent className="p-8">
                  <h3 className="text-2xl font-bold text-slate-900">รายเดือน</h3>
                  <p className="text-slate-500 mt-2">เหมาะสำหรับร้านเปิดใหม่</p>
                  <div className="my-6 flex items-baseline gap-2">
                    {/* เทส1บาท */}
                    <span className="text-4xl font-extrabold text-slate-900">฿299</span>
                    <span className="text-slate-500">/ เดือน</span>
                  </div>
                  <ul className="space-y-3 mb-8">
                    {["สร้างคิวซ่อมไม่จำกัด", "กระดานคิวอัจฉริยะ", "รายงานรายได้", "หน้าเช็คสถานะสำหรับลูกค้า"].map((item, i) => (
                      <li key={i} className="flex items-center gap-3 text-slate-700">
                        <CheckCircle2 className="h-5 w-5 text-emerald-500" /> {item}
                      </li>
                    ))}
                  </ul>
                  <Button onClick={() => handleSelectPlan("monthly")} className="w-full text-base h-12 bg-blue-600 hover:bg-blue-700">
                    เลือกแพ็กเกจนี้
                  </Button>
                </CardContent>
              </Card>

              <Card className="border-emerald-500 shadow-xl shadow-emerald-100 relative">
                <div className="absolute top-0 right-0 transform translate-x-2 -translate-y-4">
                  <Badge className="bg-gradient-to-r from-orange-400 to-red-500 hover:from-orange-500 text-white border-none px-3 py-1.5 text-sm uppercase font-black shadow-md">
                    คุ้มที่สุด ประหยัด 1,298.-
                  </Badge>
                </div>
                <CardContent className="p-8">
                  <div className="flex items-center justify-between">
                    <h3 className="text-2xl font-bold text-emerald-700">รายปี (แค่เดือนละ 190.83 บาท)</h3>
                    <Zap className="h-6 w-6 text-orange-400 fill-orange-400" />
                  </div>
                  <p className="text-slate-500 mt-2">ประหยัดกว่า จ่ายครั้งเดียวใช้ยาวๆ</p>
                  <div className="my-6 flex items-baseline gap-2">
                    <span className="text-4xl font-extrabold text-slate-900">฿2,290</span>
                    <span className="text-slate-500">/ ปี</span>
                  </div>
                  <ul className="space-y-3 mb-8">
                    {["ทุกอย่างในแพ็กเกจรายเดือน", "ประหยัดกว่าถึง 36%", "ซัพพอร์ตด่วน (Priority)", "เพิ่มสิทธิ์ Lucky Draw"].map((item, i) => (
                      <li key={i} className="flex items-center gap-3 text-slate-700">
                        <CheckCircle2 className="h-5 w-5 text-emerald-500" /> {item}
                      </li>
                    ))}
                  </ul>
                  <Button onClick={() => handleSelectPlan("yearly")} className="w-full text-base h-12 bg-emerald-600 hover:bg-emerald-700">
                    เลือกแพ็กเกจนี้
                  </Button>
                </CardContent>
              </Card>

            </div>
          </div>
        </section>

      </main>

      <Footer />

      <Dialog open={showLoginPopup} onOpenChange={setShowLoginPopup}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="mx-auto w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-4">
              <LogIn className="h-6 w-6" />
            </div>
            <DialogTitle className="text-center text-xl">กรุณาเข้าสู่ระบบ</DialogTitle>
            <DialogDescription className="text-center text-base pt-2">
              ระบบต้องการให้ท่านเข้าสู่ระบบก่อนทำรายการ
            </DialogDescription>
          </DialogHeader>

          {/* 🌟 แก้ไข CSS ของ DialogFooter ตรงนี้ */}
          <DialogFooter className="flex flex-col gap-2 mt-4 sm:flex-col sm:space-x-0">
            <Button type="button" onClick={handleContinueToLogin} className="w-full bg-blue-600 hover:bg-blue-700">
              ไปหน้าเข้าสู่ระบบ
            </Button>
            <Button type="button" variant="outline" onClick={() => setShowLoginPopup(false)} className="w-full">
              ยกเลิก
            </Button>
          </DialogFooter>
          {/* 🌟 จบการแก้ไข */}

        </DialogContent>
      </Dialog>

      <Dialog open={showShopSelectPopup} onOpenChange={setShowShopSelectPopup}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl">
              {shopSelectAction === "dashboard" ? "เลือกร้านค้าที่ต้องการจัดการ" : "เลือกร้านค้าที่ต้องการชำระเงิน"}
            </DialogTitle>
            <DialogDescription>
              {shopSelectAction === "dashboard"
                ? "กรุณาเลือกร้านค้าที่ต้องการจัดการ หรือเลือกสร้างร้านค้าใหม่"
                : `กรุณาเลือกร้านค้าที่ต้องการซื้อแพ็กเกจ`
              }
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 max-h-[60vh] overflow-y-auto">
            <RadioGroup value={selectedShopId} onValueChange={setSelectedShopId} className="space-y-3">
              {userShops.map((shop) => (
                <div key={shop.id}>
                  <RadioGroupItem value={shop.id} id={shop.id} className="peer sr-only" />
                  <Label
                    htmlFor={shop.id}
                    className="flex items-center justify-between p-4 border-2 rounded-xl cursor-pointer peer-data-[state=checked]:border-emerald-500 peer-data-[state=checked]:bg-emerald-50 hover:bg-slate-50 transition-all"
                  >
                    <div className="flex items-center">
                      <Store className="h-5 w-5 text-slate-500 mr-3 peer-data-[state=checked]:text-emerald-600" />
                      <div>
                        <p className="font-bold text-slate-900 text-base">{shop.name}</p>
                        <p className="text-xs text-slate-500">URL: {shop.slug}.getfixx.net</p>
                      </div>
                    </div>
                    <Badge variant="outline" className={shop.role === "OWNER" ? "border-amber-200 text-amber-700 bg-amber-50" : "border-blue-200 text-blue-700 bg-blue-50"}>
                      {shop.role}
                    </Badge>
                  </Label>
                </div>
              ))}

              {/* 🌟 ถ้า User มีร้านอยู่แล้ว Modal จะขึ้นมาให้เลือกร้านที่ต่ออายุ หรือสร้างร้านใหม่ ถ้ายังไม่มีร้านจะพาไปสร้างชื่อร้านเลย */}
              {(shopSelectAction === "dashboard" || userShops.some(s => s.role === "OWNER")) && (
                <div>
                  <RadioGroupItem value="new_shop" id="new_shop" className="peer sr-only" />
                  <Label
                    htmlFor="new_shop"
                    className="flex items-center p-4 border-2 border-dashed rounded-xl cursor-pointer peer-data-[state=checked]:border-blue-500 peer-data-[state=checked]:bg-blue-50 hover:bg-slate-50 transition-all"
                  >
                    <PlusCircle className="h-5 w-5 text-slate-400 mr-3 peer-data-[state=checked]:text-blue-600" />
                    <div className="flex-1">
                      <p className="font-bold text-slate-700 text-base">สร้างร้านค้าใหม่</p>
                      <p className="text-xs text-slate-500">เปิดร้านสาขาใหม่ด้วยอีเมลเดิม</p>
                    </div>
                  </Label>
                </div>
              )}
            </RadioGroup>
          </div>

          <DialogFooter className="flex flex-col gap-2 sm:flex-col sm:space-x-0">
            <Button type="button" onClick={handleConfirmShopSelection} className="w-full bg-emerald-600 hover:bg-emerald-700">
              ยืนยัน
            </Button>
            <Button type="button" variant="outline" onClick={() => setShowShopSelectPopup(false)} className="w-full">
              ยกเลิก
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={showPendingPaymentModal}
        onOpenChange={setShowPendingPaymentModal}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl text-center">
              เข้าสู่กระดานจัดการร้านค้าไม่ได้
            </DialogTitle>

            {/* 🌟 A11y: แนะนำให้มี DialogDescription ไว้สำหรับ Screen Reader ควรอ่านสรุปสั้นๆ (ซ่อนไว้ด้วย sr-only ได้ถ้าไม่ต้องการให้แสดงซ้ำ) */}
            <DialogDescription className="sr-only">
              คุณจำเป็นต้องเลือกแพ็กเกจหรือเริ่มทดลองใช้ฟรีก่อนเข้าสู่กระดานจัดการร้านค้า
            </DialogDescription>
          </DialogHeader>

          {/* 🌟 ย้ายเนื้อหาหลักออกมาอยู่ใน <div> ธรรมดา เพื่อแก้ปัญหาการซ้อนแท็ก <p> ผิดปกติ */}
          <div className="text-center space-y-3 py-2 text-sm text-slate-600">
            <p>
              คุณยังเข้าสู่ <strong>"กระดานจัดการร้านค้า"</strong> ไม่ได้
            </p>

            <p>
              โปรดกดปุ่ม <strong>"ทดลองใช้ฟรี 14 วัน"</strong>{" "}
              หรือเลือกชำระเงินทันที เพื่อรับสิทธิ์
              <strong> ฟรีเพิ่มอีก 30 วัน </strong>
              สำหรับลูกค้าใหม่
            </p>

            {/* 🌟 A11y: ใส่ role="alert" และ aria-live="polite" เพื่อให้ Screen Reader ประกาศเตือนอัตโนมัติ */}
            <div
              role="alert"
              aria-live="polite"
              className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-left text-sm text-amber-800"
            >
              <strong>คำเตือน: </strong>
              หากกดปุ่ม "<strong>ทดลองใช้ฟรี 14 วัน</strong>"
              จะไม่ได้รับวันแถม 30 วัน
              คุณสามารถชำระเงินทันที เพื่อรับวันใช้งานฟรี 30 วัน
            </div>
          </div>

          <DialogFooter className="flex flex-col gap-2 sm:flex-col sm:space-x-0">
            <Button
              className="w-full bg-emerald-600 hover:bg-emerald-700 focus-visible:ring-emerald-500"
              onClick={() => {
                setShowPendingPaymentModal(false)
                setShowShopSelectPopup(false)
                router.push("/#pricing")
              }}
            >
              ชำระเงินทันที
            </Button>

            <Button
              variant="outline"
              className="w-full"
              onClick={() => setShowPendingPaymentModal(false)}
            >
              ยกเลิก
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  )
}