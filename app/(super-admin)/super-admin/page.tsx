"use client"

import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { Store, User, CreditCard, Settings, ShieldAlert, Loader2, Save } from "lucide-react"

import { createShopAction } from "@/actions/super-admin"
import { createShopSchema, type CreateShopInput } from "@/lib/validations/shop"
import { updatePaymentSettings, getSystemSettings } from "@/actions/setting"

export default function SuperAdminCreateShopPage() {
  const { toast } = useToast()
  
  // State สำหรับฟอร์มสร้างร้าน
  const [isSubmittingShop, setIsSubmittingShop] = useState(false)
  
  // State สำหรับฟอร์มตั้งค่า Payment
  const [isSavingPayment, setIsSavingPayment] = useState(false)
  const [promptpayId, setPromptpayId] = useState("")
  const [accountName, setAccountName] = useState("")

  // --- 🌟 ดึงข้อมูล Payment Settings ตอนโหลดหน้าเพจ ---
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

  // --- 🌟 ฟังก์ชันบันทึก Payment Settings ---
  const handleSavePayment = async () => {
    setIsSavingPayment(true)
    const res = await updatePaymentSettings(promptpayId, accountName)
    if (res.success) {
      toast({ title: "✅ บันทึกสำเร็จ", description: "อัปเดตข้อมูลบัญชีรับเงินเรียบร้อยแล้ว" })
    } else {
      toast({ title: "❌ เกิดข้อผิดพลาด", description: res.error, variant: "destructive" })
    }
    setIsSavingPayment(false)
  }

  // --- 🌟 ฟอร์มสร้างร้านค้า ---
  const form = useForm<CreateShopInput>({
    resolver: zodResolver(createShopSchema),
    defaultValues: {
      name: "", slug: "", logoUrl: "", themeColor: "#10b981", ownerEmail: "",
      planType: "FREE_TRIAL", trialDays: 30, startImmediately: false, agentCode: "", isActive: true,
    }
  })

  const watchPlanType = form.watch("planType")
  const watchName = form.watch("name")

  useEffect(() => {
    if (watchPlanType === "FREE_TRIAL") form.setValue("startImmediately", false)
  }, [watchPlanType, form])

  useEffect(() => {
    if (watchName && !form.formState.dirtyFields.slug) {
      const generatedSlug = watchName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')     
      form.setValue("slug", generatedSlug, { shouldValidate: true })
    }
  }, [watchName, form])

  const onSubmitShop = async (values: CreateShopInput) => {
    setIsSubmittingShop(true)
    const res = await createShopAction(values)
    if (res.success) {
      toast({ title: "✅ สร้างร้านค้าสำเร็จ", description: `เพิ่มร้าน ${values.name} เข้าระบบเรียบร้อยแล้ว` })
      form.reset() 
    } else {
      toast({ title: "❌ เกิดข้อผิดพลาด", description: res.error, variant: "destructive" })
    }
    setIsSubmittingShop(false)
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

      {/* 🌟 สร้าง Tabs แยกหมวดหมู่ชัดเจน */}
      <Tabs defaultValue="create-shop" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-8 bg-slate-100">
          <TabsTrigger value="create-shop" className="text-base">🏪 สร้างร้านค้าใหม่</TabsTrigger>
          <TabsTrigger value="payment-settings" className="text-base">💳 ตั้งค่าการรับชำระเงิน</TabsTrigger>
        </TabsList>

        {/* 🌟 TAB 1: สร้างร้านค้า */}
        <TabsContent value="create-shop">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmitShop)} className="space-y-6">
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
                              <FormLabel className={watchPlanType === 'FREE_TRIAL' ? 'text-slate-400' : 'text-slate-700'}>เปิดบิลรับเงินทันที</FormLabel>
                            </div>
                            <FormControl>
                              <Switch checked={field.value} onCheckedChange={field.onChange} disabled={watchPlanType === "FREE_TRIAL"} className="data-[state=checked]:bg-blue-600"/>
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
                <Button type="submit" className="bg-slate-900 hover:bg-slate-800 text-white min-w-[200px]" disabled={isSubmittingShop}>
                  {isSubmittingShop ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> กำลังสร้างระบบ...</> : "สร้างร้านค้าใหม่"}
                </Button>
              </div>
            </form>
          </Form>
        </TabsContent>

        {/* 🌟 TAB 2: ตั้งค่าการรับชำระเงินของแพลตฟอร์ม */}
        <TabsContent value="payment-settings" className="animate-in fade-in duration-300">
          <Card className="border-slate-200 shadow-sm max-w-2xl">
            <CardHeader className="bg-slate-50/50 border-b pb-4">
              <CardTitle className="text-xl flex items-center gap-2">
                <CreditCard className="h-6 w-6 text-indigo-600"/> บัญชีรับชำระเงิน (PromptPay)
              </CardTitle>
              <CardDescription>
                ตั้งค่าบัญชีพร้อมเพย์ส่วนกลางของแพลตฟอร์ม ระบบจะนำเลขนี้ไปสร้าง QR Code พร้อมยอดเงินอัตโนมัติตามแพ็กเกจ (Basic/Pro) ในหน้า Payment ให้ลูกค้าสแกนจ่าย
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              
              <div className="space-y-2">
                <FormLabel>PromptPay ID <span className="text-red-500">*</span></FormLabel>
                <Input 
                  value={promptpayId} 
                  onChange={(e) => setPromptpayId(e.target.value)} 
                  placeholder="เบอร์โทรศัพท์ หรือ เลขบัตรประชาชน 13 หลัก" 
                  className="h-12 text-lg font-medium"
                />
                <p className="text-xs text-slate-500">ระบบจะนำเลขนี้ไปสร้าง QR Code แบบระบุยอดเงินให้อัตโนมัติ (Dynamic QR)</p>
              </div>

              <div className="space-y-2">
                <FormLabel>ชื่อบัญชี (Account Name) <span className="text-red-500">*</span></FormLabel>
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
      </Tabs>
    </div>
  )
}