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
import { Loader2, CheckCircle2, XCircle, ArrowRight } from "lucide-react"

// 🌟 Import Action ใหม่จาก actions/shop.ts 
import { registerPublicShop, registerFreeTrialShop } from "@/actions/shop"
import { checkSlugAvailability } from "@/actions/super-admin"
import { createShopSchema, type CreateShopInput } from "@/lib/validations/shop"

export default function OnboardingForm({ email, plan }: { email: string, plan: string }) {
  const router = useRouter()
  const { toast } = useToast()
  
  const [isSubmittingShop, setIsSubmittingShop] = useState(false)
  const [isCheckingSlug, setIsCheckingSlug] = useState(false)
  const [slugStatus, setSlugStatus] = useState<"idle" | "available" | "taken">("idle")

  const planTypeEnum = plan === "yearly" ? "BASIC_YEARLY" : plan === "free" ? "FREE_TRIAL" : "BASIC_MONTHLY"

  const form = useForm<CreateShopInput>({
    resolver: zodResolver(createShopSchema),
    defaultValues: {
      name: "", 
      slug: "", 
      logoUrl: "", 
      themeColor: "#10b981", 
      ownerEmail: email, 
      planType: planTypeEnum, 
      trialDays: 0, 
      startImmediately: false, 
      agentCode: "", 
      isActive: true,
    }
  })

  const watchName = form.watch("name")
  const watchSlug = form.watch("slug")

  useEffect(() => {
    if (slugStatus !== "idle") setSlugStatus("idle")
  }, [watchSlug, slugStatus])

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
    if (slugStatus !== "available") {
      const isAvailable = await checkSlugAvailability(values.slug)
      if (!isAvailable.success || !isAvailable.available) {
        setSlugStatus("taken")
        form.setError("slug", { type: "manual", message: "URL นี้มีผู้ใช้งานแล้ว กรุณาเปลี่ยนใหม่" })
        return
      }
    }

    setIsSubmittingShop(true)
    
    // 🌟 เตรียมข้อมูลแปลงเป็น FormData เพื่อส่งให้ Server Action
    const formData = new FormData()
    formData.append("name", values.name)
    formData.append("slug", values.slug)
    formData.append("email", values.ownerEmail)
    
    let res;

    // 🌟 แยก Flow ตามแพ็กเกจที่ลูกค้าเลือก
    if (plan === "free") {
      res = await registerFreeTrialShop(formData)
    } else {
      res = await registerPublicShop(formData)
    }
    
    if (res.success && res.shopId) {
      if (plan === "free") {
        toast({ title: "✅ เปิดร้านค้าสำเร็จ", description: "กำลังพาท่านเข้าสู่ระบบจัดการร้านค้า..." })
        // Flow 2: ใช้ฟรี เด้งไป Dashboard เลย
        router.push('/dashboard') 
      } else {
        toast({ title: "✅ สร้างร้านค้าสำเร็จ", description: "กำลังพาท่านไปยังหน้าชำระเงิน..." })
        // Flow 1: เสียตังค์ เด้งไปจ่ายเงินก่อน
        router.push(`/checkout?shopId=${res.shopId}&plan=${plan}`) 
      }
    } else {
      if (res.message?.includes("URL") || res.message?.includes("Slug")) {
        form.setError("slug", { type: "manual", message: res.message })
        setSlugStatus("taken")
      } else {
        toast({ title: "❌ เกิดข้อผิดพลาด", description: res.message || "ไม่สามารถสร้างร้านค้าได้", variant: "destructive" })
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
                  <div className="flex items-center w-full shadow-sm rounded-md">
                    <span className="bg-slate-50 border border-r-0 border-slate-200 text-slate-500 px-3 h-11 rounded-l-md text-sm flex items-center whitespace-nowrap select-none">
                      https://
                    </span>
                    <Input 
                      className="rounded-none border-l-0 border-r-0 h-11 focus-visible:ring-emerald-500 px-2 text-center focus-visible:relative focus-visible:z-10 font-medium text-slate-700" 
                      placeholder="ddmobile"
                      {...field} 
                    />
                    <span className="bg-slate-50 border border-l-0 border-r-0 border-slate-200 text-slate-500 px-3 h-11 text-sm flex items-center whitespace-nowrap select-none">
                      .getfixx.net
                    </span>
                    <Button 
                      type="button" 
                      variant="secondary" 
                      onClick={handleCheckSlug} 
                      disabled={isCheckingSlug || !watchSlug || watchSlug.length < 3}
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
                ) : plan === "free" ? (
                  <>เริ่มทดลองใช้งานฟรี 14 วัน<ArrowRight className="ml-2 h-5 w-5" /></>
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