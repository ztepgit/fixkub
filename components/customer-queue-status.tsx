"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Smartphone,
  Wrench,
  RefreshCw,
  XCircle,
  CheckCircle2,
  Clock,
  PackageCheck,
  ClipboardList
} from "lucide-react"

// จำลองข้อมูลจาก Database (ตาราง Queue)
const MOCK_TICKET = {
  jobRef: "REP-0105",
  customerName: "คุณปิ๊ก",
  deviceModel: "iPhone 13 Pro",
  deviceColor: "Sierra Blue",
  serviceName: "เปลี่ยนจอ / ทัชสกรีน",
  issue: "ทำตกจอแตก ทัชไม่ได้ฝั่งขวา",
  // ลองเปลี่ยนค่า status ตรงนี้ดูครับ: PENDING, WAITING, PROCESSING, REPAIRED
  status: "PROCESSING",
  estimatedWait: "ประมาณ 1-2 ชั่วโมง",
}

export function CustomerQueueStatus() {
  // ฟังก์ชันช่วยกำหนดสีและไอคอนตามสถานะ
  const getStatusDisplay = (status: string) => {
    switch (status) {
      case "PENDING":
        return { text: "รอยืนยันคิว", color: "bg-slate-500", icon: <ClipboardList className="h-6 w-6" /> }
      case "WAITING":
        return { text: "รอคิวซ่อม", color: "bg-orange-500", icon: <Clock className="h-6 w-6" /> }
      case "PROCESSING":
        return { text: "ช่างกำลังซ่อม", color: "bg-blue-500", icon: <Wrench className="h-6 w-6" /> }
      case "REPAIRED":
        return { text: "ซ่อมเสร็จแล้ว! (รอรับเครื่อง)", color: "bg-emerald-500", icon: <PackageCheck className="h-6 w-6" /> }
      case "COMPLETED":
        return { text: "ส่งมอบเรียบร้อย", color: "bg-emerald-700", icon: <CheckCircle2 className="h-6 w-6" /> }
      default:
        return { text: "ไม่ทราบสถานะ", color: "bg-slate-500", icon: <Clock className="h-6 w-6" /> }
    }
  }

  const currentStatus = getStatusDisplay(MOCK_TICKET.status)

  return (
    <div className="mx-auto w-full max-w-md space-y-4 pt-4">
      <Card className="border-emerald-100 shadow-lg overflow-hidden relative">

        {/* แถบสีด้านบนสุดเพื่อบอกสถานะคร่าวๆ */}
        <div className={`h-2 w-full ${currentStatus.color}`} />

        <CardHeader className="text-center pb-2">
          <CardTitle className="text-sm font-medium text-slate-500 uppercase tracking-wider">
            รหัสใบแจ้งซ่อม
          </CardTitle>
          <div className="text-4xl font-black text-emerald-950 tracking-tight mt-1">
            {MOCK_TICKET.jobRef}
          </div>
        </CardHeader>

        <CardContent className="space-y-6 pt-4">

          {/* ป้ายสถานะ (Status Badge) เบิ้มๆ */}
          <div className={`mx-auto flex flex-col items-center justify-center p-4 rounded-2xl text-white ${currentStatus.color} shadow-sm transition-all duration-500`}>
            <div className="mb-2 bg-white/20 p-3 rounded-full animate-pulse">
              {currentStatus.icon}
            </div>
            <h3 className="text-xl font-bold">{currentStatus.text}</h3>
            {MOCK_TICKET.status === "PROCESSING" && (
              <p className="text-sm text-white/90 mt-1">เวลาประเมิน: {MOCK_TICKET.estimatedWait}</p>
            )}
          </div>

          {/* ข้อมูลเครื่องและอาการ (สรุป) */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-3 text-sm">
            <div className="flex justify-between items-start">
              <div className="text-slate-500">รุ่นมือถือ:</div>
              <div className="font-semibold text-right flex items-center gap-1">
                <Smartphone className="h-4 w-4 text-emerald-600" />
                {MOCK_TICKET.deviceModel} ({MOCK_TICKET.deviceColor})
              </div>
            </div>
            <Separator className="bg-slate-200" />
            <div className="flex justify-between items-start">
              <div className="text-slate-500">บริการ:</div>
              <div className="font-semibold text-right">{MOCK_TICKET.serviceName}</div>
            </div>
            <Separator className="bg-slate-200" />
            <div className="flex justify-between items-start">
              <div className="text-slate-500 w-1/3">อาการเสีย:</div>
              <div className="font-medium text-right text-slate-700 w-2/3 break-words">
                {MOCK_TICKET.issue}
              </div>
            </div>
            <Separator className="bg-slate-200" />
            <div className="flex justify-between items-start">
              <div className="text-slate-500">ชื่อลูกค้า:</div>
              <div className="font-medium text-right">{MOCK_TICKET.customerName}</div>
            </div>
          </div>

        </CardContent>

        <CardFooter className="flex flex-col gap-3 bg-slate-50 border-t pt-4">
          <Button variant="outline" className="w-full h-12 text-emerald-700 border-emerald-200 hover:bg-emerald-50">
            <RefreshCw className="mr-2 h-4 w-4" /> อัปเดตสถานะ
          </Button>

          {/* โชว์ปุ่มยกเลิก เฉพาะตอนที่ยังไม่เริ่มซ่อม */}
          {(MOCK_TICKET.status === "PENDING" || MOCK_TICKET.status === "WAITING") && (
            <Button variant="ghost" className="w-full text-red-500 hover:text-red-600 hover:bg-red-50">
              <XCircle className="mr-2 h-4 w-4" /> ยกเลิกรายการซ่อม
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  )
}