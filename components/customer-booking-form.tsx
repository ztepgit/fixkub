"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Smartphone, Wrench, User, PenLine } from "lucide-react"

// 🌟 1. นำเข้า Server Action และ Toast
import { createQueue } from "@/actions/queue"
import { useToast } from "@/hooks/use-toast"

// รายการคำค้นหายอดฮิต (Suggestion Chips)
const COMMON_SERVICES = [
  "เปลี่ยนจอ",
  "เปลี่ยนแบต",
  "ติดฟิล์ม",
  "ชาร์จไม่เข้า",
  "เปิดไม่ติด",
  "โดนน้ำ",
  "ย้ายข้อมูล",
  "ปลดล็อคเครื่อง",
]

export function CustomerBookingForm() {
  const { toast } = useToast() // 🌟 เรียกใช้ระบบแจ้งเตือน
  const [isSubmitting, setIsSubmitting] = useState(false) // 🌟 State กันคนกดปุ่มเบิ้ล

  const [serviceName, setServiceName] = useState<string>("")
  const [deviceModel, setDeviceModel] = useState<string>("")
  const [deviceColor, setDeviceColor] = useState<string>("")
  const [issue, setIssue] = useState<string>("")
  const [customerName, setCustomerName] = useState<string>("")
  const [phone, setPhone] = useState<string>("")

  // ฟังก์ชันเมื่อลูกค้ากดปุ่มคำค้นหายอดฮิต
  const handleChipClick = (service: string) => {
    setServiceName(service)
  }

  // 🌟 2. ฟังก์ชันส่งข้อมูลเข้า Database
  const handleSubmit = async () => {
    setIsSubmitting(true)
    
    try {
      const response = await createQueue({
        shopId: "shop_test_001", // 🔴 ID ร้านทดสอบ
        customerName: customerName,
        phoneNumber: phone,
        deviceModel: deviceModel,
        deviceColor: deviceColor,
        issue: issue,
        serviceName: serviceName, // ส่งบริการไปด้วย
        isManualEntry: false, 
      })

      if (response.success) {
        toast({
          title: "✅ จองคิวสำเร็จ!",
          description: "ส่งข้อมูลให้ทางร้านเรียบร้อยแล้ว",
        })
        
        // เคลียร์ฟอร์มให้ว่างหลังส่งเสร็จ
        setServiceName("")
        setDeviceModel("")
        setDeviceColor("")
        setIssue("")
        setCustomerName("")
        setPhone("")
      } else {
        toast({
          title: "❌ เกิดข้อผิดพลาด",
          description: response.error,
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "❌ เกิดข้อผิดพลาด",
        description: "ระบบขัดข้อง กรุณาลองใหม่อีกครั้ง",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-md space-y-4">
      <Card className="border-emerald-100 shadow-md">
        <CardHeader className="bg-emerald-50/50 pb-6 text-center rounded-t-xl border-b border-emerald-100">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
            <Wrench className="h-6 w-6 text-emerald-600" />
          </div>
          <CardTitle className="text-2xl text-emerald-950">แจ้งซ่อมมือถือ</CardTitle>
          <CardDescription>กรอกข้อมูลเบื้องต้นเพื่อรับคิวซ่อม</CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6 pt-6">
          
          {/* หมวดบริการ (พิมพ์เอง + Suggestion Chips) */}
          <div className="space-y-3">
            <Label htmlFor="serviceName" className="text-base font-semibold flex items-center gap-2">
              <PenLine className="h-4 w-4" /> 1. บริการที่ต้องการ <span className="text-red-500">*</span>
            </Label>
            <Input 
              id="serviceName" 
              placeholder="พิมพ์บริการ หรือ อาการหลักที่ต้องการซ่อม..." 
              value={serviceName}
              onChange={(e) => setServiceName(e.target.value)}
              className="border-emerald-200 focus-visible:ring-emerald-500"
            />
            
            {/* ปุ่มทางลัด (Tags/Chips) */}
            <div className="flex flex-wrap gap-2 pt-1">
              {COMMON_SERVICES.map((service) => (
                <button
                  key={service}
                  type="button"
                  onClick={() => handleChipClick(service)}
                  className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                    serviceName === service 
                      ? "bg-emerald-600 text-white border-emerald-600" 
                      : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-700"
                  }`}
                >
                  {service}
                </button>
              ))}
            </div>
          </div>

          {/* ข้อมูลเครื่อง */}
          <div className="space-y-4 rounded-lg bg-slate-50 p-4 border border-slate-100">
            <Label className="text-base font-semibold flex items-center gap-2">
              <Smartphone className="h-4 w-4" /> 2. ข้อมูลตัวเครื่อง
            </Label>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="deviceModel">รุ่นมือถือ <span className="text-red-500">*</span></Label>
                <Input 
                  id="deviceModel" 
                  placeholder="เช่น iPhone 13" 
                  value={deviceModel}
                  onChange={(e) => setDeviceModel(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="deviceColor">สีเครื่อง</Label>
                <Input 
                  id="deviceColor" 
                  placeholder="เช่น ดำ" 
                  value={deviceColor}
                  onChange={(e) => setDeviceColor(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="issue">รายละเอียดอาการเพิ่มเติม</Label>
              <Textarea 
                id="issue" 
                placeholder="อธิบายอาการเพิ่มเติม (ถ้ามี) เช่น ทำตกจอแตก ทัชไม่ได้ฝั่งขวา"
                className="resize-none"
                rows={2}
                value={issue}
                onChange={(e) => setIssue(e.target.value)}
              />
            </div>
          </div>

          {/* ข้อมูลลูกค้า */}
          <div className="space-y-4">
            <Label className="text-base font-semibold flex items-center gap-2">
              <User className="h-4 w-4" /> 3. ข้อมูลติดต่อ
            </Label>
            <div className="space-y-2">
              <Label htmlFor="name">ชื่อลูกค้า <span className="text-red-500">*</span></Label>
              <Input 
                id="name" 
                placeholder="ชื่อ หรือ ชื่อเล่น" 
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">เบอร์โทรศัพท์ (ถ้ามี)</Label>
              <Input 
                id="phone" 
                type="tel" 
                placeholder="08x-xxx-xxxx" 
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
          </div>
        </CardContent>

        <CardFooter className="bg-slate-50 border-t rounded-b-xl pt-4 pb-6">
          {/* 🌟 3. ผูกปุ่มเข้ากับฟังก์ชัน handleSubmit */}
          <Button 
            onClick={handleSubmit} 
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-lg py-6 shadow-lg shadow-emerald-200" 
            disabled={!serviceName || !deviceModel || !customerName || isSubmitting}
          >
            {isSubmitting ? "กำลังส่งข้อมูล..." : "รับคิวแจ้งซ่อม"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}