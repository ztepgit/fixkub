"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
// 🌟 1. เพิ่ม import Copy ตรงนี้ครับ
import { Smartphone, User, PenLine, CheckCircle2, Loader2, Search, Copy } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { createQueue } from "@/actions/queue"
import { useToast } from "@/hooks/use-toast"
import { CustomerQueueStatus } from "@/components/customer-queue-status"

const COMMON_SERVICES = [
  "เปลี่ยนจอ", "เปลี่ยนแบต", "ติดฟิล์ม", "ชาร์จไม่เข้า",
  "เปิดไม่ติด", "โดนน้ำ", "ย้ายข้อมูล", "ปลดล็อคเครื่อง",
]

interface CustomerBookingFormProps {
  shopId?: string;
  shopName?: string;
  shopLogoUrl?: string | null;
}

export function CustomerBookingForm({ 
  shopId = "shop_test_001",
  shopName = "ร้านปิ๊กโมบาย", 
  shopLogoUrl = null 
}: CustomerBookingFormProps) {
  const { toast } = useToast() 
  
  const [activeTab, setActiveTab] = useState("booking")

  const [isSubmitting, setIsSubmitting] = useState(false) 
  const [isSuccess, setIsSuccess] = useState(false)
  const [queueRef, setQueueRef] = useState("")

  const [currentShopName, setCurrentShopName] = useState(shopName)
  const [currentShopLogo, setCurrentShopLogo] = useState<string | null>(shopLogoUrl)

  const [serviceName, setServiceName] = useState<string>("")
  const [deviceModel, setDeviceModel] = useState<string>("")
  const [deviceColor, setDeviceColor] = useState<string>("")
  const [issue, setIssue] = useState<string>("")
  const [customerName, setCustomerName] = useState<string>("")
  const [phone, setPhone] = useState<string>("") 

  useEffect(() => {
    const savedName = localStorage.getItem("shopName")
    const savedLogo = localStorage.getItem("shopLogo")
    if (savedName) setCurrentShopName(savedName)
    if (savedLogo) setCurrentShopLogo(savedLogo)
  }, [])

  const getInitial = (name: string) => {
    return name ? name.charAt(0).toUpperCase() : "S"
  }

  const handleChipClick = (service: string) => {
    setServiceName(service)
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)
    try {
      const response = await createQueue({
        shopId, customerName, phoneNumber: phone, 
        deviceModel, deviceColor, issue, serviceName, isManualEntry: false, 
      })

      if (response.success) {
        setQueueRef(response.data?.jobRef || "Q-XXXX")
        setIsSuccess(true)
      } else {
        toast({ title: "❌ เกิดข้อผิดพลาด", description: response.error, variant: "destructive" })
      }
    } catch (error) {
      toast({ title: "❌ เกิดข้อผิดพลาด", description: "ระบบขัดข้อง กรุณาลองใหม่อีกครั้ง", variant: "destructive" })
    } finally {
      setIsSubmitting(false)
    }
  }

  // 🌟 หน้าจอเมื่อกดแจ้งซ่อมสำเร็จ
  if (isSuccess) {
    return (
      <div className="w-full max-w-md mx-auto p-6 bg-white rounded-2xl shadow-xl border border-slate-100 flex flex-col items-center justify-center text-center animate-in fade-in zoom-in duration-500 min-h-[450px]">
        <div className="h-20 w-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-6">
          <CheckCircle2 className="h-10 w-10" />
        </div>
        <h2 className="text-2xl font-bold text-slate-800 mb-2">แจ้งซ่อมสำเร็จ!</h2>
        <p className="text-slate-600 mb-6">
          คุณสามารถใช้เบอร์โทร <span className="font-bold text-emerald-600">{phone}</span><br/>เพื่อเช็คสถานะงานซ่อมได้ตลอดเวลา
        </p>

        {/* 🌟 2. ปรับกล่องรหัสบิลให้สามารถกดคัดลอกได้ */}
        <div 
          onClick={() => {
            navigator.clipboard.writeText(queueRef)
            toast({ 
              title: "✅ คัดลอกรหัสบิลสำเร็จ", 
              description: "สามารถนำไปวางหน้าเช็คสถานะได้เลยครับ" 
            })
          }}
          className="bg-slate-50 border-2 border-dashed border-emerald-300 rounded-xl p-6 w-full mb-6 relative overflow-hidden cursor-pointer hover:bg-emerald-50 transition-all active:scale-95 group"
        >
          <div className="absolute top-0 left-0 w-full h-2 bg-emerald-500"></div>
          <p className="text-sm text-slate-500 mb-1 group-hover:text-emerald-600 transition-colors">รหัสบิลของคุณคือ</p>
          <div className="flex items-center justify-center gap-3">
            <p className="text-4xl font-black text-emerald-700 tracking-wider">{queueRef}</p>
            <Copy className="h-6 w-6 text-emerald-500 opacity-60 group-hover:opacity-100 transition-opacity" />
          </div>
          <p className="text-xs text-emerald-600 mt-2 font-medium opacity-80">👉 แตะที่นี่เพื่อคัดลอกรหัส</p>
        </div>

        <div className="flex flex-col gap-3 w-full">
          <Button 
            className="w-full h-12 text-base bg-emerald-600 hover:bg-emerald-700 shadow-md" 
            onClick={() => {
              setIsSuccess(false)
              setActiveTab("status")
            }}
          >
            ไปหน้าเช็คสถานะ
          </Button>
          <Button 
            variant="ghost"
            className="w-full h-12 text-slate-500 hover:bg-slate-50" 
            onClick={() => {
              setIsSuccess(false)
              setServiceName(""); setDeviceModel(""); setDeviceColor(""); setIssue(""); setCustomerName(""); setPhone("")
            }}
          >
            แจ้งซ่อมเครื่องอื่นเพิ่มเติม
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-md space-y-0 drop-shadow-2xl">
      <div className="bg-white px-6 pt-8 pb-4 rounded-t-[1.5rem] border-b border-slate-100 flex flex-col items-center text-center relative z-10">
        <Avatar className="h-16 w-16 border-[3px] border-white shadow-md mb-3 bg-white">
          {currentShopLogo ? <AvatarImage src={currentShopLogo} className="object-cover" /> : <AvatarFallback className="bg-emerald-100 text-emerald-700 text-2xl font-black">{getInitial(currentShopName)}</AvatarFallback>}
        </Avatar>
        <h1 className="text-2xl font-bold text-slate-800 tracking-tight">{currentShopName}</h1>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full mt-5">
          <TabsList className="grid w-full grid-cols-2 bg-slate-100/80 p-1.5 rounded-xl h-14 border border-slate-200/50">
            <TabsTrigger value="booking" className="rounded-lg text-sm font-bold data-[state=active]:bg-white data-[state=active]:text-emerald-700 data-[state=active]:shadow-sm transition-all flex items-center justify-center gap-2 h-full">
              <PenLine className="w-4 h-4"/> แจ้งซ่อม
            </TabsTrigger>
            <TabsTrigger value="status" className="rounded-lg text-sm font-bold data-[state=active]:bg-white data-[state=active]:text-blue-700 data-[state=active]:shadow-sm transition-all flex items-center justify-center gap-2 h-full">
              <Search className="w-4 h-4"/> เช็คสถานะ
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className={activeTab === "booking" ? "block" : "hidden"}>
        <Card className="border-0 rounded-t-none rounded-b-[1.5rem] bg-white relative z-0 shadow-none">
          <CardContent className="space-y-6 pt-6 px-5 sm:px-6">
            <div className="space-y-3">
              <Label htmlFor="serviceName" className="text-base font-semibold flex items-center gap-2">
                <PenLine className="h-4 w-4 text-emerald-600" /> 1. บริการที่ต้องการ <span className="text-red-500">*</span>
              </Label>
              <Input id="serviceName" placeholder="พิมพ์บริการ หรือ อาการหลัก..." value={serviceName} onChange={(e) => setServiceName(e.target.value)} className="border-slate-200 focus-visible:ring-emerald-500 bg-slate-50" />
              <div className="flex flex-wrap gap-2 pt-1">
                {COMMON_SERVICES.map((service) => (
                  <button key={service} type="button" onClick={() => handleChipClick(service)} className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${ serviceName === service ? "bg-emerald-600 text-white border-emerald-600" : "bg-white text-slate-600 border-slate-200 hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-700"}`}>
                    {service}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4 rounded-xl bg-slate-50/50 p-4 border border-slate-100">
              <Label className="text-base font-semibold flex items-center gap-2"><Smartphone className="h-4 w-4 text-emerald-600" /> 2. ข้อมูลตัวเครื่อง</Label>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label className="text-sm">รุ่นมือถือ <span className="text-red-500">*</span></Label><Input placeholder="เช่น iPhone 13" value={deviceModel} onChange={(e) => setDeviceModel(e.target.value)} className="bg-white" /></div>
                <div className="space-y-2"><Label className="text-sm">สีเครื่อง</Label><Input placeholder="เช่น ดำ" value={deviceColor} onChange={(e) => setDeviceColor(e.target.value)} className="bg-white" /></div>
              </div>
              <div className="space-y-2"><Label className="text-sm">รายละเอียดเพิ่มเติม (ถ้ามี)</Label><Textarea placeholder="เช่น ทำตกจอแตก" className="resize-none bg-white min-h-[80px]" value={issue} onChange={(e) => setIssue(e.target.value)} /></div>
            </div>

            <div className="space-y-4">
              <Label className="text-base font-semibold flex items-center gap-2"><User className="h-4 w-4 text-emerald-600" /> 3. ข้อมูลติดต่อ</Label>
              <div className="space-y-2"><Label className="text-sm">ชื่อลูกค้า <span className="text-red-500">*</span></Label><Input placeholder="ชื่อ หรือ ชื่อเล่น" value={customerName} onChange={(e) => setCustomerName(e.target.value)} className="bg-slate-50 focus-visible:bg-white" /></div>
              <div className="space-y-2"><Label className="text-sm">เบอร์โทรศัพท์ <span className="text-red-500">*</span></Label><Input type="tel" placeholder="08x-xxx-xxxx (ใช้เช็คสถานะ)" value={phone} onChange={(e) => setPhone(e.target.value)} className="bg-slate-50 focus-visible:bg-white" /></div>
            </div>
          </CardContent>
          <CardFooter className="bg-white border-t border-slate-50 rounded-b-[1.5rem] pt-4 pb-6 px-5 sm:px-6">
            <Button onClick={handleSubmit} className="w-full bg-emerald-600 hover:bg-emerald-700 text-lg h-12 shadow-lg shadow-emerald-200/50 rounded-xl transition-all hover:scale-[1.02]" disabled={!serviceName || !deviceModel || !customerName || !phone || isSubmitting}>
              {isSubmitting ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> กำลังส่งข้อมูล...</> : "รับคิวแจ้งซ่อม"}
            </Button>
          </CardFooter>
        </Card>
      </div>

      <div className={activeTab === "status" ? "block" : "hidden"}>
        <div className="bg-white rounded-b-[1.5rem] shadow-none relative z-0 overflow-hidden min-h-[450px]">
          <CustomerQueueStatus shopId={shopId} />
        </div>
      </div>

    </div>
  )
}