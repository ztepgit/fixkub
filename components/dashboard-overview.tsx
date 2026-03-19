"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
// 🌟 Import Tooltip เพิ่มเติม
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useToast } from "@/hooks/use-toast"
import {
  Activity, Wrench, PackageCheck, Wallet, Smartphone, Loader2, User, Banknote,
  MoreHorizontal, ClipboardList, Barcode, Hash, Phone, Clock // 🌟 เพิ่ม Clock ตรงนี้
} from "lucide-react"

import { getDashboardStats } from "@/actions/dashboard"
import { updateQueueStatus } from "@/actions/queue"

const formatPhoneNumber = (phone?: string) => {
  if (!phone) return ""
  const cleaned = phone.replace(/\D/g, '')
  if (cleaned.length === 10) return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 6)}-${cleaned.slice(6)}`
  if (cleaned.length === 9) return `${cleaned.slice(0, 2)}-${cleaned.slice(2, 5)}-${cleaned.slice(5)}`
  return phone
}

// 🌟 สร้างฟังก์ชันแปลงวันที่แบบย่อ และแบบเต็ม (มีเวลา)
const formatShortDate = (date?: Date | string) => {
  if (!date) return ""
  return new Date(date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' })
}

const formatFullDateTime = (date?: Date | string) => {
  if (!date) return ""
  return new Date(date).toLocaleString('th-TH', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  }) + ' น.'
}

export function DashboardOverview() {
  const [stats, setStats] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)

  const [jobToView, setJobToView] = useState<any>(null)
  const [editPrice, setEditPrice] = useState("")
  const [editSn, setEditSn] = useState("")
  const [editImei, setEditImei] = useState("")
  const [isSaving, setIsSaving] = useState(false)

  const { toast } = useToast()

  const loadStats = async () => {
    if (!stats) setIsLoading(true)
    const res = await getDashboardStats("shop_test_001")
    if (res.success) {
      setStats(res.data)
    }
    setIsLoading(false)
  }

  useEffect(() => {
    loadStats()

    const channel = supabase
      .channel('dashboard_queue_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'Queue' },
        (payload) => {
          loadStats()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (jobToView) {
      setEditPrice(jobToView.estimatedPrice || "")
      setEditSn(jobToView.serialNumber || "")
      setEditImei(jobToView.imei || "")
    }
  }, [jobToView])

  const handleSaveDetails = async () => {
    if (!jobToView) return
    setIsSaving(true)

    const res = await updateQueueStatus(jobToView.id, jobToView.status, {
      estimatedPrice: editPrice ? parseFloat(editPrice) : null,
      serialNumber: editSn,
      imei: editImei
    })

    if (res.success) {
      toast({ title: "💾 บันทึกข้อมูลสำเร็จ", description: `อัปเดตรายละเอียดคิว ${jobToView.jobRef || ''} เรียบร้อยแล้ว` })
      setJobToView(null)
      loadStats()
    } else {
      toast({ title: "❌ เกิดข้อผิดพลาด", description: "ไม่สามารถบันทึกข้อมูลได้", variant: "destructive" })
    }
    setIsSaving(false)
  }

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

  if (isLoading && !stats) {
    return (
      <div className="flex h-64 w-full items-center justify-center text-slate-400 gap-3">
        <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
        <p>กำลังโหลดข้อมูลสถิติ...</p>
      </div>
    )
  }

  return (
    <TooltipProvider>
      <div className="space-y-6 relative">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">ภาพรวมของร้าน (Overview)</h2>
          <p className="text-sm text-slate-500">สรุปสถิติและสถานะงานซ่อมประจำวัน</p>
        </div>

        {/* 🌟 เปลี่ยน grid-cols-4 เป็น grid-cols-5 */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <Card className="shadow-sm border-blue-100">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">งานเข้าวันนี้</CardTitle>
              <Activity className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-800">{stats?.todayCount || 0} <span className="text-sm font-normal text-slate-500">รายการ</span></div>
              <p className="text-xs text-slate-500 mt-1">รายการลูกค้าแจ้งซ่อมวันนี้</p>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-amber-100">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">กำลังดำเนินการ</CardTitle>
              <Wrench className="h-4 w-4 text-amber-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-800">{stats?.activeCount || 0} <span className="text-sm font-normal text-slate-500">คิว</span></div>
              <p className="text-xs text-slate-500 mt-1">ลูกค้าแจ้งซ่อม/รอคิวซ่อม/กำลังแกะซ่อม</p>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-emerald-100">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">ซ่อมเสร็จแล้ว</CardTitle>
              <PackageCheck className="h-4 w-4 text-emerald-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-800">{stats?.readyCount || 0} <span className="text-sm font-normal text-slate-500">เครื่อง</span></div>
              <p className="text-xs text-slate-500 mt-1">ซ่อมเสร็จแล้ว รอเก็บเงิน</p>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-indigo-100 bg-indigo-50/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-indigo-700">รายได้วันนี้</CardTitle>
              <Wallet className="h-4 w-4 text-indigo-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-indigo-900">฿{(stats?.revenueToday || 0).toLocaleString()}</div>
              <p className="text-xs text-indigo-600/70 mt-1">เก็บเงินแล้ว</p>
            </CardContent>
          </Card>

          {/* 🌟 การ์ดใบที่ 5: เวลาซ่อมเฉลี่ย */}
          <Card className="shadow-sm border-purple-100 bg-purple-50/30">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-purple-700">เวลาซ่อมเฉลี่ย</CardTitle>
              <Clock className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-xl md:text-2xl font-bold text-purple-900">{stats?.avgRepairTimeText || "-"}</div>
              <p className="text-[10px] md:text-xs text-purple-600/70 mt-1">เวลาเฉลี่ยบนโต๊ะช่าง</p>
            </CardContent>
          </Card>
        </div>

        <Card className="shadow-sm border-slate-200">
          <CardHeader>
            <CardTitle>รายการอัปเดตล่าสุด</CardTitle>
            <CardDescription>5 คิวซ่อมล่าสุดที่มีการเคลื่อนไหวในระบบ</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats?.recentJobs?.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-4">ยังไม่มีข้อมูลงานซ่อม</p>
              ) : (
                stats?.recentJobs.map((job: any) => (
                  <div key={job.id} className="flex items-start justify-between border-b pb-4 last:border-0 last:pb-0">
                    <div className="flex items-start gap-3 sm:gap-4">
                      <div className="h-10 w-10 mt-0.5 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                        <Smartphone className="h-5 w-5 text-slate-600" />
                      </div>
                      <div className="space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-bold text-slate-800">
                            {job.deviceModel} {job.deviceColor && <span className="text-xs font-normal text-slate-500">(สี{job.deviceColor})</span>}
                          </p>
                          <Badge variant="outline" className="bg-slate-50 text-slate-500 border-slate-200 h-5 px-1.5 text-[10px]">
                            {job.jobRef || `Q-${job.id.slice(-4).toUpperCase()}`}
                          </Badge>
                        </div>

                        <div className="flex items-center gap-1.5 text-xs text-slate-600 flex-wrap">
                          <span className="font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                            {job.serviceName || "ทั่วไป"}
                          </span>
                          {job.issue && <span className="text-slate-500 line-clamp-1 max-w-[200px]">- {job.issue}</span>}
                        </div>

                        <div className="flex items-center gap-3 text-xs text-slate-500 pt-1 flex-wrap">
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" /> {job.customerName}
                          </span>
                          {job.phoneNumber && (
                            <span className="flex items-center gap-1">
                              <Phone className="h-3 w-3" /> {formatPhoneNumber(job.phoneNumber)}
                            </span>
                          )}
                          <span className="flex items-center gap-1 text-blue-600 font-medium">
                            <Banknote className="h-3 w-3" />
                            {job.estimatedPrice ? `฿${parseInt(job.estimatedPrice).toLocaleString()}` : "ยังไม่ประเมิน"}
                          </span>
                        </div>

                        {(job.serialNumber || job.imei) && (
                          <div className="flex items-center gap-4 text-[10px] text-slate-400 pt-1">
                            {job.serialNumber && (
                              <span className="flex items-center gap-1">
                                S/N: <span className="text-slate-500">{job.serialNumber}</span>
                              </span>
                            )}
                            {job.imei && (
                              <span className="flex items-center gap-1">
                                IMEI: <span className="text-slate-500">{job.imei}</span>
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="text-right shrink-0 flex flex-col items-end gap-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={
                          job.status === "COMPLETED" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                            job.status === "CANCELLED" || job.status === "ARCHIVED" ? "bg-rose-50 text-rose-700 border-rose-200" :
                              "bg-blue-50 text-blue-700 border-blue-200"
                        }>
                          {translateStatus(job.status)}
                        </Badge>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-slate-600">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-52">
                            <DropdownMenuItem className="cursor-pointer" onClick={() => setJobToView(job)}>
                              <ClipboardList className="mr-2 h-4 w-4 text-blue-600" />
                              รายละเอียด / ประเมินราคา
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      {/* 🌟 แสดงวันที่แบบมี Tooltip โชว์เวลาเต็มๆ */}
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <p className="text-[10px] text-slate-400 mr-9 cursor-help">
                            {formatShortDate(job.createdAt)}
                          </p>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{formatFullDateTime(job.createdAt)}</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Dialog open={!!jobToView} onOpenChange={(open) => { if (!open) setJobToView(null) }}>
          <DialogContent className="sm:max-w-[550px]">
            <DialogHeader>
              <div className="flex items-center justify-between pr-6">
                <DialogTitle className="text-xl">
                  รายละเอียดคิว <span className="text-blue-600">{jobToView?.jobRef || `Q-${jobToView?.id?.slice(-4).toUpperCase()}`}</span>
                </DialogTitle>
                <span className="text-xs font-medium px-2.5 py-1 bg-slate-100 text-slate-700 rounded-full border border-slate-200">
                  {jobToView ? translateStatus(jobToView.status) : ""}
                </span>
              </div>
              <DialogDescription>
                ตรวจสอบข้อมูลลูกค้าและบันทึกรายละเอียดเชิงลึกสำหรับงานซ่อม
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-6 py-2">
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 space-y-4 text-sm">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-4">
                  <div>
                    <span className="text-slate-500 block mb-1 text-xs">ลูกค้า</span>
                    <p className="font-medium text-slate-900">
                      {jobToView?.customerName} {jobToView?.phoneNumber && <span className="text-slate-500 font-normal">({formatPhoneNumber(jobToView.phoneNumber)})</span>}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-500 block mb-1 text-xs">บริการ / อาการ</span>
                    <p className="font-medium text-emerald-700">{jobToView?.serviceName || "ทั่วไป"}</p>
                  </div>
                  <div>
                    <span className="text-slate-500 block mb-1 text-xs">รุ่นเครื่อง</span>
                    <p className="font-medium text-slate-900">
                      {jobToView?.deviceModel} {jobToView?.deviceColor && <span className="text-slate-500 font-normal">(สี{jobToView.deviceColor})</span>}
                    </p>
                  </div>

                  <div>
                    <span className="text-slate-500 block mb-1 text-xs">Serial Number</span>
                    <p className="font-medium text-slate-900">{jobToView?.serialNumber || "-"}</p>
                  </div>

                  <div>
                    <span className="text-slate-500 block mb-1 text-xs">IMEI</span>
                    <p className="font-medium text-slate-900">{jobToView?.imei || "-"}</p>
                  </div>

                  <div className="sm:col-span-2">
                    <span className="text-slate-500 block mb-1 text-xs">หมายเหตุเพิ่มเติม</span>
                    <p className="font-medium text-slate-900">{jobToView?.issue || "-"}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-semibold text-slate-800 flex items-center gap-2 border-b pb-2">
                  <Wrench className="h-4 w-4 text-slate-500" /> ข้อมูลสำหรับช่าง (ไม่บังคับ)
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
                      value={editPrice}
                      onChange={(e) => setEditPrice(e.target.value)}
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
                      value={editSn}
                      onChange={(e) => setEditSn(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="imei" className="text-slate-600 flex items-center gap-1">
                      <Hash className="h-3.5 w-3.5" /> IMEI
                    </Label>
                    <Input
                      id="imei"
                      placeholder="กรอกเลข IMEI 15 หลัก"
                      value={editImei}
                      onChange={(e) => setEditImei(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter className="gap-3 sm:justify-end sm:space-x-3 mt-4">
              <Button variant="outline" onClick={() => setJobToView(null)} disabled={isSaving}>ปิดหน้าต่าง</Button>
              <Button className="bg-blue-600 hover:bg-blue-700" onClick={handleSaveDetails} disabled={isSaving}>
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                {isSaving ? "กำลังบันทึก..." : "บันทึกข้อมูลช่าง"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  )
}