"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { ToastAction } from "@/components/ui/toast"
import { 
  Smartphone, 
  Wrench, 
  Clock, 
  Plus, 
  PackageCheck,
  MoreHorizontal,
  ClipboardList,
  XCircle,
  Trash2,
  RotateCcw,
  AlertCircle,
  Archive
} from "lucide-react"

type CancelReason = "NO_SHOW" | "CUSTOMER_CANCEL" | "UNREPAIRABLE" | "NO_PARTS"

type RepairJob = {
  id: string
  jobRef: string
  customerName: string
  deviceModel: string
  deviceColor: string
  issue: string
  serviceName: string
  status: "PENDING" | "WAITING" | "PROCESSING" | "REPAIRED" | "CANCELLED"
  timeElapsed?: string
  cancelReason?: CancelReason
  cancelledAt?: Date
}

const INITIAL_JOBS: RepairJob[] = [
  { id: "1", jobRef: "REP-0105", customerName: "คุณปิ๊ก", deviceModel: "iPhone 13 Pro", deviceColor: "Blue", issue: "จอแตก ทัชไม่ได้", serviceName: "เปลี่ยนจอ", status: "PENDING" },
  { id: "2", jobRef: "REP-0106", customerName: "น้องเอ", deviceModel: "Samsung S23", deviceColor: "Black", issue: "ชาร์จแบตไม่เข้า", serviceName: "เปลี่ยนตูดชาร์จ", status: "WAITING", timeElapsed: "15 นาที" },
  { id: "3", jobRef: "REP-0103", customerName: "เฮียหมู", deviceModel: "iPad Air 5", deviceColor: "Pink", issue: "เปิดไม่ติดเลย โดนน้ำ", serviceName: "ซ่อมบอร์ด", status: "PROCESSING", timeElapsed: "2 ชม." },
  { id: "4", jobRef: "REP-0101", customerName: "เจ๊น้ำ", deviceModel: "iPhone 11", deviceColor: "White", issue: "แบตเสื่อม", serviceName: "เปลี่ยนแบต", status: "REPAIRED", timeElapsed: "รอรับ" },
]

const COLUMNS = [
  { id: "PENDING", title: "ลูกค้าแจ้งซ่อม", color: "border-slate-300 bg-slate-50", icon: ClipboardList, iconColor: "text-slate-500", badgeColor: "bg-slate-500" },
  { id: "WAITING", title: "รอคิวซ่อม", color: "border-orange-200 bg-orange-50", icon: Clock, iconColor: "text-orange-500", badgeColor: "bg-orange-500" },
  { id: "PROCESSING", title: "กำลังแกะซ่อม", color: "border-blue-200 bg-blue-50", icon: Wrench, iconColor: "text-blue-500", badgeColor: "bg-blue-500" },
  { id: "REPAIRED", title: "ซ่อมเสร็จ / รอรับ", color: "border-emerald-200 bg-emerald-50", icon: PackageCheck, iconColor: "text-emerald-600", badgeColor: "bg-emerald-500" },
]

