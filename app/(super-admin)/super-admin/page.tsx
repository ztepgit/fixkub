"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"

import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { Store, User, CreditCard, Settings, ShieldAlert, Loader2 } from "lucide-react"

import { createShopAction, createShopSchema, CreateShopInput } from "@/actions/super-admin"

export default function SuperAdminCreateShopPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<CreateShopInput>({
    resolver: zodResolver(createShopSchema),
    defaultValues: {
      name: "",
      slug: "",
      logoUrl: "",
      themeColor: "#10b981",
      ownerEmail: "",
      planType: "FREE_TRIAL",
      trialDays: 30, // 🌟 ใช้ช่องนี้เป็นทั้ง Trial ปกติ และ วันแถม(Bonus)
      startImmediately: false,
      agentCode: "",
      isActive: true,
    }
  })

  // 🌟 Watch ค่าแพ็กเกจ เพื่อใช้ควบคุม UI สวิตช์
  const watchPlanType = form.watch("planType")

  useEffect(() => {
    // 🌟 ลอจิกที่ 1: ถ้าเลือก FREE_TRIAL บังคับให้สวิตช์เริ่มบิล "ปิด" อัตโนมัติ
    if (watchPlanType === "FREE_TRIAL") {
      form.setValue("startImmediately", false)
    }
  }, [watchPlanType, form])

  const watchName = form.watch("name")
  useEffect(() => {
    if (watchName && !form.formState.dirtyFields.slug) {
      const generatedSlug = watchName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-') 
        .replace(/(^-|-$)/g, '')     
      
      form.setValue("slug", generatedSlug, { shouldValidate: true })
    }
  }, [watchName, form])

  const onSubmit = async (values: CreateShopInput) => {
    setIsSubmitting(true)
    try {
      const res = await createShopAction(values)
      
      if (res.success) {
        toast({ title: "✅ สร้างร้านค้าสำเร็จ", description: `เพิ่มร้าน ${values.name} เข้าระบบเรียบร้อยแล้ว` })
        form.reset() 
      } else {
        toast({ title: "❌ เกิดข้อผิดพลาด", description: res.error, variant: "destructive" })
      }
    } catch (error) {
      toast({ title: "❌ เกิดข้อผิดพลาด", description: "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้", variant: "destructive" })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-2">
          <ShieldAlert className="h-8 w-8 text-rose-600" />
          Super Admin: เปิดร้านค้าใหม่
        </h1>
        <p className="text-slate-500 mt-2">สร้าง Tenant ใหม่เข้าระบบ พร้อมกำหนดสิทธิ์และแพ็กเกจ</p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          
          <div className="grid gap-6 md:grid-cols-2">
            
            {/* SECTION: Basic Info */}
            <Card className="border-slate-200 shadow-sm md:col-span-2">
              <CardHeader className="bg-slate-50/50 border-b pb-4">
                <CardTitle className="text-lg flex items-center gap-2"><Store className="h-5 w-5 text-blue-600"/> ข้อมูลร้านค้า (Basic Info)</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2 pt-6">
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem>
                    <FormLabel>ชื่อร้าน (Display Name) <span className="text-red-500">*</span></FormLabel>
                    <FormControl><Input placeholder="เช่น ร้าน A Mobile" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="slug" render={({ field }) => (
                  <FormItem>
                    <FormLabel>URL ร้านค้า (Slug) <span className="text-red-500">*</span></FormLabel>
                    <FormControl>
                      <div className="flex items-center">
                        <span className="bg-slate-100 border border-r-0 border-slate-200 text-slate-500 px-3 h-10 rounded-l-md text-sm flex items-center">esyq.co/shop/</span>
                        <Input className="rounded-l-none focus-visible:ring-blue-500" placeholder="a-mobile" {...field} />
                      </div>
                    </FormControl>
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
                <CardTitle className="text-lg flex items-center gap-2"><User className="h-5 w-5 text-indigo-600"/> บัญชีเจ้าของร้าน (Owner)</CardTitle>
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
                <CardTitle className="text-lg flex items-center gap-2"><CreditCard className="h-5 w-5 text-amber-600"/> รหัสแนะนำ (Agent)</CardTitle>
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
                <CardTitle className="text-lg flex items-center gap-2"><Settings className="h-5 w-5 text-emerald-600"/> แพ็กเกจและการเปิดใช้งาน (Billing)</CardTitle>
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
                          <FormLabel className={watchPlanType === 'FREE_TRIAL' ? 'text-slate-400' : 'text-slate-700'}>
                            เปิดบิลรับเงินทันที
                          </FormLabel>
                          <FormDescription className="text-[10px]">
                            {watchPlanType === 'FREE_TRIAL' 
                              ? 'ไม่สามารถใช้ร่วมกับแพ็กเกจฟรี' 
                              : 'ระบบจะนำแพ็กเกจไปทบกับวันแถมฟรี'}
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch 
                            checked={field.value} 
                            onCheckedChange={field.onChange} 
                            disabled={watchPlanType === "FREE_TRIAL"} 
                            className="data-[state=checked]:bg-blue-600"
                          />
                        </FormControl>
                      </FormItem>
                    )} />

                    <FormField control={form.control} name="trialDays" render={({ field }) => (
                      <FormItem>
                        <FormLabel>{watchPlanType === "FREE_TRIAL" ? "จำนวนวันทดลองใช้" : "จำนวนวันแถม (Bonus Days)"}</FormLabel>
                        {/* 🌟 ปลดล็อค disabled ออก เพื่อให้กรอกวันแถมได้เสมอ! */}
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
            <Button type="button" variant="outline" onClick={() => form.reset()} disabled={isSubmitting}>
              ล้างค่า
            </Button>
            <Button type="submit" className="bg-slate-900 hover:bg-slate-800 text-white min-w-[200px]" disabled={isSubmitting}>
              {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> กำลังสร้างระบบ...</> : "สร้างร้านค้าใหม่"}
            </Button>
          </div>
          
        </form>
      </Form>
    </div>
  )
}