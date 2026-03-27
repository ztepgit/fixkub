"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"

import { Card, CardContent } from "@/components/ui/card"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { Store, Loader2, CheckCircle2, XCircle, ArrowRight } from "lucide-react"

import { createShopAction, checkSlugAvailability } from "@/actions/super-admin"
import { createShopSchema, type CreateShopInput } from "@/lib/validations/shop"

export default function OnboardingForm({ email, plan }: { email: string, plan: string }) {
  const router = useRouter()
  const { toast } = useToast()
  
  const [isSubmittingShop, setIsSubmittingShop] = useState(false)
  const [isCheckingSlug, setIsCheckingSlug] = useState(false)
  const [slugStatus, setSlugStatus] = useState<"idle" | "available" | "taken">("idle")

  // แปลงค่าจาก URL ไปเป็น Enum เพื่อให้ตรงกับ Zod Schema
  const planTypeEnum = plan === "yearly" ? "BASIC_YEARLY" : "BASIC_MONTHLY"

  const form = useForm<CreateShopInput>({
    resolver: zodResolver(createShopSchema),
    defaultValues: {
      name: "", 
      slug: "", 
      logoUrl: "", 
      themeColor: "#10b981", 
      ownerEmail: email, // 🌟 ล็อกอีเมลนี้ไว้เลย
      planType: planTypeEnum, 
      trialDays: 0, // ไม่แถมวันฟรี เพราะรอลูกค้าจ่ายเงิน
      startImmediately: false, 
      agentCode: "", 
      isActive: true,
    }
  })

  const watchName = form.watch("name")
  const watchSlug = form.watch("slug")

  // รีเซ็ตสถานะ Slug เมื่อพิมพ์แก้
  useEffect(() => {
    if (slugStatus !== "idle") setSlugStatus("idle")
  }, [watchSlug, slugStatus])

  // Gen Slug อัตโนมัติจากชื่อร้าน
  useEffect(() => {
    if (watchName && !form.formState.dirtyFields.slug) {
      const generatedSlug = watchName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')     
      form.setValue("slug", generatedSlug, { shouldValidate: true })
    }
  }, [watchName, form])

  // ฟังก์ชันตรวจสอบ Slug
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

  // ฟังก์ชัน Submit ฟอร์ม
  const onSubmitShop = async (values: CreateShopInput) => {
    // บังคับเช็ค Slug ก่อนส่ง ถ้าลูกค้าลืมกดปุ่มเช็ค
    if (slugStatus !== "available") {
      const isAvailable = await checkSlugAvailability(values.slug)
      if (!isAvailable.success || !isAvailable.available) {
        setSlugStatus("taken")
        form.setError("slug", { type: "manual", message: "URL นี้มีผู้ใช้งานแล้ว กรุณาเปลี่ยนใหม่" })
        return
      }
    }

    setIsSubmittingShop(true)
    
    // 🌟 ส่งข้อมูลไปสร้างร้านในฐานข้อมูล
    const res = await createShopAction(values)
    
    if (res.success && res.data) {
      toast({ title: "✅ สร้างร้านค้าสำเร็จ", description: "กำลังพาท่านไปยังหน้าชำระเงิน..." })
      
      // 🚀 สร้างร้านเสร็จปุ๊บ โยน shopId ที่ได้ ไปให้หน้า Checkout จ่ายเงินต่อเลย!
      router.push(`/checkout?shopId=${res.data.id}&plan=${plan}`)
    } else {
      if (res.error?.includes("URL") || res.error?.includes("Slug")) {
        form.setError("slug", { type: "manual", message: res.error })
        setSlugStatus("taken")
      } else {
        toast({ title: "❌ เกิดข้อผิดพลาด", description: res.error, variant: "destructive" })
      }
      setIsSubmittingShop(false)
    }
  }

  return (
    <Card className="border-slate-200 shadow-xl overflow-hidden">
      <CardContent className="pt-8 px-6 sm:px-10 pb-10">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmitShop)} className="space-y-6">
            
            <FormField control={form.control} name="ownerEmail" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-slate-600">อีเมลเจ้าของร้าน (ล็อกอินปัจจุบัน)</FormLabel>
                <FormControl>
                  {/* 🌟 แสดงอีเมลให้ดู แต่ปิด (Disabled) ไม่ให้แก้ไข */}
                  <Input {...field} disabled className="bg-slate-100 text-slate-500 font-medium" />
                </FormControl>
              </FormItem>
            )} />

            <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem>
                <FormLabel>ชื่อร้านค้า <span className="text-red-500">*</span></FormLabel>
                <FormControl>
                  <Input placeholder="เช่น ร้าน DDmobile" {...field} className="h-11 focus-visible:ring-emerald-500" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="slug" render={({ field }) => (
              <FormItem>
                <FormLabel>ลิงก์หน้าร้าน (URL) <span className="text-red-500">*</span></FormLabel>
                <FormControl>
                  {/* 🌟 อัปเดต UI ให้เป็นรูปแบบ Subdomain พร้อมแก้ปัญหากรอบไฮไลท์โดนทับ */}
                  <div className="flex items-center w-full shadow-sm rounded-md">
                    <span className="bg-slate-50 border border-r-0 border-slate-200 text-slate-500 px-3 h-11 rounded-l-md text-sm flex items-center whitespace-nowrap select-none">
                      https://
                    </span>
                    <Input 
                      // 🌟 เพิ่ม focus-visible:relative focus-visible:z-10 เพื่อให้กรอบเด้งทับกล่องข้างๆ ตอนกด
                      className="rounded-none border-l-0 border-r-0 h-11 focus-visible:ring-emerald-500 px-2 text-center focus-visible:relative focus-visible:z-10 font-medium text-slate-700" 
                      placeholder="ddmobile"
                      {...field} 
                    />
                    <span className="bg-slate-50 border border-l-0 border-r-0 border-slate-200 text-slate-500 px-3 h-11 text-sm flex items-center whitespace-nowrap select-none">
                      .esyq.net
                    </span>
                    <Button 
                      type="button" 
                      variant="secondary" 
                      onClick={handleCheckSlug} 
                      disabled={isCheckingSlug || !watchSlug || watchSlug.length < 3}
                      // 🌟 เพิ่ม cursor-pointer ให้เป็นรูปนิ้วชี้
                      className="shrink-0 h-11 px-4 sm:px-6 font-medium rounded-l-none border border-l-0 border-slate-200 hover:bg-slate-200 cursor-pointer disabled:cursor-not-allowed"
                    >
                      {isCheckingSlug ? <Loader2 className="h-4 w-4 animate-spin" /> : "ตรวจสอบ"}
                    </Button>
                  </div>
                </FormControl>
                
                {slugStatus === "available" && (
                  <p className="text-sm font-medium text-emerald-600 flex items-center mt-1.5 animate-in slide-in-from-top-1">
                    <CheckCircle2 className="h-4 w-4 mr-1.5"/> URL นี้ว่าง สามารถใช้งานได้!
                  </p>
                )}
                {slugStatus === "taken" && (
                  <p className="text-sm font-medium text-rose-500 flex items-center mt-1.5 animate-in slide-in-from-top-1">
                    <XCircle className="h-4 w-4 mr-1.5"/> ขออภัย URL นี้มีผู้ใช้งานแล้ว
                  </p>
                )}
                <FormMessage />
              </FormItem>
            )} />

            <div className="pt-4 mt-8 border-t border-slate-100">
              <Button 
                type="submit" 
                className="w-full h-12 text-base font-bold bg-emerald-600 hover:bg-emerald-700 shadow-md transition-all hover:scale-[1.02]" 
                disabled={isSubmittingShop || slugStatus === "taken"}
              >
                {isSubmittingShop ? (
                  <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> กำลังสร้างร้านค้า...</>
                ) : (
                  <>สร้างร้านค้าและไปหน้าชำระเงิน <ArrowRight className="ml-2 h-5 w-5" /></>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}