export function QueueBoard() {
  const [jobs, setJobs] = useState<RepairJob[]>(INITIAL_JOBS)
  const [trashedJobs, setTrashedJobs] = useState<RepairJob[]>([])
  
  const [jobToCancel, setJobToCancel] = useState<RepairJob | null>(null)
  const [cancelReason, setCancelReason] = useState<CancelReason | "">("")
  
  const [jobToDelete, setJobToDelete] = useState<RepairJob | null>(null)
  const [isConfirmEmptyOpen, setIsConfirmEmptyOpen] = useState(false)
  
  const { toast } = useToast()

  const moveJob = (jobId: string, currentStatus: string) => {
    const statusFlow: Record<string, RepairJob["status"] | "COMPLETED"> = {
      "PENDING": "WAITING",
      "WAITING": "PROCESSING",
      "PROCESSING": "REPAIRED",
      "REPAIRED": "COMPLETED"
    }
    const nextStatus = statusFlow[currentStatus]
    
    if (nextStatus === "COMPLETED") {
      setJobs(jobs.filter(j => j.id !== jobId))
      toast({ title: "✅ ปิดจ๊อบสำเร็จ", description: "ลูกค้ามารับเครื่องเรียบร้อยแล้ว" })
    } else {
      setJobs(jobs.map(j => j.id === jobId ? { ...j, status: nextStatus as RepairJob["status"] } : j))
    }
  }

  const confirmCancelJob = () => {
    if (!jobToCancel || !cancelReason) return

    const cancelledJob: RepairJob = { 
      ...jobToCancel, 
      status: "CANCELLED", 
      cancelReason: cancelReason as CancelReason,
      cancelledAt: new Date()
    }

    setJobs(prev => prev.filter(j => j.id !== jobToCancel.id))
    setTrashedJobs(prev => [cancelledJob, ...prev])
    
    setJobToCancel(null)
    setCancelReason("")

    toast({
      title: "🗑️ ยกเลิกงานเรียบร้อย",
      description: `ย้ายคิว ${jobToCancel.jobRef} ไปที่ถังขยะแล้ว`,
      duration: 5000,
      action: (
        <ToastAction 
          altText="Undo (เลิกทำ)" 
          onClick={() => {
            setTrashedJobs(prev => prev.filter(j => j.id !== cancelledJob.id))
            setJobs(prev => [...prev, jobToCancel])
          }}
        >
          Undo (เลิกทำ)
        </ToastAction>
      ),
    })
  }

  const restoreJob = (jobId: string) => {
    const jobToRestore = trashedJobs.find(j => j.id === jobId)
    if (!jobToRestore) return

    const restoredJob = { ...jobToRestore, status: "PENDING" as const, cancelReason: undefined, cancelledAt: undefined }
    
    setTrashedJobs(prev => prev.filter(j => j.id !== jobId))
    setJobs(prev => [...prev, restoredJob])
    
    toast({
      title: "🔄 คืนค่างานสำเร็จ",
      description: `คิว ${jobToRestore.jobRef} กลับสู่กระดานคิวแล้ว`,
      duration: 3000,
    })
  }

  const confirmDeletePermanently = () => {
    if (!jobToDelete) return
    setTrashedJobs(prev => prev.filter(j => j.id !== jobToDelete.id))
    toast({ variant: "destructive", title: "🗑️ ลบข้อมูลถาวรแล้ว", description: `คิว ${jobToDelete.jobRef} ถูกลบออกจากระบบอย่างถาวร` })
    setJobToDelete(null)
  }

  const confirmEmptyTrash = () => {
    setTrashedJobs([])
    toast({ variant: "destructive", title: "💥 เทถังขยะเรียบร้อยแล้ว", description: "งานที่ถูกยกเลิกทั้งหมดถูกลบถาวรแล้ว" })
    setIsConfirmEmptyOpen(false)
  }

  const handleMoveToArchive = (jobId: string, jobRef: string) => {
    toast({
      title: "📦 ย้ายเครื่องเข้าคลัง",
      description: `เตรียมย้ายรายการ ${jobRef} ไปยังคลังเครื่องค้าง`,
      duration: 3000,
    })
  }

  return (
    <div className="flex flex-col min-h-screen md:min-h-0 md:h-[calc(100vh-8rem)]">
      
      {/* ส่วนหัวกระดาน & ปุ่มถังขยะ */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-4 shrink-0">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">กระดานคิวงานซ่อม</h2>
          <p className="text-sm text-slate-500">อัปเดตสถานะงานซ่อมได้ง่ายๆ</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" className="flex-1 sm:flex-none text-slate-600 border-slate-300">
                <Trash2 className="mr-2 h-4 w-4 text-rose-500" /> ถังขยะ 
                {trashedJobs.length > 0 && (
                  <Badge variant="destructive" className="ml-2 h-5 w-5 p-0 flex items-center justify-center rounded-full">
                    {trashedJobs.length}
                  </Badge>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent className="w-full sm:max-w-md flex flex-col h-full bg-slate-50">
              <SheetHeader className="shrink-0">
                <SheetTitle className="flex items-center gap-2 text-rose-600">
                  <Trash2 className="h-5 w-5" /> ถังขยะ (งานที่ถูกยกเลิก)
                </SheetTitle>
                <SheetDescription>
                  งานในถังขยะจะถูกลบถาวรอัตโนมัติเมื่อครบ 30 วัน
                </SheetDescription>
              </SheetHeader>
              
              <div className="flex-1 overflow-y-auto mt-6 space-y-3">
                {trashedJobs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-40 text-slate-400 space-y-2">
                    <Trash2 className="h-10 w-10 opacity-20" />
                    <p className="text-sm">ไม่มีงานในถังขยะ</p>
                  </div>
                ) : (
                  trashedJobs.map(job => (
                    <Card key={job.id} className="shadow-sm border-rose-100 bg-white">
                      <CardHeader className="p-3 pb-2">
                        <div className="flex justify-between items-start">
                          <div>
                            <Badge variant="outline" className="bg-rose-50 text-rose-600 border-rose-200 mb-1">
                              {job.jobRef}
                            </Badge>
                            <CardTitle className="text-sm font-bold">{job.deviceModel}</CardTitle>
                          </div>
                          <span className="text-xs font-medium text-rose-500 bg-rose-50 px-2 py-1 rounded">
                            {job.cancelReason === "NO_SHOW" && "ลูกค้าไม่มา"}
                            {job.cancelReason === "CUSTOMER_CANCEL" && "ลูกค้าไม่ซ่อมแล้ว"}
                            {job.cancelReason === "UNREPAIRABLE" && "ซ่อมไม่ได้"}
                            {job.cancelReason === "NO_PARTS" && "ไม่มีอะไหล่"}
                          </span>
                        </div>
                      </CardHeader>
                      <CardContent className="p-3 pt-0 text-xs text-slate-600">
                        <p><span className="font-semibold">ลูกค้า:</span> {job.customerName}</p>
                        <p><span className="font-semibold">ยกเลิกเมื่อ:</span> {job.cancelledAt?.toLocaleString("th-TH")}</p>
                      </CardContent>
                      <CardFooter className="p-3 pt-0 flex gap-2 border-t border-slate-50 mt-2">
                        <Button variant="outline" size="sm" className="flex-1 h-8 text-emerald-600 border-emerald-200 hover:bg-emerald-50" onClick={() => restoreJob(job.id)}>
                          <RotateCcw className="h-3 w-3 mr-1" /> คืนค่า
                        </Button>
                        <Button variant="ghost" size="sm" className="flex-1 h-8 text-rose-600 hover:bg-rose-50" onClick={() => setJobToDelete(job)}>
                          ลบถาวร
                        </Button>
                      </CardFooter>
                    </Card>
                  ))
                )}
              </div>

              {trashedJobs.length > 0 && (
                <div className="pt-4 border-t shrink-0">
                  <Button variant="destructive" className="w-full" onClick={() => setIsConfirmEmptyOpen(true)}>
                    <AlertCircle className="mr-2 h-4 w-4" /> ล้างถังขยะทั้งหมด (Empty Bin)
                  </Button>
                </div>
              )}
            </SheetContent>
          </Sheet>

          <Button className="flex-1 sm:flex-none bg-emerald-600 hover:bg-emerald-700 shadow-sm">
            <Plus className="mr-2 h-4 w-4" /> สร้างใบสั่งซ่อม
          </Button>
        </div>
      </div>

      {/* กระดาน Kanban */}
      <div className="flex-1 overflow-x-hidden md:overflow-x-auto pb-4">
        <div className="flex flex-col md:flex-row gap-4 h-full md:items-start md:justify-center">
          {COLUMNS.map((col) => {
            const columnJobs = jobs.filter(j => j.status === col.id)
            const Icon = col.icon
            return (
              <div key={col.id} className={`w-full md:w-[320px] md:shrink-0 rounded-xl border-2 flex flex-col h-[450px] md:h-full overflow-hidden ${col.color}`}>
                <div className="p-3 border-b border-black/5 bg-white/50 flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-2">
                    <Icon className={`h-5 w-5 ${col.iconColor}`} />
                    <h3 className="font-bold text-slate-700">{col.title}</h3>
                  </div>
                  <Badge variant="secondary" className="font-bold shadow-sm">
                    {columnJobs.length}
                  </Badge>
                </div>

                <div className="flex-1 min-h-0 overflow-y-auto p-3">
                  <div className="space-y-3 pb-2">
                    {columnJobs.length === 0 ? (
                      <div className="text-center p-4 py-8 text-sm text-slate-400 border-2 border-dashed border-slate-200 rounded-lg">
                        ไม่มีงานในสถานะนี้
                      </div>
                    ) : (
                      columnJobs.map((job) => (
                        <Card key={job.id} className="shadow-sm border-slate-200 hover:border-emerald-300 transition-colors cursor-default relative group">
                          <CardHeader className="p-3 pb-2 flex flex-row items-start justify-between space-y-0">
                            <div>
                              <Badge variant="outline" className={`text-white border-transparent ${col.badgeColor} mb-1`}>
                                {job.jobRef}
                              </Badge>
                              <CardTitle className="text-sm font-bold flex items-center gap-1.5 text-slate-800">
                                <Smartphone className="h-4 w-4 text-emerald-600" />
                                {job.deviceModel}
                              </CardTitle>
                            </div>
                            
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-400 -mr-2 -mt-2 opacity-0 group-hover:opacity-100 transition-opacity md:opacity-100">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48">
                                {col.id !== "REPAIRED" ? (
                                  <DropdownMenuItem 
                                    className="text-rose-600 focus:bg-rose-50 focus:text-rose-700 cursor-pointer" 
                                    onClick={() => setJobToCancel(job)}
                                  >
                                    <XCircle className="mr-2 h-4 w-4" />
                                    ยกเลิกงาน
                                  </DropdownMenuItem>
                                ) : (
                                  <DropdownMenuItem 
                                    className="text-amber-600 focus:bg-amber-50 focus:text-amber-700 cursor-pointer" 
                                    onClick={() => handleMoveToArchive(job.id, job.jobRef)}
                                  >
                                    <Archive className="mr-2 h-4 w-4" />
                                    ย้ายเครื่องเข้าคลัง
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </CardHeader>
                          
                          <CardContent className="p-3 pt-0 text-sm space-y-2">
                            <div className="flex items-center justify-between text-slate-600">
                              <span className="font-medium">{job.customerName}</span>
                              <span className="text-xs">{job.timeElapsed}</span>
                            </div>
                            <div className="bg-slate-50 p-2 rounded border border-slate-100 text-xs text-slate-600">
                              <span className="font-semibold text-emerald-700">[{job.serviceName}]</span> {job.issue}
                            </div>
                          </CardContent>
                          
                          <CardFooter className="p-3 pt-0 flex gap-2">
                            <Button 
                              onClick={() => moveJob(job.id, job.status)}
                              className="w-full text-xs h-8 bg-white text-slate-700 border border-slate-300 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300"
                            >
                              {job.status === "PENDING" && "รับเครื่องเข้าคิว"}
                              {job.status === "WAITING" && "เริ่มลงมือซ่อม"}
                              {job.status === "PROCESSING" && "ซ่อมเสร็จแล้ว"}
                              {job.status === "REPAIRED" && "ลูกค้ามารับแล้ว (จบงาน)"}
                            </Button>
                          </CardFooter>
                        </Card>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* 💎 Modal 1: เลือกเหตุผลการยกเลิกงาน */}
      <Dialog open={!!jobToCancel} onOpenChange={(open) => { if (!open) setJobToCancel(null) }}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-600">
              <AlertCircle className="h-5 w-5" /> ยกเลิกงานนี้ ?
            </DialogTitle>
            <DialogDescription>
              กรุณาระบุเหตุผลการยกเลิกคิวซ่อมรหัส <span className="font-bold text-slate-800">{jobToCancel?.jobRef}</span>
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <RadioGroup value={cancelReason} onValueChange={(val) => setCancelReason(val as CancelReason)}>
              {(jobToCancel?.status === "PENDING" || jobToCancel?.status === "WAITING") && (
                <>
                  <div className="flex items-center space-x-2 border rounded-md p-3 hover:bg-slate-50">
                    <RadioGroupItem value="NO_SHOW" id="r-no-show" />
                    <Label htmlFor="r-no-show" className="flex-1 cursor-pointer font-medium">ลูกค้าไม่มา</Label>
                  </div>
                  <div className="flex items-center space-x-2 border rounded-md p-3 hover:bg-slate-50">
                    <RadioGroupItem value="CUSTOMER_CANCEL" id="r-cust-cancel-1" />
                    <Label htmlFor="r-cust-cancel-1" className="flex-1 cursor-pointer font-medium">ลูกค้าไม่ซ่อมแล้ว</Label>
                  </div>
                </>
              )}
              {jobToCancel?.status === "PROCESSING" && (
                <>
                  <div className="flex items-center space-x-2 border rounded-md p-3 hover:bg-slate-50">
                    <RadioGroupItem value="UNREPAIRABLE" id="r-unrepairable" />
                    <Label htmlFor="r-unrepairable" className="flex-1 cursor-pointer font-medium">ซ่อมไม่ได้</Label>
                  </div>
                  <div className="flex items-center space-x-2 border rounded-md p-3 hover:bg-slate-50">
                    <RadioGroupItem value="NO_PARTS" id="r-no-parts" />
                    <Label htmlFor="r-no-parts" className="flex-1 cursor-pointer font-medium">ไม่มีอะไหล่</Label>
                  </div>
                  <div className="flex items-center space-x-2 border rounded-md p-3 hover:bg-slate-50">
                    <RadioGroupItem value="CUSTOMER_CANCEL" id="r-cust-cancel-2" />
                    <Label htmlFor="r-cust-cancel-2" className="flex-1 cursor-pointer font-medium">ลูกค้าไม่ซ่อมแล้ว</Label>
                  </div>
                </>
              )}
            </RadioGroup>
          </div>
          {/* 💎 แก้ไขระยะห่างปุ่มตรงนี้ */}
          <DialogFooter className="gap-3 sm:space-x-3 mt-4">
            <Button variant="outline" onClick={() => setJobToCancel(null)}>ยกเลิก</Button>
            <Button variant="destructive" disabled={!cancelReason} onClick={confirmCancelJob}>ยืนยันการยกเลิก</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 💎 Modal 2: ยืนยันการ "ลบถาวร" (ทีละรายการ) */}
      <Dialog open={!!jobToDelete} onOpenChange={(open) => { if (!open) setJobToDelete(null) }}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-600">
              <AlertCircle className="h-5 w-5" /> ยืนยันลบข้อมูลถาวร ?
            </DialogTitle>
            <DialogDescription className="pt-2">
              คุณกำลังจะลบรายการ <span className="font-bold text-slate-800">{jobToDelete?.jobRef}</span> ออกจากระบบ
              <br/><br/>
              <span className="text-rose-500 font-medium">การกระทำนี้ไม่สามารถกู้คืนได้</span>
            </DialogDescription>
          </DialogHeader>
          {/* 💎 แก้ไขระยะห่างปุ่มตรงนี้ */}
          <DialogFooter className="gap-3 sm:space-x-3 mt-4">
            <Button variant="outline" onClick={() => setJobToDelete(null)}>ยกเลิก</Button>
            <Button variant="destructive" onClick={confirmDeletePermanently}>ลบข้อมูลถาวร</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 💎 Modal 3: ยืนยันการ "ล้างถังขยะทั้งหมด" */}
      <Dialog open={isConfirmEmptyOpen} onOpenChange={setIsConfirmEmptyOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-600">
              <AlertCircle className="h-5 w-5" /> ยืนยันล้างถังขยะ ?
            </DialogTitle>
            <DialogDescription className="pt-2">
              คุณกำลังจะลบงานที่ถูกยกเลิกทั้งหมดจำนวน <span className="font-bold text-slate-800">{trashedJobs.length}</span> รายการ
              <br/><br/>
              <span className="text-rose-500 font-medium">การกระทำนี้ไม่สามารถกู้คืนได้</span>
            </DialogDescription>
          </DialogHeader>
          {/* 💎 แก้ไขระยะห่างปุ่มตรงนี้ */}
          <DialogFooter className="gap-3 sm:space-x-3 mt-4">
            <Button variant="outline" onClick={() => setIsConfirmEmptyOpen(false)}>ยกเลิก</Button>
            <Button variant="destructive" onClick={confirmEmptyTrash}>ล้างถังขยะทั้งหมด</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  )
}