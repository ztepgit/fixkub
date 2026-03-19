"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { createQueue } from "@/actions/queue"
import { useToast } from "@/hooks/use-toast"
import { Loader2 } from "lucide-react"

// 🌟 1. เพิ่มรายการบริการที่เจอบ่อย
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

export function ShopOwnerCreateQueue({ onSuccess, onCancel }: { onSuccess: () => void, onCancel: () => void }) {
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [customerName, setCustomerName] = useState("")
  const [phone, setPhone] = useState("")
  const [deviceModel, setDeviceModel] = useState("")
  const [deviceColor, setDeviceColor] = useState("")
  // 🌟 เพิ่ม State สำหรับ S/N และ IMEI
  const [serialNumber, setSerialNumber] = useState("")
  const [imei, setImei] = useState("")
  const [issue, setIssue] = useState("")
  const [serviceName, setServiceName] = useState("")

  const handleChipClick = (service: string) => {
    setServiceName(service)
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)
    try {
      const response = await createQueue({
        shopId: "shop_test_001",
        customerName,
        phoneNumber: phone,
        deviceModel,
        deviceColor,
        serialNumber, // 🌟 ส่งข้อมูลไปบันทึก
        imei,         // 🌟 ส่งข้อมูลไปบันทึก
        issue,
        serviceName,
        isManualEntry: true,
      })

      if (response.success) {
        toast({ title: "✅ สร้างคิวสำเร็จ", description: "เพิ่มรายการซ่อมเข้าสู่ระบบแล้ว" })
        onSuccess() 
      } else {
        toast({ title: "❌ เกิดข้อผิดพลาด", description: response.error, variant: "destructive" })
      }
    } catch (error) {
      toast({ title: "❌ เกิดข้อผิดพลาด", description: "ระบบขัดข้อง กรุณาลองใหม่อีกครั้ง", variant: "destructive" })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-slate-100 flex flex-col w-full">
      {/* ส่วนหัว */}
      <div className="bg-slate-800 p-5 text-white flex justify-between items-center shrink-0">
        <div>
          <h2 className="text-lg font-bold">สร้างใบสั่งซ่อมใหม่</h2>
          <p className="text-xs text-slate-300 mt-1">กรอกข้อมูลลูกค้าและเครื่องเพื่อรับคิว</p>
        </div>
      </div>

      <div className="p-6 flex flex-col gap-8 overflow-y-auto max-h-[75vh]">
        
        {/* แถวที่ 1: ลูกค้า & เบอร์โทร */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8">
          <div className="flex flex-col gap-2.5">
            <Label htmlFor="customerName" className="font-semibold text-slate-700">ชื่อลูกค้า <span className="text-red-500">*</span></Label>
            <Input 
              id="customerName" 
              placeholder="ชื่อ หรือ ชื่อเล่น" 
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2.5">
            <Label htmlFor="phone" className="font-semibold text-slate-700">เบอร์โทรศัพท์ <span className="text-red-500">*</span></Label>
            <Input 
              id="phone" 
              type="tel" 
              placeholder="08x-xxx-xxxx" 
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
        </div>

        {/* แถวที่ 2: รุ่น & สี */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8">
          <div className="flex flex-col gap-2.5">
            <Label htmlFor="deviceModel" className="font-semibold text-slate-700">รุ่นมือถือ/iPad หรืออื่นๆ<span className="text-red-500">*</span></Label>
            <Input 
              id="deviceModel" 
              placeholder="เช่น iPhone 13" 
              value={deviceModel}
              onChange={(e) => setDeviceModel(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2.5">
            <Label htmlFor="deviceColor" className="font-semibold text-slate-700">สีเครื่อง</Label>
            <Input 
              id="deviceColor" 
              placeholder="เช่น ดำ" 
              value={deviceColor}
              onChange={(e) => setDeviceColor(e.target.value)}
            />
          </div>
        </div>

        {/* 🌟 แถวที่ 3 (ใหม่): S/N & IMEI (ไม่บังคับกรอก) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8">
          <div className="flex flex-col gap-2.5">
            <Label htmlFor="serialNumber" className="font-semibold text-slate-700">Serial Number <span className="text-xs text-slate-400 font-normal">(ไม่บังคับ)</span></Label>
            <Input 
              id="serialNumber" 
              placeholder="กรอก S/N ตัวเครื่อง" 
              value={serialNumber}
              onChange={(e) => setSerialNumber(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2.5">
            <Label htmlFor="imei" className="font-semibold text-slate-700">IMEI <span className="text-xs text-slate-400 font-normal">(ไม่บังคับ)</span></Label>
            <Input 
              id="imei" 
              placeholder="กรอกเลข IMEI 15 หลัก" 
              value={imei}
              onChange={(e) => setImei(e.target.value)}
            />
          </div>
        </div>

        {/* แถวที่ 4: บริการที่ต้องการ */}
        <div className="flex flex-col gap-3">
          <Label htmlFor="serviceName" className="font-semibold text-slate-700">บริการที่ต้องการ</Label>
          <Input 
            id="serviceName" 
            placeholder="เช่น เปลี่ยนจอ, เปลี่ยนแบต" 
            value={serviceName}
            onChange={(e) => setServiceName(e.target.value)}
            className="focus-visible:ring-emerald-500"
          />
          <div className="flex flex-wrap gap-2 pt-1">
            {COMMON_SERVICES.map((service) => (
              <button
                key={service}
                type="button"
                onClick={() => handleChipClick(service)}
                className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                  serviceName === service 
                    ? "bg-emerald-600 text-white border-emerald-600 shadow-sm" 
                    : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-700"
                }`}
              >
                {service}
              </button>
            ))}
          </div>
        </div>

        {/* แถวที่ 5: อาการเสีย */}
        <div className="flex flex-col gap-2.5">
          <Label htmlFor="issue" className="font-semibold text-slate-700">อาการเสีย / หมายเหตุ</Label>
          <Textarea 
            id="issue" 
            placeholder="อธิบายอาการเพิ่มเติม..."
            className="resize-none"
            rows={3}
            value={issue}
            onChange={(e) => setIssue(e.target.value)}
          />
        </div>
      </div>

      {/* ส่วน Footer (จัดขวา) */}
      <div className="bg-slate-50 p-5 border-t border-slate-100 flex flex-row justify-end items-center gap-3 w-full shrink-0 mt-auto">
        <Button variant="outline" onClick={onCancel} disabled={isSubmitting} className="min-w-[100px]">
          ยกเลิก
        </Button>
        <Button 
          onClick={handleSubmit} 
          className="bg-emerald-600 hover:bg-emerald-700 min-w-[120px]" 
          disabled={!customerName || !deviceModel || !phone || isSubmitting}
        >
          {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          {isSubmitting ? "กำลังบันทึก..." : "บันทึกข้อมูล"}
        </Button>
      </div>
    </div>
  )
}