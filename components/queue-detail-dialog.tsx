"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Wrench, Banknote, Barcode, Hash, MoreHorizontal } from "lucide-react"

// Mock ข้อมูลที่ถูกส่งมาจากการ์ดคิวงาน
const mockQueueData = {
  queueNumber: "Q-014",
  serviceName: "เปลี่ยนจอ",
  deviceModel: "iPhone 13",
  deviceColor: "ดำ",
  issue: "จอแตกมุมขวาล่าง ทัชไม่ได้บางจุด",
  customerName: "คุณเอก",
  phone: "081-234-5678",
  status: "รอประเมินราคา",
}

export function QueueDetailDialog() {
  const [isOpen, setIsOpen] = useState(false)
  
  // State สำหรับข้อมูลที่ช่างต้องกรอกเพิ่ม
  const [estimatedPrice, setEstimatedPrice] = useState("")
  const [serialNumber, setSerialNumber] = useState("")
  const [imei, setImei] = useState("")

  const handleSave = () => {
    // TODO: เรียก Server Action เพื่ออัปเดตข้อมูลลง Database
    console.log("บันทึกข้อมูลช่าง:", { estimatedPrice, serialNumber, imei })
    
    // บันทึกเสร็จแล้วปิด Dialog
    setIsOpen(false)
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      {/* ปุ่ม Trigger นี้ใช้สำหรับเทส ถ้าใช้งานจริงบนการ์ดคิว 
        เราจะเอา Dialog ไปครอบ DropdownMenuItem "รายละเอียด" แทนครับ
      */}
      <DialogTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2">
          <MoreHorizontal className="h-4 w-4" /> จำลองปุ่มเปิดรายละเอียด
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <div className="flex items-center justify-between pr-6">
            <DialogTitle className="text-xl">
              รายละเอียดคิว <span className="text-blue-600">{mockQueueData.queueNumber}</span>
            </DialogTitle>
            <span className="text-xs font-medium px-2.5 py-1 bg-amber-100 text-amber-700 rounded-full">
              {mockQueueData.status}
            </span>
          </div>
          <DialogDescription>
            ตรวจสอบข้อมูลลูกค้าและบันทึกรายละเอียดเชิงลึกสำหรับงานซ่อม
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 py-4">
          {/* Section 1: ข้อมูลเบื้องต้น (แบบอ่านอย่างเดียว เน้นดูง่ายๆ) */}
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-y-4 gap-x-2">
              <div>
                <span className="text-slate-500 block mb-1 text-xs">ลูกค้า</span>
                <p className="font-medium text-slate-900">
                  {mockQueueData.customerName} {mockQueueData.phone && <span className="text-slate-500 font-normal">({mockQueueData.phone})</span>}
                </p>
              </div>
              <div>
                <span className="text-slate-500 block mb-1 text-xs">บริการ / อาการ</span>
                <p className="font-medium text-blue-700">{mockQueueData.serviceName}</p>
              </div>
              <div>
                <span className="text-slate-500 block mb-1 text-xs">รุ่นเครื่อง</span>
                <p className="font-medium text-slate-900">
                  {mockQueueData.deviceModel} {mockQueueData.deviceColor && <span className="text-slate-500 font-normal">(สี{mockQueueData.deviceColor})</span>}
                </p>
              </div>
              <div>
                <span className="text-slate-500 block mb-1 text-xs">หมายเหตุเพิ่มเติม</span>
                <p className="font-medium text-slate-900">{mockQueueData.issue || "-"}</p>
              </div>
            </div>
          </div>

          {/* Section 2: ฟอร์มสำหรับช่าง (Editable) */}
          <div className="space-y-4">
            <h4 className="font-semibold text-slate-800 flex items-center gap-2 border-b pb-2">
              <Wrench className="h-4 w-4 text-slate-500" /> ข้อมูลสำหรับช่าง (Optional)
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="estimatedPrice" className="text-slate-600 flex items-center gap-1">
                  <Banknote className="h-3.5 w-3.5" /> ราคาประเมิน (บาท)
                </Label>
                <Input
                  id="estimatedPrice"
                  type="number"
                  placeholder="เช่น 1500"
                  value={estimatedPrice}
                  onChange={(e) => setEstimatedPrice(e.target.value)}
                  className="max-w-[200px]"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="serialNumber" className="text-slate-600 flex items-center gap-1">
                  <Barcode className="h-3.5 w-3.5" /> Serial Number
                </Label>
                <Input
                  id="serialNumber"
                  placeholder="กรอก S/N เครื่อง"
                  value={serialNumber}
                  onChange={(e) => setSerialNumber(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="imei" className="text-slate-600 flex items-center gap-1">
                  <Hash className="h-3.5 w-3.5" /> IMEI
                </Label>
                <Input
                  id="imei"
                  placeholder="กรอกเลข IMEI 15 หลัก"
                  value={imei}
                  onChange={(e) => setImei(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => setIsOpen(false)}>ปิดหน้าต่าง</Button>
          <Button className="bg-blue-600 hover:bg-blue-700" onClick={handleSave}>
            บันทึกข้อมูล
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}