"use client"

import { useState, useEffect } from "react"
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
} from "@/components/ui/dialog"
import { Wrench, Banknote, Barcode, Hash, Loader2 } from "lucide-react"

// 🌟 1. กำหนด Interface รับค่ามาจาก QueueBoard
interface QueueDetailDialogProps {
  job: any
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (jobId: string, data: { estimatedPrice: string, serialNumber: string, imei: string }) => Promise<void>
}

export function QueueDetailDialog({ job, open, onOpenChange, onSave }: QueueDetailDialogProps) {
  
  // State สำหรับข้อมูลที่ช่างต้องกรอกเพิ่ม
  const [estimatedPrice, setEstimatedPrice] = useState("")
  const [serialNumber, setSerialNumber] = useState("")
  const [imei, setImei] = useState("")
  const [isSaving, setIsSaving] = useState(false)

  // 🌟 2. ดึงค่าเดิมของคิวนี้มาใส่ในช่อง Input อัตโนมัติเวลาเปิดขึ้นมา
  useEffect(() => {
    if (job) {
      setEstimatedPrice(job.estimatedPrice || "")
      setSerialNumber(job.serialNumber || "")
      setImei(job.imei || "")
    }
  }, [job])

  const handleSave = async () => {
    if (!job) return
    setIsSaving(true)
    
    // ส่งข้อมูลกลับไปให้ QueueBoard จัดการต่อ
    await onSave(job.id, { estimatedPrice, serialNumber, imei })
    
    setIsSaving(false)
  }

  // 🌟 ฟังก์ชันแปลสถานะเป็นภาษาไทย
  const translateStatus = (status: string) => {
    switch (status) {
      case "PENDING": return "รอยืนยัน"
      case "WAITING": return "รอคิวซ่อม"
      case "PROCESSING": return "กำลังซ่อม"
      case "REPAIRED": return "ซ่อมเสร็จแล้ว"
      case "COMPLETED": return "ปิดจ๊อบ"
      case "CANCELLED": return "ยกเลิกแล้ว"
      case "ARCHIVED": return "เข้าคลังดอง"
      default: return status
    }
  }

  if (!job) return null // ถ้าไม่มีงานที่เลือก ไม่ต้องเรนเดอร์อะไร

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <div className="flex items-center justify-between pr-6">
            <DialogTitle className="text-xl">
              รายละเอียดคิว <span className="text-blue-600">{job.jobRef || "รอรันเลขบิล"}</span>
            </DialogTitle>
            <span className="text-xs font-medium px-2.5 py-1 bg-amber-100 text-amber-700 rounded-full">
              {translateStatus(job.status)}
            </span>
          </div>
          <DialogDescription>
            ตรวจสอบข้อมูลลูกค้าและบันทึกรายละเอียดเชิงลึกสำหรับงานซ่อม
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 py-4">
          {/* Section 1: ข้อมูลเบื้องต้น */}
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-y-4 gap-x-2">
              <div>
                <span className="text-slate-500 block mb-1 text-xs">ลูกค้า</span>
                <p className="font-medium text-slate-900">
                  {job.customerName} {(job.phoneNumber || job.phone) && <span className="text-slate-500 font-normal text-xs ml-1">({job.phoneNumber || job.phone})</span>}
                </p>
              </div>
              <div>
                <span className="text-slate-500 block mb-1 text-xs">บริการ / อาการ</span>
                <p className="font-medium text-blue-700">{job.serviceName || "ทั่วไป"}</p>
              </div>
              <div>
                <span className="text-slate-500 block mb-1 text-xs">รุ่นเครื่อง</span>
                <p className="font-medium text-slate-900">
                  {job.deviceModel} {job.deviceColor && <span className="text-slate-500 font-normal text-xs ml-1">(สี{job.deviceColor})</span>}
                </p>
              </div>
              <div>
                <span className="text-slate-500 block mb-1 text-xs">หมายเหตุเพิ่มเติม</span>
                <p className="font-medium text-slate-900 line-clamp-2" title={job.issue}>{job.issue || "-"}</p>
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
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>ปิดหน้าต่าง</Button>
          <Button className="bg-blue-600 hover:bg-blue-700" onClick={handleSave} disabled={isSaving}>
            {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            บันทึกข้อมูล
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}