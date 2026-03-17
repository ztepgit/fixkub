"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { createQueue } from "@/actions/queue"
import { useToast } from "@/hooks/use-toast"
import { Loader2 } from "lucide-react"

export function ShopOwnerCreateQueue({ onSuccess, onCancel }: { onSuccess: () => void, onCancel: () => void }) {
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [customerName, setCustomerName] = useState("")
  const [phone, setPhone] = useState("")
  const [deviceModel, setDeviceModel] = useState("")
  const [deviceColor, setDeviceColor] = useState("")
  const [issue, setIssue] = useState("")
  const [serviceName, setServiceName] = useState("")

  const handleSubmit = async () => {
    setIsSubmitting(true)
    try {
      const response = await createQueue({
        shopId: "shop_test_001",
        customerName,
        phoneNumber: phone,
        deviceModel,
        deviceColor,
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
    <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-slate-100">
      <div className="bg-slate-800 p-4 text-white flex justify-between items-center">
        <div>
          <h2 className="text-lg font-bold">สร้างใบสั่งซ่อมใหม่</h2>
          <p className="text-xs text-slate-300">กรอกข้อมูลลูกค้าและเครื่องเพื่อรับคิว</p>
        </div>
      </div>

      <div className="p-6 space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="customerName">ชื่อลูกค้า <span className="text-red-500">*</span></Label>
            <Input 
              id="customerName" 
              placeholder="ชื่อ หรือ ชื่อเล่น" 
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            {/* 🌟 บังคับกรอกเบอร์โทร และมี * สีแดง */}
            <Label htmlFor="phone">เบอร์โทรศัพท์ <span className="text-red-500">*</span></Label>
            <Input 
              id="phone" 
              type="tel" 
              placeholder="08x-xxx-xxxx" 
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
        </div>

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
          <Label htmlFor="serviceName">บริการที่ต้องการ</Label>
          <Input 
            id="serviceName" 
            placeholder="เช่น เปลี่ยนจอ, เปลี่ยนแบต" 
            value={serviceName}
            onChange={(e) => setServiceName(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="issue">อาการเสีย / หมายเหตุ</Label>
          <Textarea 
            id="issue" 
            placeholder="อธิบายอาการเพิ่มเติม..."
            className="resize-none"
            rows={2}
            value={issue}
            onChange={(e) => setIssue(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-slate-50 p-4 border-t flex justify-end gap-3">
        <Button variant="outline" onClick={onCancel} disabled={isSubmitting}>
          ยกเลิก
        </Button>
        {/* 🌟 ล็อคปุ่มถ้าไม่กรอกเบอร์โทร (!phone) */}
        <Button 
          onClick={handleSubmit} 
          className="bg-emerald-600 hover:bg-emerald-700" 
          disabled={!customerName || !deviceModel || !phone || isSubmitting}
        >
          {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          {isSubmitting ? "กำลังบันทึก..." : "บันทึกข้อมูล"}
        </Button>
      </div>
    </div>
  )
}