"use client"

import { useState, useEffect } from "react"
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useToast } from "@/hooks/use-toast"
import {
  Activity, Wrench, PackageCheck, Wallet, Smartphone, Loader2, User, Banknote,
  MoreHorizontal, ClipboardList, Barcode, Hash, Phone, Clock,
  QrCode, Copy, Download, Link, Eye, EyeOff
} from "lucide-react"
import { QRCodeCanvas } from "qrcode.react"

import { updateQueueStatus } from "@/actions/queue"
import { isSameDay } from "date-fns" 

// 🌟 Import Store และ Auth สำหรับดึง URL สำรอง
import { useJobStore } from "@/store/useJobStore"
import { useShopStore } from "@/store/useShopStore" 
import { supabase } from "@/lib/supabase"
import { getUserShops } from "@/actions/shop"

const formatPhoneNumber = (phone?: string) => {
  if (!phone) return ""
  const cleaned = phone.replace(/\D/g, '')
  if (cleaned.length === 10) return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 6)}-${cleaned.slice(6)}`
  if (cleaned.length === 9) return `${cleaned.slice(0, 2)}-${cleaned.slice(2, 5)}-${cleaned.slice(5)}`
  return phone
}

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
  const { toast } = useToast()

  const jobs = useJobStore((state) => state.jobs)
  const upsertJob = useJobStore((state) => state.upsertJob)
  const lastSyncAt = useJobStore((state) => state.lastSyncAt)
  const slug = useShopStore((state) => state.shop?.slug)

  const [jobToView, setJobToView] = useState<any>(null)
  const [editPrice, setEditPrice] = useState("")
  const [editSn, setEditSn] = useState("")
  const [editImei, setEditImei] = useState("")
  
  const [shopUrl, setShopUrl] = useState("")
  const [isQrHidden, setIsQrHidden] = useState(false)
  const [isHidden, setIsHidden] = useState(false)

  // 🌟 อัปเดตการดึง URL ให้ฉลาดขึ้น (เหมือนใน Header)
  useEffect(() => {
    const loadShopUrl = async () => {
      if (slug) {
        setShopUrl(`https://${slug}.esyq.net`) 
        return
      }

      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user?.email) {
          const res = await getUserShops(user.email)
          if (res.success && res.shops.length > 0) {
            setShopUrl(`https://${res.shops[0].slug}.esyq.net`)
          }
        }
      } catch (error) {
        console.error("Failed to fetch shop URL:", error)
      }
    }

    loadShopUrl()
  }, [slug]) 

  useEffect(() => {
    if (jobToView) {
      setEditPrice(jobToView.estimatedPrice?.toString() || "")
      setEditSn(jobToView.serialNumber || "")
      setEditImei(jobToView.imei || "")
    }
  }, [jobToView])

  const today = new Date()
  const todayCount = jobs.filter(j => isSameDay(new Date(j.createdAt), today)).length
  const activeCount = jobs.filter(j => ['PENDING', 'WAITING', 'PROCESSING'].includes(j.status)).length
  const readyCount = jobs.filter(j => j.status === 'REPAIRED').length
  const revenueToday = jobs
    .filter(j => j.status === 'COMPLETED' && isSameDay(new Date(j.updatedAt || j.createdAt), today))
    .reduce((sum, j) => sum + (Number(j.estimatedPrice) || 0), 0)

  const handleSaveDetails = async () => {
    if (!jobToView) return

    const updatedData = {
      estimatedPrice: editPrice ? parseFloat(editPrice) : null,
      serialNumber: editSn,
      imei: editImei
    }

    const optimisticJob = { ...jobToView, ...updatedData, updatedAt: new Date().toISOString() }
    upsertJob(optimisticJob)
    setJobToView(null) 
    toast({ title: "💾 บันทึกข้อมูลสำเร็จ", description: `อัปเดตรายละเอียดคิวเรียบร้อยแล้ว` })

    const res = await updateQueueStatus(jobToView.id, jobToView.status, updatedData)
    if (!res.success) {
      toast({ title: "❌ เกิดข้อผิดพลาด", description: "บันทึกข้อมูลไม่สำเร็จ ระบบกำลังซิงค์ใหม่...", variant: "destructive" })
    }
  }

  const copyLink = () => {
    navigator.clipboard.writeText(shopUrl)
    toast({ title: "✅ คัดลอกลิงก์สำเร็จ", description: "สามารถนำลิงก์ไปส่งให้ลูกค้าได้เลย" })
  }

  const downloadQR = () => {
    const canvas = document.getElementById("shop-qr-code") as HTMLCanvasElement;
    if (canvas) {
      const url = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.href = url; 
      
      const currentSlug = slug || shopUrl.replace("https://", "").replace(".esyq.net", "") || "ESYQ";
      link.download = `QR-Code-${currentSlug}.png`; 
      
      document.body.appendChild(link); link.click(); document.body.removeChild(link);
      toast({ title: "📥 ดาวน์โหลดสำเร็จ" })
    }
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

  if (jobs.length === 0 && lastSyncAt === 0) {
    return (
      <div className="flex h-64 w-full items-center justify-center text-slate-400 gap-3">
        <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
        <p>กำลังโหลดข้อมูล...</p>
      </div>
    )
  }

  return (
    <TooltipProvider>
      <div className="space-y-6 relative">
        
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-800 tracking-tight">ภาพรวมของร้าน (Overview)</h2>
            <p className="text-sm text-slate-500">สรุปสถิติและสถานะงานซ่อมประจำวัน</p>
          </div>
          <Button variant="outline" onClick={() => setIsHidden(!isHidden)} className="text-slate-600 border-slate-300 hover:bg-slate-100 shadow-sm">
            {isHidden ? <Eye className="h-4 w-4 mr-2" /> : <EyeOff className="h-4 w-4 mr-2" />}
            {isHidden ? "ดูข้อมูลสถิติ" : "ซ่อนข้อมูลสถิติ"}
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="shadow-sm border-blue-100 transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">รายการลูกค้าแจ้งซ่อมวันนี้</CardTitle>
              <Activity className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-800">{isHidden ? "***" : todayCount} <span className="text-sm font-normal text-slate-500">รายการ</span></div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-amber-100 transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">กำลังดำเนินการ</CardTitle>
              <Wrench className="h-4 w-4 text-amber-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-800">{isHidden ? "***" : activeCount} <span className="text-sm font-normal text-slate-500">คิว</span></div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-emerald-100 transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">ซ่อมเสร็จแล้ว</CardTitle>
              <PackageCheck className="h-4 w-4 text-emerald-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-800">{isHidden ? "***" : readyCount} <span className="text-sm font-normal text-slate-500">เครื่อง</span></div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-indigo-100 bg-indigo-50/50 transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-indigo-700">รายได้วันนี้</CardTitle>
              <Wallet className="h-4 w-4 text-indigo-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-indigo-900">{isHidden ? "฿***" : `฿${revenueToday.toLocaleString()}`}</div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          
          <Card className="shadow-sm border-slate-200 lg:col-span-2">
            <CardHeader>
              <CardTitle>รายการอัปเดตล่าสุด</CardTitle>
              <CardDescription>คิวซ่อมล่าสุดจากระบบ Store (ซิงค์แบบ Hybrid)</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[420px] pr-4">
                <div className="space-y-4">
                  {jobs.length === 0 ? (
                    <p className="text-sm text-slate-500 text-center py-4">ยังไม่มีข้อมูลงานซ่อม</p>
                  ) : (
                    jobs.map((job: any) => (
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
                              <span className="font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">{job.serviceName || "ทั่วไป"}</span>
                              {job.issue && <span className="text-slate-500 line-clamp-1 max-w-[200px]">- {job.issue}</span>}
                            </div>

                            <div className="flex items-center gap-3 text-xs text-slate-500 pt-1 flex-wrap">
                              <span className="flex items-center gap-1"><User className="h-3 w-3" /> {job.customerName}</span>
                              {job.phoneNumber && <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {formatPhoneNumber(job.phoneNumber)}</span>}
                              <span className="flex items-center gap-1 text-blue-600 font-medium">
                                <Banknote className="h-3 w-3" />
                                {job.estimatedPrice ? `฿${parseInt(job.estimatedPrice).toLocaleString()}` : "ยังไม่ประเมิน"}
                              </span>
                            </div>
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
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-slate-600"><MoreHorizontal className="h-4 w-4" /></Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-52">
                                <DropdownMenuItem className="cursor-pointer" onClick={() => setJobToView(job)}>
                                  <ClipboardList className="mr-2 h-4 w-4 text-blue-600" />รายละเอียด / ประเมินราคา
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>

                          <Tooltip>
                            <TooltipTrigger asChild>
                              <p className="text-[10px] text-slate-400 mr-9 cursor-help">{formatShortDate(job.createdAt)}</p>
                            </TooltipTrigger>
                            <TooltipContent><p>{formatFullDateTime(job.createdAt)}</p></TooltipContent>
                          </Tooltip>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          <Card className={`shadow-sm flex flex-col lg:col-span-1 transition-all duration-500 ${isQrHidden ? 'border-slate-200 border-t-4 border-t-slate-300 bg-slate-50/30' : 'border-slate-200 border-t-4 border-t-blue-500'}`}>
            <CardHeader className="border-b pb-4 flex flex-row items-center justify-between space-y-0 gap-3">
              <div className="space-y-1">
                <CardTitle className={`text-lg flex items-center gap-2 ${isQrHidden ? 'text-slate-500' : 'text-slate-800'}`}>
                  <QrCode className={`h-5 w-5 ${isQrHidden ? 'text-slate-400' : 'text-blue-600'}`} />
                  {isQrHidden ? 'ซ่อนรหัส QR แล้ว' : 'ให้ลูกค้าสแกนรับคิว'}
                </CardTitle>
              </div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className={`h-8 w-8 rounded-full ${isQrHidden ? 'text-slate-500 hover:text-slate-800 hover:bg-slate-200' : 'text-slate-400 hover:text-blue-600 hover:bg-blue-50'}`} onClick={() => setIsQrHidden(!isQrHidden)}>
                    {isQrHidden ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent><p>{isQrHidden ? "แสดง QR Code" : "ซ่อน QR Code"}</p></TooltipContent>
              </Tooltip>
            </CardHeader>
            
            <CardContent className="flex flex-col items-center justify-center p-6 flex-1 relative">
              {isQrHidden ? (
                <div className="flex flex-col items-center justify-center space-y-3 h-[254px] w-full rounded-lg animate-in fade-in duration-300">
                  <div className="h-20 w-20 rounded-full bg-slate-100 flex items-center justify-center border-4 border-white shadow-sm"><QrCode className="h-10 w-10 text-slate-300 opacity-60" /></div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center w-full animate-in fade-in duration-300">
                  <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 mb-4 transition-transform hover:scale-105 duration-300">
                    {shopUrl ? <QRCodeCanvas id="shop-qr-code" value={shopUrl} size={180} bgColor={"#ffffff"} fgColor={"#0f172a"} level={"H"} includeMargin={false} /> : <div className="w-[180px] h-[180px] bg-slate-100 animate-pulse rounded-lg flex items-center justify-center"><Loader2 className="h-8 w-8 text-slate-300 animate-spin" /></div>}
                  </div>
                  <div className="w-full space-y-3">
                    <Button variant="outline" className="w-full h-11" onClick={copyLink} disabled={!shopUrl}><Link className="h-4 w-4 mr-2" /> คัดลอกลิงก์ร้าน</Button>
                    <Button className="w-full h-11 bg-blue-600 hover:bg-blue-700" onClick={downloadQR} disabled={!shopUrl}><Download className="h-4 w-4 mr-2" /> ดาวน์โหลด QR Code</Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

        </div>

        <Dialog open={!!jobToView} onOpenChange={(open) => { if (!open) setJobToView(null) }}>
          <DialogContent className="sm:max-w-[550px]">
            <DialogHeader>
              <DialogTitle className="text-xl">ประเมินราคาคิว <span className="text-blue-600">{jobToView?.jobRef}</span></DialogTitle>
            </DialogHeader>
            <div className="grid gap-6 py-2">
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2 md:col-span-2">
                    <Label className="text-slate-600 flex items-center gap-1"><Banknote className="h-3.5 w-3.5" /> ราคาประเมิน (บาท)</Label>
                    <Input type="number" value={editPrice} onChange={(e) => setEditPrice(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-600 flex items-center gap-1"><Barcode className="h-3.5 w-3.5" /> Serial Number</Label>
                    <Input value={editSn} onChange={(e) => setEditSn(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-600 flex items-center gap-1"><Hash className="h-3.5 w-3.5" /> IMEI</Label>
                    <Input value={editImei} onChange={(e) => setEditImei(e.target.value)} />
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setJobToView(null)}>ยกเลิก</Button>
              <Button className="bg-blue-600 hover:bg-blue-700" onClick={handleSaveDetails}>บันทึกข้อมูล</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  )
}