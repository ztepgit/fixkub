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
import { Smartphone, Wrench, QrCode, Clock, ArrowRight, CheckCircle2, Zap, LogIn, LayoutDashboard, LogOut, Store, PlusCircle } from "lucide-react"

import { checkUserHasShop, getUserShops } from "@/actions/shop"
import { useShopStore } from "@/store/useShopStore" // 🌟 Import Store เพื่ออัปเดตร้านตอนเข้า Dashboard

export default function LandingPage() {
  const router = useRouter()
  const { toast } = useToast() 
  const updateShop = useShopStore((s) => s.updateShop) // ดึงฟังก์ชันอัปเดต Store
  
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [showLoginPopup, setShowLoginPopup] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null)

  const [showShopSelectPopup, setShowShopSelectPopup] = useState(false)
  const [userShops, setUserShops] = useState<any[]>([])
  const [selectedShopId, setSelectedShopId] = useState<string>("")

  // 🌟 เพิ่ม State บอกว่า Popup เปิดมาเพื่ออะไร
  const [shopSelectAction, setShopSelectAction] = useState<"checkout" | "dashboard">("checkout")

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
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
        router.push('/dashboard')
        return
      }
      
      router.push(`/onboarding?plan=${plan}`)
      return
    }

    if (userEmail && (plan === "monthly" || plan === "yearly")) {
      const res = await getUserShops(userEmail)
      
      if (res.success && res.shops.length > 0) {
        setShopSelectAction("checkout") // 🌟 ระบุว่าเป็น Popup จ่ายเงิน
        setUserShops(res.shops)
        setSelectedShopId(res.shops[0].id) 
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

  // 🌟 ฟังก์ชันทำงานตอนกดยืนยันใน Popup เลือกร้าน
  const handleConfirmShopSelection = () => {
    if (shopSelectAction === "dashboard") {
      // Flow เข้า Dashboard
      if (selectedShopId === "new_shop") {
        // อยากเปิดร้านใหม่ ให้เลื่อนจอไปหาแพ็กเกจ
        document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" });
      } else {
        // เลือกร้านเสร็จ ให้ระบบจำร้านที่เลือก แล้วเข้า Dashboard
        const selectedShop = userShops.find(s => s.id === selectedShopId)
        if (selectedShop) {
          updateShop(selectedShop)
        }
        router.push('/dashboard')
      }
    } else {
      // Flow จ่ายเงินต่ออายุ (checkout)
      if (selectedShopId === "new_shop") {
        router.push(`/onboarding?plan=${selectedPlan}`)
      } else {
        router.push(`/checkout?shopId=${selectedShopId}&plan=${selectedPlan}`)
      }
    }
    setShowShopSelectPopup(false)
  }

  // 🌟 ฟังก์ชันเข้า Dashboard (ปรับให้รองรับหลายร้าน)
  const handleGoToDashboard = async () => {
    if (!userEmail) return;
    
    // ใช้ getUserShops เพื่อดึงร้านมานับจำนวน
    const res = await getUserShops(userEmail);
    
    if (res.success && res.shops && res.shops.length > 1) {
      // มี > 1 ร้าน เปิด Popup ให้เลือกเข้า
      setShopSelectAction("dashboard");
      setUserShops(res.shops);
      setSelectedShopId(res.shops[0].id);
      setShowShopSelectPopup(true);

    } else if (res.success && res.shops && res.shops.length === 1) {
      // มี 1 ร้าน เข้า Dashboard ทันที
      updateShop(res.shops[0]); // จำค่าร้านเข้าระบบไว้ด้วย
      router.push('/dashboard');

    } else {
      // มี 0 ร้าน แจ้งเตือน
      toast({
        title: "คุณยังไม่มีร้านค้า",
        description: "กรุณาเลือกแพ็กเกจเพื่อเปิดร้านค้าก่อนเข้าใช้งานระบบ",
        variant: "destructive",
      });
      document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" });
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setIsLoggedIn(false)
    setUserEmail(null) 
    router.refresh() 
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans">

      <header className="sticky top-0 z-50 w-full border-b bg-white/80 backdrop-blur-md">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white">
              <Wrench className="h-5 w-5" />
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-900">ESYQ <span className="text-emerald-600">Repair</span></span>
          </div>
          <nav className="hidden md:flex gap-6">
            <Link href="#features" className="text-sm font-medium text-slate-600 hover:text-emerald-600">ฟีเจอร์เด่น</Link>
            <Link href="#pricing" className="text-sm font-medium text-slate-600 hover:text-emerald-600">ราคา</Link>
          </nav>
          
          <div className="flex items-center gap-3">
            {!isLoggedIn ? (
              <Link href="/login">
                <Button variant="outline" className="hidden md:inline-flex border-emerald-200 text-emerald-700 hover:bg-emerald-50">
                  เข้าสู่ระบบร้านค้า
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
        {/* Hero Section */}
        <section className="relative overflow-hidden bg-white pt-20 pb-24 lg:pt-32 lg:pb-40">
          <div className="container mx-auto px-4 md:px-6 text-center">
            <Badge className="mb-4 bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-none px-3 py-1 text-sm">
              ✨ ระบบจัดการคิวร้านซ่อมมือถือ อันดับ 1
            </Badge>
            <h1 className="mx-auto max-w-4xl text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl md:text-6xl lg:text-7xl">
              บอกลาบิลกระดาษ <br className="hidden sm:block" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-500">
                ให้ลูกค้าติดตามสถานะซ่อมได้เอง
              </span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-600 md:text-xl">
              จบปัญหาลูกค้าทักแชทถาม "พี่ซ่อมถึงไหนแล้ว?" ด้วยระบบคิวอัจฉริยะ
              รับเครื่องง่าย จัดการคิวเป็นระบบ ดูยอดรายได้ชัดเจนผ่านมือถือเครื่องเดียว
            </p>
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button 
                size="lg" 
                onClick={() => handleSelectPlan("free")}
                className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-lg h-14 px-8 shadow-lg shadow-emerald-200"
              >
                ทดลองใช้ฟรี 14 วัน <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button size="lg" variant="outline" className="w-full sm:w-auto h-14 px-8 text-slate-600 border-slate-300">
                ดูวิดีโอสาธิตการใช้งาน
              </Button>
            </div>
            <p className="mt-4 text-sm text-slate-500">ไม่ต้องใช้บัตรเครดิต • ยกเลิกได้ตลอดเวลา</p>
          </div>
        </section>

        {/* Features Section */}
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
                  <p className="text-slate-600">ช่างเห็นภาพรวมทั้งหมดว่าเครื่องไหนรอแกะ เครื่องไหนรออะไหล่ เปลี่ยนสถานะง่ายๆ แค่คลิกเดียว</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section id="pricing" className="py-20 bg-white">
          <div className="container mx-auto px-4 md:px-6">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold text-slate-900 md:text-4xl">ราคาคุ้มค่า คืนทุนตั้งแต่บิลแรก</h2>
              <p className="mt-4 text-lg text-slate-600">ไม่มีเก็บเปอร์เซ็นต์ (GP) จ่ายราคาเดียวจบ</p>
            </div>

            <div className="mx-auto grid max-w-4xl gap-8 md:grid-cols-2">

              {/* แพ็กเกจรายเดือน */}
              <Card className="border-slate-200 shadow-sm">
                <CardContent className="p-8">
                  <h3 className="text-2xl font-bold text-slate-900">รายเดือน</h3>
                  <p className="text-slate-500 mt-2">เหมาะสำหรับร้านเปิดใหม่</p>
                  <div className="my-6 flex items-baseline gap-2">
                    <span className="text-4xl font-extrabold text-slate-900">฿199</span>
                    <span className="text-slate-500">/ เดือน</span>
                  </div>
                  <ul className="space-y-3 mb-8">
                    {["สร้างบิลซ่อมไม่จำกัด", "กระดานคิวอัจฉริยะ", "รองรับ 1 สาขา", "หน้าเช็คสถานะสำหรับลูกค้า"].map((item, i) => (
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

              {/* แพ็กเกจรายปี */}
              <Card className="border-emerald-500 shadow-xl shadow-emerald-100 relative">
                <div className="absolute top-0 right-0 transform translate-x-2 -translate-y-4">
                  <Badge className="bg-gradient-to-r from-orange-400 to-red-500 hover:from-orange-500 text-white border-none px-3 py-1.5 text-sm uppercase font-black shadow-md">
                    คุ้มที่สุด ประหยัด 698.-
                  </Badge>
                </div>
                <CardContent className="p-8">
                  <div className="flex items-center justify-between">
                    <h3 className="text-2xl font-bold text-emerald-700">รายปี (ยอดฮิต)</h3>
                    <Zap className="h-6 w-6 text-orange-400 fill-orange-400" />
                  </div>
                  <p className="text-slate-500 mt-2">ประหยัดกว่า จ่ายครั้งเดียวใช้ยาวๆ</p>
                  <div className="my-6 flex items-baseline gap-2">
                    <span className="text-4xl font-extrabold text-slate-900">฿1,690</span>
                    <span className="text-slate-500">/ ปี</span>
                  </div>
                  <ul className="space-y-3 mb-8">
                    {["ทุกอย่างในแพ็กเกจรายเดือน", "ป้าย QR Code ตั้งโต๊ะ (ไฟล์ PDF)", "ฟรี อัปเดตฟีเจอร์ใหม่ตลอดปี", "ซัพพอร์ตด่วน (Priority)"].map((item, i) => (
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

      {/* Footer */}
      <footer className="bg-slate-900 py-12 text-slate-400">
        <div className="container mx-auto px-4 md:px-6 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Wrench className="h-6 w-6 text-emerald-500" />
            <span className="text-2xl font-bold text-white">ESYQ <span className="text-emerald-500">Repair</span></span>
          </div>
          <p className="mb-6">ระบบจัดการร้านซ่อมมือถือ ที่เข้าใจคุณที่สุด</p>
          <p className="text-sm">© 2026 ESYQ. All rights reserved.</p>
        </div>
      </footer>

      {/* Popup เข้าสู่ระบบ */}
      <Dialog open={showLoginPopup} onOpenChange={setShowLoginPopup}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="mx-auto w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-4">
              <LogIn className="h-6 w-6" />
            </div>
            <DialogTitle className="text-center text-xl">กรุณาเข้าสู่ระบบ</DialogTitle>
            <DialogDescription className="text-center text-base pt-2">
              ระบบต้องการให้ท่านเข้าสู่ระบบก่อน{selectedPlan === "free" ? "เริ่มต้นทดลองใช้" : "ชำระเงิน"}<br/>เพื่อเชื่อมโยงแพ็กเกจเข้ากับข้อมูลร้านค้าของท่านได้อย่างถูกต้อง
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

      {/* Popup เลือกร้าน (จ่ายเงิน หรือ เข้า Dashboard) */}
      <Dialog open={showShopSelectPopup} onOpenChange={setShowShopSelectPopup}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            {/* 🌟 ปรับเปลี่ยน Title และ Description ตาม Action */}
            <DialogTitle className="text-xl">
              {shopSelectAction === "dashboard" ? "เลือกร้านค้าที่ต้องการจัดการ" : "เลือกร้านค้าที่ต้องการชำระเงิน"}
            </DialogTitle>
            <DialogDescription>
              {shopSelectAction === "dashboard"
                ? "ระบบพบว่าท่านมีร้านค้าหลายสาขา กรุณาเลือกร้านค้าที่ต้องการเข้าสู่หน้าจัดการ"
                : `ระบบพบว่าท่านมีร้านค้าในระบบอยู่แล้ว กรุณาเลือกว่าต้องการซื้อแพ็กเกจ ${selectedPlan === "yearly" ? "รายปี" : "รายเดือน"} ให้กับร้านใด`
              }
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <RadioGroup value={selectedShopId} onValueChange={setSelectedShopId} className="space-y-3">
              {userShops.map((shop) => (
                <div key={shop.id}>
                  <RadioGroupItem value={shop.id} id={shop.id} className="peer sr-only" />
                  <Label 
                    htmlFor={shop.id} 
                    className="flex items-center p-4 border-2 rounded-xl cursor-pointer peer-data-[state=checked]:border-emerald-500 peer-data-[state=checked]:bg-emerald-50 hover:bg-slate-50 transition-all"
                  >
                    <Store className="h-5 w-5 text-slate-500 mr-3 peer-data-[state=checked]:text-emerald-600" />
                    <div className="flex-1">
                      <p className="font-bold text-slate-900 text-base">{shop.name}</p>
                      <p className="text-xs text-slate-500">URL: {shop.slug}.esyq.net</p>
                    </div>
                  </Label>
                </div>
              ))}
              
              {/* Option สร้างร้านใหม่ */}
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
            </RadioGroup>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button type="button" variant="outline" onClick={() => setShowShopSelectPopup(false)} className="w-full">ยกเลิก</Button>
            <Button type="button" onClick={handleConfirmShopSelection} className="w-full bg-emerald-600 hover:bg-emerald-700">ยืนยัน</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  )
}