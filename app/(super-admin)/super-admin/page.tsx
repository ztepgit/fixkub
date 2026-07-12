//app/(super-admin)/super-admin/page.tsx

"use client"

import { useEffect, useState, useRef } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"

import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"

// 🌟 Import ไอคอน
import { Store, User, CreditCard, Settings, ShieldAlert, Loader2, Save, CheckCircle2, XCircle, Image as ImageIcon, UploadCloud, Link as LinkIcon, Trash2, GripVertical, Badge } from "lucide-react"

// 🌟 Import ฟังก์ชัน
import { createShopAction, checkSlugAvailability } from "@/actions/super-admin"
import { createShopSchema, type CreateShopInput } from "@/lib/validations/shop"
import { updatePaymentSettings, getSystemSettings } from "@/actions/setting"

// 🌟 Import Server Actions สำหรับ Carousel
import { getCarouselItems, createCarouselItem, updateCarouselItem, deleteCarouselItem, reorderCarouselItems } from "@/actions/carousel"
// เพิ่มบรรทัดนี้ลงไปในกลุ่ม Import ด้านบน
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd"

type CarouselItem = {
  id: string;
  imageUrl: string;
  title: string | null;
  link: string | null;
  isActive: boolean;
  order: number;
}

export default function SuperAdminCreateShopPage() {
  const { toast } = useToast()

  // ==========================================
  // 🏪 State: Create Shop
  // ==========================================
  const [isSubmittingShop, setIsSubmittingShop] = useState(false)
  const [isCheckingSlug, setIsCheckingSlug] = useState(false)
  const [slugStatus, setSlugStatus] = useState<"idle" | "available" | "taken">("idle")

  const form = useForm<CreateShopInput>({
    resolver: zodResolver(createShopSchema),
    defaultValues: {
      name: "", slug: "", logoUrl: "", themeColor: "#10b981", ownerEmail: "",
      planType: "FREE_TRIAL", trialDays: 30, startImmediately: false, agentCode: "", isActive: true,
    }
  })

  const watchPlanType = form.watch("planType")
  const watchName = form.watch("name")
  const watchSlug = form.watch("slug")

  useEffect(() => {
    if (slugStatus !== "idle") setSlugStatus("idle")
  }, [watchSlug])

  useEffect(() => {
    if (watchPlanType === "FREE_TRIAL") form.setValue("startImmediately", false)
  }, [watchPlanType, form])

  useEffect(() => {
    if (watchName && !form.formState.dirtyFields.slug) {
      const generatedSlug = watchName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
      form.setValue("slug", generatedSlug, { shouldValidate: true })
    }
  }, [watchName, form])

  const handleCheckSlug = async () => {
    const currentSlug = form.getValues("slug")
    if (!currentSlug || currentSlug.length < 3) {
      form.setError("slug", { type: "manual", message: "Slug ต้องมีอย่างน้อย 3 ตัวอักษร" })
      return
    }
    

    setIsCheckingSlug(true)
    setSlugStatus("idle")

    const res = await checkSlugAvailability(currentSlug)
   

    if (res.success) {
      if (res.available) {
        setSlugStatus("available")
        form.clearErrors("slug")
      } else {
        setSlugStatus("taken")
        form.setError("slug", { type: "manual", message: "URL นี้มีผู้ใช้งานแล้ว กรุณาเปลี่ยนใหม่" })
      }
    } else {
      toast({ title: "ระบบขัดข้อง", description: "ไม่สามารถเช็ค URL ได้ในขณะนี้", variant: "destructive" })
    }

    setIsCheckingSlug(false)
  }

  const onSubmitShop = async (values: CreateShopInput) => {
    setIsSubmittingShop(true)
    const res = await createShopAction(values)

    if (res.success) {
      toast({ title: "✅ สร้างร้านค้าสำเร็จ", description: `เพิ่มร้าน ${values.name} เข้าระบบเรียบร้อยแล้ว` })
      form.reset()
      setSlugStatus("idle")
    } else {
      if (res.error?.includes("URL") || res.error?.includes("Slug")) {
        form.setError("slug", { type: "manual", message: res.error })
        setSlugStatus("taken")
      } else {
        toast({ title: "❌ เกิดข้อผิดพลาด", description: res.error, variant: "destructive" })
      }
    }
    setIsSubmittingShop(false)
  }

  // ==========================================
  // 💳 State: Payment Settings
  // ==========================================
  const [isSavingPayment, setIsSavingPayment] = useState(false)
  const [promptpayId, setPromptpayId] = useState("")
  const [accountName, setAccountName] = useState("")

  useEffect(() => {
    const fetchSettings = async () => {
      const res = await getSystemSettings()
      if (res.success && res.data) {
        setPromptpayId(res.data.promptpayId || "")
        setAccountName(res.data.accountName || "")
      }
    }
    fetchSettings()
  }, [])

  const handleSavePayment = async () => {
    setIsSavingPayment(true)

    const cleanPromptpay = promptpayId.replace(/[-\s]/g, "")
    const cleanAccountName = accountName.trim()

    setPromptpayId(cleanPromptpay)
    setAccountName(cleanAccountName)

    const res = await updatePaymentSettings(cleanPromptpay, cleanAccountName)

    if (res.success) {
      toast({ title: "✅ บันทึกสำเร็จ", description: "อัปเดตข้อมูลบัญชีรับเงินเรียบร้อยแล้ว" })
    } else {
      toast({ title: "❌ เกิดข้อผิดพลาด", description: res.error, variant: "destructive" })
    }

    setIsSavingPayment(false)
  }

  // ==========================================
  // 🖼️ State: Carousel Management
  // ==========================================
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isUploadingCarousel, setIsUploadingCarousel] = useState(false)
  const [isSavingCarousel, setIsSavingCarousel] = useState(false)
  
  // 🌟 ใช้ State เก็บรูปของจริงจาก DB
  const [carouselItems, setCarouselItems] = useState<CarouselItem[]>([])
  const [isLoadingCarousel, setIsLoadingCarousel] = useState(true)

  // 🌟 ดึงข้อมูล Carousel เมื่อโหลดหน้าเว็บ
  const fetchCarousel = async () => {
    setIsLoadingCarousel(true)
    const res = await getCarouselItems()
    if (res.success && res.data) {
      setCarouselItems(res.data)
    } else {
      toast({ title: "โหลดข้อมูลแบนเนอร์ล้มเหลว", variant: "destructive" })
    }
    setIsLoadingCarousel(false)
  }

  useEffect(() => {
    fetchCarousel()
  }, [])

  // 🌟 จัดการอัปโหลดรูปลง Supabase และ DB
  const handleCarouselFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      if (!file.type.startsWith("image/")) {
        toast({ title: "ไฟล์ไม่รองรับ", description: "กรุณาอัปโหลดไฟล์รูปภาพ", variant: "destructive" })
        return
      }

      setIsUploadingCarousel(true)
      
      const formData = new FormData()
      formData.append("image", file)
      
      const res = await createCarouselItem(formData)

      if (res.success) {
        toast({ title: "✅ อัปโหลดสำเร็จ", description: "เพิ่มรูปลงใน Carousel แล้ว" })
        await fetchCarousel() // โหลดข้อมูลใหม่เพื่อโชว์รูป
      } else {
        toast({ title: "❌ อัปโหลดไม่สำเร็จ", description: res.error, variant: "destructive" })
      }
      
      setIsUploadingCarousel(false)
      
      // รีเซ็ต Input เพื่อให้สามารถอัปโหลดรูปเดิมซ้ำได้ (ถ้าต้องการ)
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
  }

  // 🌟 อัปเดตข้อมูล State ในหน้าจอแบบ Real-time
  const handleLocalUpdate = (id: string, updates: Partial<CarouselItem>) => {
    setCarouselItems(items => items.map(item => item.id === id ? { ...item, ...updates } : item))
  }

  // 🌟 ลบรูปออกจาก Storage และ DB ทันที
  const handleDeleteCarouselItem = async (id: string, imageUrl: string) => {
    if (!confirm("คุณต้องการลบแบนเนอร์นี้ใช่หรือไม่? (การกระทำนี้ไม่สามารถกู้คืนได้)")) return;

    // อัปเดต UI ทันที
    setCarouselItems(items => items.filter(item => item.id !== id))
    
    const res = await deleteCarouselItem(id, imageUrl)
    if (res.success) {
      toast({ title: "🗑️ ลบรูปภาพสำเร็จ" })
    } else {
      toast({ title: "ลบรูปภาพไม่สำเร็จ", description: res.error, variant: "destructive" })
      await fetchCarousel() // ถ้าพัง ให้โหลดกลับมาใหม่
    }
  }

  // 🌟 ฟังก์ชันจัดการเมื่อลากวางเสร็จสิ้น (สลับตำแหน่งใน State)
  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return; // ถ้าลากไปปล่อยนอกกรอบ ให้ยกเลิก

    const items = Array.from(carouselItems);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setCarouselItems(items);
  }

  const handleSaveCarouselSettings = async () => {
    setIsSavingCarousel(true)
    
    try {
      // 1. ส่งคำสั่งอัปเดตข้อมูล (Title, Link, Status) ของทุกรายการ
      for (const item of carouselItems) {
        await updateCarouselItem(item.id, {
          title: item.title || "",
          link: item.link || "",
          isActive: item.isActive
        })
      }

      // 🌟 2. ปลดล็อกโค้ดนี้ เพื่อส่งลำดับใหม่ไปบันทึกลง Database
      await reorderCarouselItems(carouselItems.map((item, i) => ({ id: item.id, order: i + 1 })))

      toast({ title: "✅ บันทึกการเปลี่ยนแปลงสำเร็จ", description: "อัปเดตข้อมูลแบนเนอร์บนหน้าเว็บไซต์แล้ว" })
    } catch (error) {
      toast({ title: "เกิดข้อผิดพลาดในการบันทึก", variant: "destructive" })
    }
    
    setIsSavingCarousel(false)
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-2">
          <ShieldAlert className="h-8 w-8 text-rose-600" />
          Super Admin Panel
        </h1>
        <p className="text-slate-500 mt-2">จัดการระบบส่วนกลาง และสร้างร้านค้าใหม่</p>
      </div>

      <Tabs defaultValue="carousel" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-8 bg-slate-100 h-12">
          <TabsTrigger value="create-shop" className="text-sm font-medium">🏪 สร้างร้านค้า</TabsTrigger>
          <TabsTrigger value="payment-settings" className="text-sm font-medium">💳 ตั้งค่ารับเงิน</TabsTrigger>
          <TabsTrigger value="carousel" className="text-sm font-medium">🖼️ จัดการ Carousel</TabsTrigger>
        </TabsList>

        {/* ========================================== */}
        {/* TAB: สร้างร้านค้า */}
        {/* ========================================== */}
        <TabsContent value="create-shop">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmitShop)} className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">

                {/* SECTION: Basic Info */}
                <Card className="border-slate-200 shadow-sm md:col-span-2">
                  <CardHeader className="bg-slate-50/50 border-b pb-4">
                    <CardTitle className="text-lg flex items-center gap-2"><Store className="h-5 w-5 text-blue-600" /> ข้อมูลร้านค้า (Basic Info)</CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-4 md:grid-cols-2 pt-6">
                    <FormField control={form.control} name="name" render={({ field }) => (
                      <FormItem>
                        <FormLabel>ชื่อร้านมือถือ (Display Name) <span className="text-red-500">*</span></FormLabel>
                        <FormControl><Input placeholder="เช่น ร้าน A Mobile" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />

                    <FormField control={form.control} name="slug" render={({ field }) => (
                      <FormItem>
                        <FormLabel>URL ร้านค้า (Slug) <span className="text-red-500">*</span></FormLabel>
                        <FormControl>
                          <div className="flex items-center gap-2">
                            <div className="flex items-center flex-1">
                              <span className="bg-slate-100 border border-r-0 border-slate-200 text-slate-500 px-3 h-10 rounded-l-md text-sm flex items-center whitespace-nowrap">fixkub.net/shop/</span>
                              <Input className="rounded-l-none focus-visible:ring-blue-500" placeholder="a-mobile" {...field} />
                            </div>
                            <Button
                              type="button"
                              variant="secondary"
                              onClick={handleCheckSlug}
                              disabled={isCheckingSlug || !watchSlug || watchSlug.length < 3}
                              className="shrink-0 hover:bg-slate-200"
                            >
                              {isCheckingSlug ? <Loader2 className="h-4 w-4 animate-spin" /> : "ตรวจสอบ"}
                            </Button>
                          </div>
                        </FormControl>

                        {slugStatus === "available" && (
                          <p className="text-sm font-medium text-emerald-600 flex items-center mt-1.5">
                            <CheckCircle2 className="h-4 w-4 mr-1.5" /> URL นี้ว่าง สามารถใช้งานได้!
                          </p>
                        )}
                        <FormMessage />
                      </FormItem>
                    )} />

                    <FormField control={form.control} name="logoUrl" render={({ field }) => (
                      <FormItem>
                        <FormLabel>โลโก้ (URL) <span className="text-slate-400 font-normal text-xs">(Optional)</span></FormLabel>
                        <FormControl><Input placeholder="https://..." {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />

                    <FormField control={form.control} name="themeColor" render={({ field }) => (
                      <FormItem>
                        <FormLabel>สีธีมหลัก (Theme Color)</FormLabel>
                        <div className="flex items-center gap-3">
                          <FormControl><Input type="color" className="w-16 p-1 h-10 cursor-pointer" {...field} /></FormControl>
                          <Input value={field.value} onChange={field.onChange} className="flex-1" />
                        </div>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </CardContent>
                </Card>

                {/* SECTION: Owner */}
                <Card className="border-slate-200 shadow-sm">
                  <CardHeader className="bg-slate-50/50 border-b pb-4">
                    <CardTitle className="text-lg flex items-center gap-2"><User className="h-5 w-5 text-indigo-600" /> บัญชีเจ้าของร้าน (Owner)</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6 space-y-4">
                    <FormField control={form.control} name="ownerEmail" render={({ field }) => (
                      <FormItem>
                        <FormLabel>อีเมลเจ้าของร้าน <span className="text-red-500">*</span></FormLabel>
                        <FormControl><Input type="email" placeholder="owner@email.com" {...field} /></FormControl>
                        <FormDescription>ใช้สำหรับ Login เข้าระบบจัดการร้าน</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </CardContent>
                </Card>

                {/* SECTION: Agent */}
                <Card className="border-slate-200 shadow-sm">
                  <CardHeader className="bg-slate-50/50 border-b pb-4">
                    <CardTitle className="text-lg flex items-center gap-2"><CreditCard className="h-5 w-5 text-amber-600" /> รหัสแนะนำ (Agent)</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6 space-y-4">
                    <FormField control={form.control} name="agentCode" render={({ field }) => (
                      <FormItem>
                        <FormLabel>รหัสตัวแทนเซลส์ (Agent Code)</FormLabel>
                        <FormControl><Input placeholder="เช่น AG-001" {...field} /></FormControl>
                        <FormDescription>เว้นว่างไว้หากไม่มีตัวแทนแนะนำ</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </CardContent>
                </Card>

                {/* SECTION: Plan / Billing */}
                <Card className="border-slate-200 shadow-sm md:col-span-2">
                  <CardHeader className="bg-slate-50/50 border-b pb-4">
                    <CardTitle className="text-lg flex items-center gap-2"><Settings className="h-5 w-5 text-emerald-600" /> แพ็กเกจและการเปิดใช้งาน (Billing)</CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-6 md:grid-cols-2 pt-6">

                    <div className="space-y-4 border-r pr-6 border-slate-100">
                      <FormField control={form.control} name="planType" render={({ field }) => (
                        <FormItem>
                          <FormLabel>แพ็กเกจเริ่มต้น</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger className="h-11"><SelectValue placeholder="เลือกแพ็กเกจ" /></SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="FREE_TRIAL">ทดลองใช้ฟรี (Free Trial)</SelectItem>
                              <SelectItem value="BASIC_MONTHLY">พื้นฐาน - รายเดือน (Basic Monthly)</SelectItem>
                              <SelectItem value="BASIC_YEARLY">พื้นฐาน - รายปี (Basic Yearly)</SelectItem>
                              <SelectItem value="PRO_MONTHLY">โปร - รายเดือน (Pro Monthly)</SelectItem>
                              <SelectItem value="PRO_YEARLY">โปร - รายปี (Pro Yearly)</SelectItem>
                              <SelectItem value="LIFETIME">ตลอดชีพ (Lifetime)</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )} />

                      <div className="grid grid-cols-2 gap-4">
                        <FormField control={form.control} name="startImmediately" render={({ field }) => (
                          <FormItem className={`flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm transition-colors ${watchPlanType === 'FREE_TRIAL' ? 'bg-slate-100 opacity-60 cursor-not-allowed' : 'bg-slate-50/50'}`}>
                            <div className="space-y-0.5">
                              <FormLabel className={watchPlanType === 'FREE_TRIAL' ? 'text-slate-400' : 'text-slate-700'}>เปิดบิลรับเงินทันที</FormLabel>
                            </div>
                            <FormControl>
                              <Switch checked={field.value} onCheckedChange={field.onChange} disabled={watchPlanType === "FREE_TRIAL"} className="data-[state=checked]:bg-blue-600" />
                            </FormControl>
                          </FormItem>
                        )} />

                        <FormField control={form.control} name="trialDays" render={({ field }) => (
                          <FormItem>
                            <FormLabel>{watchPlanType === "FREE_TRIAL" ? "จำนวนวันทดลองใช้" : "จำนวนวันแถม (Bonus)"}</FormLabel>
                            <FormControl><Input type="number" className="h-11 font-medium" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                      </div>
                    </div>

                    <div className="flex flex-col justify-center">
                      <FormField control={form.control} name="isActive" render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-xl border-2 border-emerald-200 bg-emerald-50 p-6 shadow-sm">
                          <div className="space-y-1">
                            <FormLabel className="text-emerald-800 text-lg">เปิดใช้งานร้านค้า</FormLabel>
                            <FormDescription className="text-emerald-600/80">อนุญาตให้ร้านค้านี้เข้าสู่ระบบได้ทันที</FormDescription>
                          </div>
                          <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} className="data-[state=checked]:bg-emerald-600 scale-125 mr-2" /></FormControl>
                        </FormItem>
                      )} />
                    </div>

                  </CardContent>
                </Card>

              </div>

              <div className="flex justify-end gap-4 pt-4 border-t">
                <Button type="submit" className="bg-slate-900 hover:bg-slate-800 text-white min-w-[200px]" disabled={isSubmittingShop || slugStatus === "taken"}>
                  {isSubmittingShop ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> กำลังสร้างระบบ...</> : "สร้างร้านค้าใหม่"}
                </Button>
              </div>
            </form>
          </Form>
        </TabsContent>

        {/* ========================================== */}
        {/* TAB: ตั้งค่า Payment */}
        {/* ========================================== */}
        <TabsContent value="payment-settings" className="animate-in fade-in duration-300">
          <Card className="border-slate-200 shadow-sm max-w-2xl">
            <CardHeader className="bg-slate-50/50 border-b pb-4">
              <CardTitle className="text-xl flex items-center gap-2">
                <CreditCard className="h-6 w-6 text-indigo-600" /> บัญชีรับชำระเงิน (PromptPay)
              </CardTitle>
              <CardDescription>
                ตั้งค่าบัญชีพร้อมเพย์ส่วนกลางของแพลตฟอร์ม ระบบจะนำเลขนี้ไปสร้าง QR Code พร้อมยอดเงินอัตโนมัติตามแพ็กเกจ (Basic/Pro) ในหน้า Payment ให้ลูกค้าสแกนจ่าย
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">

              <div className="space-y-2">
                <Label>PromptPay ID <span className="text-red-500">*</span></Label>
                <Input
                  value={promptpayId}
                  onChange={(e) => setPromptpayId(e.target.value)}
                  placeholder="เบอร์โทรศัพท์ หรือ เลขบัตรประชาชน 13 หลัก"
                  className="h-12 text-lg font-medium"
                />
                <p className="text-xs text-slate-500">ระบบจะนำเลขนี้ไปสร้าง QR Code แบบระบุยอดเงินให้อัตโนมัติ (Dynamic QR)</p>
              </div>

              <div className="space-y-2">
                <Label>ชื่อบัญชี (Account Name) <span className="text-red-500">*</span></Label>
                <Input
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  placeholder="เช่น บจก. อีซี่คิว โซลูชั่น หรือ นาย สมชาย ใจดี"
                  className="h-12 text-lg"
                />
                <p className="text-xs text-slate-500">ชื่อที่จะแสดงบนหน้าจอให้ลูกค้าตรวจสอบก่อนโอนเงิน</p>
              </div>

            </CardContent>
            <div className="flex justify-end gap-4 p-6 pt-0">
              <Button
                onClick={handleSavePayment}
                disabled={!promptpayId || !accountName || isSavingPayment}
                className="bg-indigo-600 hover:bg-indigo-700 text-white min-w-[200px] h-11"
              >
                {isSavingPayment ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> กำลังบันทึก...</> : <><Save className="mr-2 h-4 w-4" /> บันทึกการตั้งค่าชำระเงิน</>}
              </Button>
            </div>
          </Card>
        </TabsContent>

        {/* ========================================== */}
        {/* 🌟 TAB: จัดการ Carousel (Real Data connected) */}
        {/* ========================================== */}
        <TabsContent value="carousel" className="animate-in fade-in duration-300 space-y-6">

          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <ImageIcon className="h-6 w-6 text-fuchsia-600" />
                แบนเนอร์หน้าแรก (Hero Carousel)
              </h2>
              <p className="text-sm text-slate-500 mt-1">อัปโหลดแบนเนอร์โปรโมชั่น จัดเรียงลำดับ และตั้งค่าลิงก์ไปยังส่วนต่างๆ</p>
            </div>
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploadingCarousel}
              className="bg-fuchsia-600 hover:bg-fuchsia-700"
            >
              {isUploadingCarousel ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <UploadCloud className="h-4 w-4 mr-2" />}
              เพิ่มแบนเนอร์ใหม่
            </Button>
            <Input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleCarouselFileChange} />
          </div>

          <div className="grid gap-4">
            {isLoadingCarousel ? (
            <div className="flex justify-center items-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
            </div>
          ) : carouselItems.length === 0 ? (
            <div className="text-center py-16 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50">
              <ImageIcon className="h-12 w-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 font-medium">ยังไม่มีแบนเนอร์ในระบบ</p>
              <p className="text-slate-400 text-sm mt-1">คลิก "เพิ่มแบนเนอร์ใหม่" เพื่อเริ่มต้น</p>
            </div>
          ) : (
            // 🌟 เริ่มต้น Drag & Drop Area
            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="carousel-list">
                {(provided) => (
                  <div {...provided.droppableProps} ref={provided.innerRef} className="grid gap-4">
                    
                    {carouselItems.map((item, index) => (
                      <Draggable key={item.id} draggableId={item.id} index={index}>
                        {(provided, snapshot) => (
                          <Card 
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className={`border-slate-200 overflow-hidden flex flex-col md:flex-row group transition-shadow ${
                              snapshot.isDragging ? "shadow-xl ring-2 ring-fuchsia-500 z-50 bg-white" : "shadow-sm bg-white"
                            }`}
                          >
                            {/* 🌟 ด้ามจับสำหรับ Drag (เอา dragHandleProps มาใส่ตรงนี้) */}
                            <div 
                              {...provided.dragHandleProps}
                              className="bg-slate-50 flex items-center justify-center p-2 border-r border-slate-100 cursor-grab active:cursor-grabbing text-slate-400 group-hover:text-slate-600 hover:bg-slate-100"
                            >
                              <GripVertical className="h-5 w-5" />
                            </div>

                            {/* 🌟 พรีวิวรูปภาพ */}
                            <div className="w-full md:w-64 h-32 md:h-auto bg-slate-100 shrink-0 relative border-b md:border-b-0 md:border-r border-slate-200">
                              {item.imageUrl ? (
                                <img src={item.imageUrl} alt="Carousel Preview" className="w-full h-full object-cover pointer-events-none" />
                              ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
                                  <ImageIcon className="h-8 w-8 mb-2 opacity-50" />
                                  <span className="text-xs">ไม่มีรูปภาพ</span>
                                </div>
                              )}
                              <Badge className={`absolute top-2 right-2 shadow-sm ${item.isActive ? 'bg-emerald-500' : 'bg-slate-400'}`}>
                                {item.isActive ? "เปิดใช้งาน" : "ปิดชั่วคราว"}
                              </Badge>
                            </div>

                            {/* 🌟 ฟอร์มแก้ไขรายละเอียดของแต่ละรูป */}
                            <div className="p-5 flex-1 grid gap-4 md:grid-cols-2">
                              <div className="space-y-1.5 md:col-span-2">
                                <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">หัวข้อแบนเนอร์ (Internal Note)</Label>
                                <Input
                                  placeholder="เช่น แบนเนอร์โปรโมชั่นสงกรานต์"
                                  value={item.title || ""}
                                  onChange={(e) => handleLocalUpdate(item.id, { title: e.target.value })}
                                  className="bg-slate-50"
                                />
                              </div>

                              <div className="space-y-1.5 md:col-span-2">
                                <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                                  <LinkIcon className="h-3 w-3" /> ลิงก์ปลายทาง (เมื่อลูกค้าคลิกรูป)
                                </Label>
                                <Input
                                  placeholder="เช่น #pricing หรือ https://google.com"
                                  value={item.link || ""}
                                  onChange={(e) => handleLocalUpdate(item.id, { link: e.target.value })}
                                  className="bg-slate-50"
                                />
                              </div>
                            </div>

                            {/* 🌟 ส่วนควบคุมขวาสุด (เปิด/ปิด และ ลบ) */}
                            <div className="bg-slate-50 p-5 border-l border-slate-100 flex flex-row md:flex-col items-center justify-between gap-4 md:w-32 shrink-0">
                              <div className="flex flex-col items-center gap-2 w-full">
                                <Label className="text-xs font-medium text-slate-500">สถานะแบนเนอร์</Label>
                                <Switch
                                  checked={item.isActive}
                                  onCheckedChange={(checked) => handleLocalUpdate(item.id, { isActive: checked })}
                                  className="data-[state=checked]:bg-emerald-500"
                                />
                              </div>

                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteCarouselItem(item.id, item.imageUrl)}
                                className="text-rose-500 hover:text-rose-700 hover:bg-rose-50 w-full"
                              >
                                <Trash2 className="h-4 w-4 mr-2" /> ลบทิ้ง
                              </Button>
                            </div>
                          </Card>
                        )}
                      </Draggable>
                    ))}
                    
                    {/* ตัวช่วยไม่ให้ UI กระตุกตอนลาก */}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          )}
          </div>

          <div className="flex justify-end pt-6 border-t mt-8">
            <Button onClick={handleSaveCarouselSettings} disabled={isSavingCarousel} className="bg-slate-900 hover:bg-slate-800 text-white min-w-[200px] h-11">
              {isSavingCarousel ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> กำลังบันทึก...</> : <><Save className="h-4 w-4 mr-2" /> บันทึกลำดับและการตั้งค่า Carousel</>}
            </Button>
          </div>

        </TabsContent>

      </Tabs>
    </div>
  )
}