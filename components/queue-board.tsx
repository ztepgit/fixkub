// components/queue-board.tsx
"use client"

import { useState, useMemo } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import {
  Smartphone, Wrench, Clock, Plus, PackageCheck, MoreHorizontal, ClipboardList,
  XCircle, Trash2, RotateCcw, AlertCircle, Archive, Banknote, Barcode, Hash,
  Loader2, CheckCircle2, UserX, Phone, Search, ShieldCheck, CalendarClock, CreditCard,
  Image as ImageIcon, X, ZoomIn
} from "lucide-react"

import { ShopOwnerCreateQueue } from "@/components/shop-owner-create-queue"
import { QueueDetailDialog } from "@/components/queue-detail-dialog"
import { updateQueueStatus, deleteQueuePermanently, emptyTrash, getTop50Jobs } from "@/actions/queue"
import { extractUploadDateFromUrl } from "@/lib/image-utils"
import { queryKeys } from "@/lib/query-keys"

// 🌟 Import Stores และ Hooks ตาม Architecture ใหม่
import { useJobStore } from "@/store/useJobStore" // เก็บเฉพาะ UI State
import { useShopStore } from "@/store/useShopStore" // ดึง shopId
import { useJobSync } from "@/hooks/useJobSync" // ตัวจัดการ Realtime
import { normalizeQueueRef } from "@/lib/parse-queue" // ฟังก์ชัน Normalize รหัสคิว

type CancelReason = "NO_SHOW" | "CUSTOMER_CANCEL" | "UNREPAIRABLE" | "NO_PARTS" | "UNCONTACTABLE"

type RepairJob = {
  id: string
  shopId: string
  jobRef: string | null
  customerName: string
  phone?: string
  deviceModel: string | null
  deviceColor?: string | null
  issue?: string | null
  serviceName?: string | null
  status: "PENDING" | "WAITING" | "PROCESSING" | "REPAIRED" | "CANCELLED" | "COMPLETED" | "ARCHIVED"
  timeElapsed?: string
  cancelReason?: CancelReason | null
  cancelledAt?: Date | string | null
  estimatedPrice?: number | null
  serialNumber?: string | null
  imei?: string | null
  phoneNumber?: string | null
  createdAt?: Date | string
  completedAt?: Date | string | null
  isInWarranty?: boolean
  warrantyArchivedAt?: Date | string | null
  warrantyUntil?: Date | string | null
  images?: string[]
  // 🌟 เพิ่ม Flag สำหรับ Optimistic UI
  _isOptimistic?: boolean
}

const COLUMNS = [
  { id: "PENDING", title: "ลูกค้าแจ้งซ่อม", color: "border-slate-300 bg-slate-50 dark:border-slate-700 dark:bg-slate-900/40", icon: ClipboardList, iconColor: "text-slate-500 dark:text-slate-400", badgeColor: "bg-slate-500 dark:bg-slate-600" },
  { id: "WAITING", title: "รอคิวซ่อม", color: "border-orange-200 bg-orange-50 dark:border-orange-900/50 dark:bg-orange-950/20", icon: Clock, iconColor: "text-orange-500 dark:text-orange-400", badgeColor: "bg-orange-500 dark:bg-orange-600" },
  { id: "PROCESSING", title: "กำลังแกะซ่อม", color: "border-blue-200 bg-blue-50 dark:border-blue-900/50 dark:bg-blue-950/20", icon: Wrench, iconColor: "text-blue-500 dark:text-blue-400", badgeColor: "bg-blue-500 dark:bg-blue-600" },
  { id: "REPAIRED", title: "ซ่อมเสร็จ / รอรับ", color: "border-emerald-200 bg-emerald-50 dark:border-emerald-900/50 dark:bg-emerald-950/20", icon: PackageCheck, iconColor: "text-emerald-600 dark:text-emerald-500", badgeColor: "bg-emerald-500 dark:bg-emerald-600" },
]

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

export function QueueBoard() {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  // ดึง shopId เพื่อใช้กับ QueryKey
  const shopId = useShopStore((state) => state.shop?.id || "")

  // 🌟 1. นำระบบ Realtime เข้ามาทำงาน (มันจะอัปเดต Cache อัตโนมัติ)
  useJobSync(shopId)

  // 🌟 2. ดึงข้อมูลผ่าน TanStack Query (Single Source of Truth)
  const { data: allJobs = [], isLoading } = useQuery({
    queryKey: queryKeys.queues.list(shopId),
    queryFn: async () => {
      const res = await getTop50Jobs(shopId);
      if (!res.success) throw new Error(res.error);
      return res.data as RepairJob[];
    },
    staleTime: 1000 * 60 * 5, // 5 นาที
    enabled: !!shopId,
  })

  // 🌟 3. จัดการ UI State ด้วย Zustand
  const {
    isCreateOpen, setCreateOpen,
    jobToView, setJobToView,
    jobToCancel, setJobToCancel,
    jobToDelete, setJobToDelete,
    jobToWarranty, setJobToWarranty,
    isArchiveOpen, setArchiveOpen,
    isTrashOpen, setTrashOpen,
    isWarrantyOpen, setWarrantyOpen,
    archiveSearchQuery, setArchiveSearch,
    trashSearchQuery, setTrashSearch,
    warrantySearch, setWarrantySearch
  } = useJobStore()

  // Local States สำหรับจัดการ UI ภายใน Component ย่อย
  const [cancelReason, setCancelReason] = useState<CancelReason | "">("")
  const [isConfirmEmptyOpen, setIsConfirmEmptyOpen] = useState(false)
  const [galleryJob, setGalleryJob] = useState<RepairJob | null>(null);
  const [expandedImage, setExpandedImage] = useState<string | null>(null);
  const [isZoomed, setIsZoomed] = useState(false);

  // 🌟 4. Memoize Lists เพื่อลดภาระการ Render
  const activeJobs = useMemo(() => allJobs.filter((j) => !["CANCELLED", "COMPLETED", "ARCHIVED"].includes(j.status)), [allJobs])
  const trashedJobs = useMemo(() => allJobs.filter((j) => j.status === "CANCELLED"), [allJobs])
  const archivedJobs = useMemo(() => allJobs.filter((j) => j.status === "ARCHIVED"), [allJobs])
  const warrantyJobs = useMemo(() => allJobs.filter((j) => j.status === "COMPLETED" && j.isInWarranty), [allJobs])

  const filteredArchivedJobs = useMemo(() => archivedJobs.filter((job) => {
    if (!archiveSearchQuery) return true;
    const term = normalizeQueueRef(archiveSearchQuery).toLowerCase();
    return (job.phoneNumber || job.phone || "").includes(term) || (job.customerName || "").toLowerCase().includes(term) || (job.deviceModel || "").toLowerCase().includes(term) || (job.jobRef || "").toLowerCase().includes(term);
  }), [archivedJobs, archiveSearchQuery]);

  const filteredTrashedJobs = useMemo(() => trashedJobs.filter((job) => {
    if (!trashSearchQuery) return true;
    const term = normalizeQueueRef(trashSearchQuery).toLowerCase();
    return (job.phoneNumber || job.phone || "").includes(term) || (job.customerName || "").toLowerCase().includes(term) || (job.deviceModel || "").toLowerCase().includes(term) || (job.jobRef || "").toLowerCase().includes(term);
  }), [trashedJobs, trashSearchQuery]);

  const filteredWarrantyJobs = useMemo(() => warrantyJobs.filter((job) => {
    if (!warrantySearch) return true;
    const term = normalizeQueueRef(warrantySearch).toLowerCase();
    return (job.customerName || "").toLowerCase().includes(term) || (job.phone || job.phoneNumber || "").toLowerCase().includes(term) || (job.deviceModel || "").toLowerCase().includes(term) || (job.jobRef || "").toLowerCase().includes(term);
  }).sort((a, b) => new Date(b.warrantyArchivedAt || 0).getTime() - new Date(a.warrantyArchivedAt || 0).getTime()), [warrantyJobs, warrantySearch]);

  const jobToViewData = useMemo(() => allJobs.find(j => j.id === jobToView) || null, [allJobs, jobToView]);
  const jobToCancelData = useMemo(() => allJobs.find(j => j.id === jobToCancel) || null, [allJobs, jobToCancel]);
  const jobToDeleteData = useMemo(() => allJobs.find(j => j.id === jobToDelete) || null, [allJobs, jobToDelete]);
  const jobToWarrantyData = useMemo(() => allJobs.find(j => j.id === jobToWarranty) || null, [allJobs, jobToWarranty]);

  // 🌟 5. Server-first UI Update
  const updateJobMutation = useMutation({
    mutationFn: async ({ id, status, data }: { id: string, status: string, data?: any }) => {
      const res = await updateQueueStatus(id, status, data)
      if (!res.success) throw new Error(res.error || "Update failed")
      return res.data 
    },
    onMutate: async (updatedJob) => {
      const qKey = queryKeys.queues.list(shopId)
      
      // Cancel query เพื่อไม่ให้ข้อมูลที่วิ่งอยู่มากวน
      await queryClient.cancelQueries({ queryKey: qKey })

      // เก็บของเก่าไว้ Rollback
      const previousJobs = queryClient.getQueryData<RepairJob[]>(qKey)

      // 🌟 Optimistic Loading State Only: ห้ามแก้ status ห้ามย้าย Card ให้ใส่แค่ flag _isOptimistic
      queryClient.setQueryData(qKey, (old: RepairJob[]) => {
        if (!old) return []
        return old.map((job) => 
          job.id === updatedJob.id 
            ? { 
                ...job, 
                // status: updatedJob.status as any,  <-- 🛑 เอาออก ไม่ต้องแก้ status
                // ...updatedJob.data,                <-- 🛑 เอาออก ไม่ต้องแก้ data
                _isOptimistic: true // 👈 ใส่แค่ป้ายว่ากำลังโหลด
              } 
            : job
        )
      })

      return { previousJobs, qKey }
    },
    onSuccess: (serverData, variables, context) => {
      // 🌟 ปล่อยให้ Realtime / Invalidated Query เป็นตัวจัดการย้าย Card เองตามธรรมชาติ
      // แต่เราต้องเคลียร์ flag _isOptimistic ออกเพื่อความชัวร์ (หรือจะปล่อยให้ Invalidate ทับไปเลยก็ได้)
    },
    onError: (err, variables, context) => {
      if (context?.previousJobs) {
        queryClient.setQueryData(context.qKey, context.previousJobs)
      }
      toast({ title: "❌ เกิดข้อผิดพลาด", description: "บันทึกข้อมูลไม่สำเร็จ", variant: "destructive" })
    },
    onSettled: (data, error, variables, context) => {
      // ให้ TanStack Query ดึงข้อมูลใหม่จาก Server เพื่อเป็น Source of Truth สำหรับย้าย Card
      queryClient.invalidateQueries({ queryKey: queryKeys.queues.list(shopId) })
      // อัปเดตสถิติด้วย
      queryClient.invalidateQueries({ queryKey: queryKeys.reports.stats(shopId) })
    }
  })

  // --- Functions ---
  const moveJob = (jobId: string, currentStatus: string) => {
    const statusFlow: Record<string, string> = { "PENDING": "WAITING", "WAITING": "PROCESSING", "PROCESSING": "REPAIRED", "REPAIRED": "COMPLETED" }
    const nextStatus = statusFlow[currentStatus]
    if (!nextStatus) return

    const updateData: any = {}
    if (nextStatus === "COMPLETED") {
      const now = new Date()
      const warrantyUntil = new Date(now)
      warrantyUntil.setDate(warrantyUntil.getDate() + 30)

      updateData.completedAt = now.toISOString()
      updateData.isInWarranty = true
      updateData.warrantyArchivedAt = now.toISOString()
      updateData.warrantyUntil = warrantyUntil.toISOString()
      toast({ title: "✅ ปิดจ๊อบสำเร็จ", description: "ลูกค้ามารับเครื่องเรียบร้อยแล้ว" })
    }

    updateJobMutation.mutate({ id: jobId, status: nextStatus, data: updateData })
  }

  const confirmCancelJob = () => {
    if (!jobToCancelData || !cancelReason) return
    const updateData = { cancelReason: cancelReason as CancelReason, cancelledAt: new Date().toISOString() }

    updateJobMutation.mutate({ id: jobToCancelData.id, status: "CANCELLED", data: updateData })
    setJobToCancel(null)
    setCancelReason("")
    toast({ title: "🗑️ ยกเลิกงานเรียบร้อย", description: `ย้ายคิวไปที่ถังขยะแล้ว` })
  }

  const restoreJob = (jobId: string) => {
    const jobToRestore = trashedJobs.find((j) => j.id === jobId)
    if (!jobToRestore) return

    const isUncontactable = jobToRestore.cancelReason === "UNCONTACTABLE"
    const targetStatus = isUncontactable ? "ARCHIVED" : "PENDING"
    const updateData = { cancelReason: null, cancelledAt: null }

    updateJobMutation.mutate({ id: jobId, status: targetStatus, data: updateData })
    toast({ title: "🔄 คืนค่างานสำเร็จ", description: isUncontactable ? "ถูกดึงกลับเข้าคลังแล้ว" : "กลับสู่กระดานคิวแล้ว" })
  }

  const handleMoveToArchive = (jobId: string) => {
    updateJobMutation.mutate({ id: jobId, status: "ARCHIVED" })
    toast({ title: "📦 ย้ายเครื่องเข้าคลัง", description: `รายการถูกย้ายไปยังคลังเครื่องค้างแล้ว` })
  }

  const unarchiveJob = (jobId: string) => {
    updateJobMutation.mutate({ id: jobId, status: "REPAIRED" })
    toast({ title: "🔄 ดึงกลับหน้ากระดาน", description: `รายการถูกดึงกลับมาที่ช่องรอรับแล้ว` })
  }

  const completeArchivedJob = (jobId: string) => {
    const now = new Date()
    const warrantyUntil = new Date(now)
    warrantyUntil.setDate(warrantyUntil.getDate() + 30)

    const updateData = {
      completedAt: now.toISOString(),
      isInWarranty: true,
      warrantyArchivedAt: now.toISOString(),
      warrantyUntil: warrantyUntil.toISOString()
    }

    updateJobMutation.mutate({ id: jobId, status: "COMPLETED", data: updateData })
    toast({ title: "✅ ปิดจ๊อบสำเร็จ", description: "ลูกค้ามารับเครื่องจากคลังเรียบร้อยแล้ว" })
  }

  const markAsUncontactable = (jobId: string) => {
    const updateData = { cancelReason: "UNCONTACTABLE", cancelledAt: new Date().toISOString() }
    updateJobMutation.mutate({ id: jobId, status: "CANCELLED", data: updateData })
    toast({ title: "❌ ส่งไปถังขยะ", description: `รายการถูกบันทึกว่าติดต่อไม่ได้` })
  }

  // --- Deletion Mutations ---
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await deleteQueuePermanently(shopId, id)
      if (!res.success) throw new Error(res.error || "ลบข้อมูลไม่สำเร็จ")
      return id
    },
    onSuccess: (id) => {
      // อัปเดต Cache เพื่อเตะออกจากจอทันทีโดยไม่ต้องรอ Refetch
      queryClient.setQueryData(queryKeys.queues.list(shopId), (old: RepairJob[]) => old?.filter(j => j.id !== id))
      toast({ title: "🗑️ ลบงานแล้ว" })
      setJobToDelete(null)
    },
    onError: (err: any) => {
      toast({ title: "❌ ลบข้อมูลล้มเหลว", description: err.message, variant: "destructive" })
      setJobToDelete(null)
    }
  })

  const emptyTrashMutation = useMutation({
    mutationFn: async () => {
      const res = await emptyTrash(shopId)
      if (!res.success) throw new Error(res.error)
      return res
    },
    onSuccess: () => {
      queryClient.setQueryData(queryKeys.queues.list(shopId), (old: RepairJob[]) => old?.filter(j => j.status !== "CANCELLED"))
      toast({ title: "💥 ล้างถังขยะแล้ว" })
      setIsConfirmEmptyOpen(false)
    },
    onError: (err: any) => {
      toast({ title: "❌ เกิดข้อผิดพลาด", description: err.message, variant: "destructive" })
    }
  })

  const confirmDeletePermanently = () => {
    if (!jobToDeleteData) return
    deleteMutation.mutate(jobToDeleteData.id)
  }

  const confirmEmptyTrash = () => {
    emptyTrashMutation.mutate()
  }

  const translateStatus = (status: string) => {
    switch (status) {
      case "PENDING": return "รอยืนยัน"
      case "WAITING": return "รอคิวซ่อม"
      case "PROCESSING": return "กำลังซ่อม"
      case "REPAIRED": return "ซ่อมเสร็จแล้ว"
      default: return status
    }
  }

  return (
    <TooltipProvider>
      <div className="flex flex-col min-h-screen md:min-h-0 md:h-[calc(100vh-8rem)]">

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-4 shrink-0">
          <div>
            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">กระดานคิว</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">อัปเดตสถานะได้ง่ายๆ</p>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">

            <Button
              variant="outline"
              onClick={() => setWarrantyOpen(true)}
              className="flex-1 sm:flex-none text-emerald-600 border-emerald-200 hover:bg-emerald-50 dark:text-emerald-400 dark:border-emerald-800 dark:hover:bg-emerald-950"
            >
              <ShieldCheck className="mr-2 h-4 w-4" />
              คลังประกัน
              {warrantyJobs.length > 0 && (
                <Badge variant="secondary" className="ml-2 h-5 w-5 p-0 flex items-center justify-center rounded-full bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-900/50 dark:text-emerald-400">
                  {warrantyJobs.length}
                </Badge>
              )}
            </Button>

            <Sheet open={isArchiveOpen} onOpenChange={setArchiveOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" className="flex-1 sm:flex-none text-slate-600 border-slate-300 dark:text-slate-300 dark:border-slate-700 dark:hover:bg-slate-800">
                  <Archive className="mr-2 h-4 w-4 text-amber-500" /> คลังดอง
                  {archivedJobs.length > 0 && (
                    <Badge variant="secondary" className="ml-2 h-5 w-5 p-0 flex items-center justify-center rounded-full bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-900/50 dark:text-amber-400">
                      {archivedJobs.length}
                    </Badge>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent className="w-full sm:max-w-md flex flex-col h-full bg-slate-50 dark:bg-slate-950 dark:border-slate-800">
                <SheetHeader className="shrink-0 px-2">
                  <SheetTitle className="flex items-center gap-2 text-amber-600 dark:text-amber-500">
                    <Archive className="h-5 w-5" /> คลังดอง
                  </SheetTitle>
                  <SheetDescription className="dark:text-slate-400">
                    งานที่ซ่อมเสร็จแล้ว แต่ลูกค้ายังไม่มารับ
                  </SheetDescription>
                </SheetHeader>

                <div className="relative mt-4 shrink-0 mx-2">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400 dark:text-slate-500" />
                  <Input
                    placeholder="ค้นหาเบอร์โทร, ชื่อ, รุ่นเครื่อง, หรือรหัสคิว..."
                    className="pl-9 h-9 text-sm border-amber-200 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200 focus-visible:ring-amber-500 dark:focus-visible:ring-amber-600"
                    value={archiveSearchQuery}
                    onChange={(e) => setArchiveSearch(e.target.value)}
                  />
                </div>

                <div className="flex-1 overflow-y-auto mt-4 space-y-3 px-2 pb-6">
                  {filteredArchivedJobs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-40 text-slate-400 dark:text-slate-500 space-y-2">
                      <Search className="h-10 w-10 opacity-20" />
                      <p className="text-sm">{archiveSearchQuery ? "ไม่พบข้อมูลที่ค้นหา" : "ไม่มีรายการ"}</p>
                    </div>
                  ) : (
                    filteredArchivedJobs.map(job => (
                      <Card key={job.id} className="shadow-sm border-amber-200 bg-white dark:bg-slate-900 dark:border-amber-900/50">
                        <CardHeader className="p-3 pb-2">
                          <div className="flex justify-between items-start">
                            <div>
                              <Badge variant="outline" className="bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-950/30 dark:text-amber-500 dark:border-amber-900/50 mb-1">
                                {job.jobRef}
                              </Badge>
                              <CardTitle className="text-sm font-bold dark:text-slate-200">
                                {job.deviceModel} {job.deviceColor && <span className="text-xs font-normal text-slate-500 dark:text-slate-400">(สี{job.deviceColor})</span>}
                              </CardTitle>
                            </div>

                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="text-[10px] text-slate-400 dark:text-slate-500 cursor-help whitespace-nowrap mt-1">
                                  {formatShortDate(job.createdAt)}
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{formatFullDateTime(job.createdAt)}</p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                        </CardHeader>
                        <CardContent className="p-3 pt-0 text-xs text-slate-600 dark:text-slate-300 space-y-1">
                          <p><span className="font-semibold dark:text-slate-400">ลูกค้า:</span> {job.customerName} {(job.phoneNumber || job.phone) && <span className="text-slate-500 dark:text-slate-400">({formatPhoneNumber(job.phoneNumber || job.phone)})</span>}</p>
                          <p><span className="font-semibold dark:text-slate-400">บริการ:</span> {job.serviceName || "ทั่วไป"}</p>

                          {/* 🌟 Add estimatedPrice display here for Archived Jobs */}
                          {job.estimatedPrice && (
                            <p><span className="font-semibold dark:text-slate-400">ประเมิน:</span> <span className="text-blue-600 dark:text-blue-400 font-medium">฿{job.estimatedPrice.toLocaleString()}</span></p>
                          )}

                          {(job.serialNumber || job.imei) && (
                            <div className="pt-1.5 mt-1 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-500 dark:text-slate-400 space-y-0.5">
                              {job.serialNumber && <p className="flex items-center gap-1"><span className="font-semibold">S/N:</span> {job.serialNumber}</p>}
                              {job.imei && <p className="flex items-center gap-1"><span className="font-semibold">IMEI:</span> {job.imei}</p>}
                            </div>
                          )}
                        </CardContent>

                        <CardFooter className="p-3 pt-0 flex flex-col gap-2 border-t border-slate-50 dark:border-slate-800 mt-2">
                          <Button
                            className="w-full h-8 bg-emerald-600 hover:bg-emerald-700 text-white dark:bg-emerald-700 dark:hover:bg-emerald-600"
                            onClick={() => completeArchivedJob(job.id)}
                            disabled={updateJobMutation.isPending}
                          >
                            <CheckCircle2 className="h-4 w-4 mr-2" /> ลูกค้ามารับเครื่อง (ปิดจ๊อบ)
                          </Button>
                          <div className="flex gap-2 w-full">
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1 h-8 text-blue-600 border-blue-200 hover:bg-blue-50 dark:text-blue-400 dark:border-blue-900/50 dark:hover:bg-slate-800"
                              onClick={() => unarchiveJob(job.id)}
                              disabled={updateJobMutation.isPending}
                            >
                              <RotateCcw className="h-3 w-3 mr-1" /> ดึงกลับ
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1 h-8 text-rose-600 border-rose-200 hover:bg-rose-50 dark:text-rose-400 dark:border-rose-900/50 dark:hover:bg-slate-800"
                              onClick={() => markAsUncontactable(job.id)}
                              disabled={updateJobMutation.isPending}
                            >
                              <UserX className="h-3 w-3 mr-1" /> ติดต่อไม่ได้
                            </Button>
                          </div>
                        </CardFooter>
                      </Card>
                    ))
                  )}
                </div>
              </SheetContent>
            </Sheet>



            {/* 🛡️ Warranty Sheet (คลังประกัน) */}
            <Sheet open={isWarrantyOpen} onOpenChange={setWarrantyOpen}>
              <SheetContent side="right" className="w-full sm:max-w-md md:max-w-lg lg:max-w-xl overflow-y-auto dark:bg-slate-900 flex flex-col p-0">
                <div className="p-6 pb-4 border-b dark:border-slate-800 bg-emerald-50/50 dark:bg-emerald-950/20 sticky top-0 z-10 backdrop-blur-md">
                  <SheetHeader className="text-left space-y-1">
                    <SheetTitle className="flex items-center gap-2 text-xl font-bold text-emerald-800 dark:text-emerald-400">
                      <ShieldCheck className="h-6 w-6" />
                      คลังประกัน (Warranty Archive)
                    </SheetTitle>
                    <SheetDescription className="text-slate-600 dark:text-slate-400">
                      งานที่ส่งมอบแล้วจะถูกเก็บไว้ที่นี่ 30 วัน เพื่อรองรับการเคลม หากต้องการซ่อมใหม่ โปรดสร้างงานใหม่ (ระบบจะลบอัตโนมัติเมื่อหมดอายุ)
                    </SheetDescription>
                  </SheetHeader>

                  <div className="relative mt-5">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      placeholder="ค้นหาชื่อ, เบอร์, รุ่น, รหัสคิว..."
                      value={warrantySearch}
                      onChange={(e) => setWarrantySearch(e.target.value)}
                      className="pl-9 bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus-visible:ring-emerald-500 rounded-xl h-11"
                    />
                  </div>
                </div>

                <div className="p-6 flex-1 bg-slate-50/50 dark:bg-slate-900/50">
                  {filteredWarrantyJobs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center text-slate-400 h-64 gap-3">
                      <ShieldCheck className="h-12 w-12 opacity-20" />
                      <p>ไม่มีงานในคลังประกัน</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {filteredWarrantyJobs.map((job: RepairJob) => {
                        const daysLeft = job.warrantyUntil
                          ? Math.ceil((new Date(job.warrantyUntil).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
                          : 0;

                        const isExpiringSoon = daysLeft > 0 && daysLeft <= 7;
                        const isExpired = daysLeft <= 0;

                        return (
                          <Card key={job.id} className="border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow dark:bg-slate-950">
                            <div className={`absolute top-0 left-0 w-1.5 h-full ${isExpired ? "bg-rose-500" : isExpiringSoon ? "bg-amber-500" : "bg-emerald-500"}`} />

                            <CardContent className="p-4 pl-5">
                              <div className="flex justify-between items-start mb-2">
                                <div className="flex flex-col gap-1">
                                  <Badge variant="outline" className="w-fit text-slate-500 bg-slate-50 font-mono text-[10px]">
                                    {job.jobRef}
                                  </Badge>
                                  <h4 className="font-bold text-slate-800 dark:text-slate-100 text-base">{job.customerName}</h4>
                                </div>

                                <Badge variant={isExpired ? "destructive" : "secondary"} className={`
                      ${isExpired ? "bg-rose-100 text-rose-700 hover:bg-rose-200 border-rose-200 dark:bg-rose-950/50 dark:text-rose-400" :
                                    isExpiringSoon ? "bg-amber-100 text-amber-700 hover:bg-amber-200 border-amber-200 dark:bg-amber-950/50 dark:text-amber-400" :
                                      "bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-400"}
                    `}>
                                  {isExpired ? "หมดประกันแล้ว" : `ประกันเหลือ ${daysLeft} วัน`}
                                </Badge>
                              </div>

                              <div className="grid grid-cols-2 gap-y-2 mt-3 text-sm text-slate-600 dark:text-slate-400">
                                <div className="flex items-center gap-1.5"><Smartphone className="h-3.5 w-3.5" /> {job.deviceModel}</div>
                                <div className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" /> {job.phone || job.phoneNumber}</div>
                                <div className="flex items-center gap-1.5 col-span-2 text-indigo-600 dark:text-indigo-400 font-medium">
                                  <Wrench className="h-3.5 w-3.5" /> {job.serviceName || "ซ่อมทั่วไป"} - {job.issue}
                                </div>
                                <div className="flex items-center gap-1.5 col-span-2"><CreditCard className="h-3.5 w-3.5" /> ประเมินราคา: ฿{job.estimatedPrice || 0}</div>
                              </div>

                              {(job.serialNumber || job.imei) && (
                                <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 text-xs text-slate-500 font-mono">
                                  {job.serialNumber && <div>S/N: {job.serialNumber}</div>}
                                  {job.imei && <div>IMEI: {job.imei}</div>}
                                </div>
                              )}

                              <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-xs text-slate-500">
                                <div className="flex items-center gap-1.5">
                                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                                  ปิดงานเมื่อ: {job.warrantyArchivedAt ? new Date(job.warrantyArchivedAt).toLocaleDateString("th-TH") : "-"}
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <CalendarClock className="h-3.5 w-3.5" />
                                  หมดประกัน: {job.warrantyUntil ? new Date(job.warrantyUntil).toLocaleDateString("th-TH") : "-"}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        )
                      })}
                    </div>
                  )}
                </div>
              </SheetContent>
            </Sheet>

            <Sheet open={isTrashOpen} onOpenChange={setTrashOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" className="flex-1 sm:flex-none text-slate-600 border-slate-300 dark:text-slate-300 dark:border-slate-700 dark:hover:bg-slate-800">
                  <Trash2 className="mr-2 h-4 w-4 text-rose-500" /> ถังขยะ
                  {trashedJobs.length > 0 && (
                    <Badge variant="destructive" className="ml-2 h-5 w-5 p-0 flex items-center justify-center rounded-full dark:bg-rose-900 dark:text-white">
                      {trashedJobs.length}
                    </Badge>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent className="w-full sm:max-w-md flex flex-col h-full bg-slate-50 dark:bg-slate-950 dark:border-slate-800">
                <SheetHeader className="shrink-0 px-2">
                  <SheetTitle className="flex items-center gap-2 text-rose-600 dark:text-rose-500">
                    <Trash2 className="h-5 w-5" /> ถังขยะ (งานที่ถูกยกเลิก)
                  </SheetTitle>
                  <SheetDescription className="dark:text-slate-400">
                    งานในถังขยะจะถูกลบอัตโนมัติใน 30 วัน
                  </SheetDescription>
                </SheetHeader>

                <div className="relative mt-4 shrink-0 mx-2">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400 dark:text-slate-500" />
                  <Input
                    placeholder="ค้นหาเบอร์โทร, ชื่อ, รุ่นเครื่อง, หรือรหัสคิว..."
                    className="pl-9 h-9 text-sm border-rose-200 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200 focus-visible:ring-rose-500 dark:focus-visible:ring-rose-600"
                    value={trashSearchQuery}
                    onChange={(e) => setTrashSearch(e.target.value)}
                  />
                </div>

                <div className="flex-1 overflow-y-auto mt-4 space-y-3 px-2 pb-4">
                  {filteredTrashedJobs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-40 text-slate-400 dark:text-slate-500 space-y-2">
                      <Search className="h-10 w-10 opacity-20" />
                      <p className="text-sm">{trashSearchQuery ? "ไม่พบข้อมูลที่ค้นหา" : "ไม่มีงานในถังขยะ"}</p>
                    </div>
                  ) : (
                    filteredTrashedJobs.map((job: RepairJob) => (
                      <Card key={job.id} className="shadow-sm border-rose-100 bg-white dark:bg-slate-900 dark:border-rose-900/30">
                        <CardHeader className="p-3 pb-2">
                          <div className="flex justify-between items-start">
                            <div>
                              <Badge variant="outline" className="bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-950/30 dark:text-rose-500 dark:border-rose-900/50 mb-1">
                                {job.jobRef}
                              </Badge>
                              <CardTitle className="text-sm font-bold dark:text-slate-200">
                                {job.deviceModel} {job.deviceColor && <span className="text-xs font-normal text-slate-500 dark:text-slate-400">(สี{job.deviceColor})</span>}
                              </CardTitle>
                            </div>

                            <div className="flex flex-col items-end gap-1.5">
                              <span className="text-xs font-medium text-rose-500 bg-rose-50 dark:bg-rose-950/40 dark:text-rose-400 px-2 py-1 rounded">
                                {job.cancelReason === "NO_SHOW" && "ลูกค้าไม่มา"}
                                {job.cancelReason === "CUSTOMER_CANCEL" && "ลูกค้าไม่ซ่อมแล้ว"}
                                {job.cancelReason === "UNREPAIRABLE" && "ซ่อมไม่ได้"}
                                {job.cancelReason === "NO_PARTS" && "ไม่มีอะไหล่"}
                                {job.cancelReason === "UNCONTACTABLE" && "ติดต่อไม่ได้ / ทิ้งเครื่อง"}
                                {!job.cancelReason && "ยกเลิกงาน"}
                              </span>

                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="text-[10px] text-slate-400 dark:text-slate-500 cursor-help whitespace-nowrap">
                                    {formatShortDate(job.createdAt)}
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>{formatFullDateTime(job.createdAt)}</p>
                                </TooltipContent>
                              </Tooltip>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="p-3 pt-0 text-xs text-slate-600 dark:text-slate-300 space-y-1">
                          <p><span className="font-semibold dark:text-slate-400">ลูกค้า:</span> {job.customerName} {(job.phoneNumber || job.phone) && <span className="text-slate-500 dark:text-slate-400">({formatPhoneNumber(job.phoneNumber || job.phone)})</span>}</p>
                          <p><span className="font-semibold dark:text-slate-400">บริการ:</span> {job.serviceName || "ทั่วไป"}</p>

                          {/* 🌟 Add estimatedPrice display here for Trashed Jobs */}
                          {job.estimatedPrice && (
                            <p><span className="font-semibold dark:text-slate-400">ประเมิน:</span> <span className="text-blue-600 dark:text-blue-400 font-medium">฿{job.estimatedPrice.toLocaleString()}</span></p>
                          )}

                          {(job.serialNumber || job.imei) && (
                            <div className="pt-1.5 mt-1 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-500 dark:text-slate-400 space-y-0.5">
                              {job.serialNumber && <p className="flex items-center gap-1"><span className="font-semibold">S/N:</span> {job.serialNumber}</p>}
                              {job.imei && <p className="flex items-center gap-1"><span className="font-semibold">IMEI:</span> {job.imei}</p>}
                            </div>
                          )}
                        </CardContent>
                        <CardFooter className="p-3 pt-0 flex gap-2 border-t border-slate-50 dark:border-slate-800 mt-2">
                          <Button variant="outline" size="sm" className="flex-1 h-8 text-emerald-600 border-emerald-200 hover:bg-emerald-50 dark:text-emerald-400 dark:border-emerald-900/50 dark:hover:bg-slate-800" onClick={() => restoreJob(job.id)} disabled={updateJobMutation.isPending}>
                            <RotateCcw className="h-3 w-3 mr-1" /> คืนค่า
                          </Button>
                          <Button variant="outline" size="sm" className="flex-1 h-8 text-rose-600 border-rose-300 hover:bg-rose-50 hover:border-rose-400 dark:text-rose-400 dark:border-rose-900/60 dark:hover:bg-slate-800 dark:hover:text-rose-300" onClick={() => setJobToDelete(job.id)}>
                            ลบ
                          </Button>
                        </CardFooter>
                      </Card>
                    ))
                  )}
                </div>

                {trashedJobs.length > 0 && (
                  <div className="pt-4 border-t dark:border-slate-800 shrink-0 px-2 pb-4">
                    <Button variant="destructive" className="w-full dark:bg-rose-800 dark:hover:bg-rose-700" onClick={() => setIsConfirmEmptyOpen(true)}>
                      <AlertCircle className="mr-2 h-4 w-4" /> ล้างถังขยะทั้งหมด (Empty Bin)
                    </Button>
                  </div>
                )}
              </SheetContent>
            </Sheet>

            <Dialog open={isCreateOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild>
                <Button className="flex-1 sm:flex-none bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm dark:bg-emerald-700 dark:hover:bg-emerald-600">
                  <Plus className="mr-2 h-4 w-4" /> สร้างใบสั่งซ่อม
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[700px] p-0 border-none bg-transparent shadow-none">
                <DialogTitle className="sr-only">สร้างใบสั่งซ่อมใหม่</DialogTitle>
                <ShopOwnerCreateQueue
                  onCancel={() => setCreateOpen(false)}
                  onSuccess={() => {
                    setCreateOpen(false)
                    queryClient.invalidateQueries({ queryKey: queryKeys.queues.list(shopId) })
                  }}
                />
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="flex-1 overflow-x-hidden md:overflow-x-auto pb-4">
          {isLoading ? (
            <div className="flex h-[450px] w-full items-center justify-center text-slate-400 dark:text-slate-500 gap-3">
              <Loader2 className="h-6 w-6 animate-spin text-emerald-500 dark:text-emerald-600" />
              <p>กำลังโหลดข้อมูลคิว...</p>
            </div>
          ) : (
            <div className="flex flex-col md:flex-row gap-4 h-full md:items-start md:justify-center">
              {COLUMNS.map((col) => {
                const columnJobs = activeJobs.filter((j: RepairJob) => j.status === col.id)
                const Icon = col.icon
                return (
                  <div key={col.id} className={`w-full md:w-[320px] md:shrink-0 rounded-xl border-2 flex flex-col h-[450px] md:h-full overflow-hidden ${col.color}`}>
                    <div className="p-3 border-b border-black/5 dark:border-white/5 bg-white/50 dark:bg-black/20 flex items-center justify-between shrink-0">
                      <div className="flex items-center gap-2">
                        <Icon className={`h-5 w-5 ${col.iconColor}`} />
                        <h3 className="font-bold text-slate-700 dark:text-slate-200">{col.title}</h3>
                      </div>
                      <Badge variant="secondary" className="font-bold shadow-sm dark:bg-slate-800 dark:text-slate-300">
                        {columnJobs.length}
                      </Badge>
                    </div>

                    <div className="flex-1 min-h-0 overflow-y-auto p-3">
                      <div className="space-y-3 pb-2">
                        {columnJobs.length === 0 ? (
                          <div className="text-center p-4 py-8 text-sm text-slate-400 dark:text-slate-500 border-2 border-dashed border-slate-200 dark:border-slate-700/50 rounded-lg">
                            ไม่มีงานในสถานะนี้
                          </div>
                        ) : (
                          columnJobs.map((job: RepairJob) => (
                            // 🌟 ปรับ Card ให้สีซีด (opacity-50 และมี pointer-events-none กันกดรัวๆ) เมื่อสถานะคือ _isOptimistic
                            <Card key={job.id} className={`shadow-sm border-slate-200 dark:border-slate-700 dark:bg-slate-900 hover:border-emerald-300 dark:hover:border-emerald-700/50 transition-all duration-300 cursor-default relative group ${job._isOptimistic ? "opacity-50 pointer-events-none scale-[0.98]" : ""}`}>
                              {/* 🌟 ไอคอนแสดงสถานะกำลังโหลดตอน Optimistic Update */}
                              {job._isOptimistic && (
                                <div className="absolute inset-0 z-10 flex items-center justify-center">
                                  <Loader2 className="w-8 h-8 text-slate-400 animate-spin" />
                                </div>
                              )}
                              
                              <CardHeader className="p-3 pb-2 flex flex-row items-start justify-between space-y-0">
                                <div>
                                  <div className="flex items-center gap-2 mb-1">
                                    <Badge variant="outline" className={`text-white border-transparent ${col.badgeColor}`}>
                                      {job.jobRef}
                                    </Badge>

                                    {job.images && job.images.length > 0 && (
                                      <div
                                        className="flex items-center gap-1 text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-1.5 py-0.5 rounded cursor-pointer hover:bg-slate-200 transition-colors border border-slate-200 dark:border-slate-700"
                                        onClick={(e) => { e.stopPropagation(); setGalleryJob(job); }}
                                      >
                                        <ImageIcon className="w-3 h-3" />
                                        <span className="font-semibold">{job.images.length}</span>
                                      </div>
                                    )}
                                  </div>

                                  <CardTitle className="text-sm font-bold flex items-center gap-1.5 text-slate-800 dark:text-slate-200">
                                    <Smartphone className="h-4 w-4 text-emerald-600 dark:text-emerald-500 shrink-0" />
                                    <span className="truncate">
                                      {job.deviceModel} {job.deviceColor && <span className="text-xs font-normal text-slate-500 dark:text-slate-400">(สี{job.deviceColor})</span>}
                                    </span>
                                  </CardTitle>
                                </div>

                                <DropdownMenu>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <div>
                                        <DropdownMenuTrigger asChild>
                                          {/* 🌟 ลบ opacity-0 ในหน้าจอขนาดเล็กออก (แก้ไข `opacity-100` เป็น default และคง hover opacity สำหรับจอที่รองรับ) */}
                                          <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-400 dark:text-slate-500 -mr-2 -mt-2 opacity-100 group-hover:opacity-100 transition-opacity hover:bg-slate-100 dark:hover:bg-slate-800">
                                            <MoreHorizontal className="h-4 w-4" />
                                          </Button>
                                        </DropdownMenuTrigger>
                                      </div>
                                    </TooltipTrigger>
                                    <TooltipContent side="top">
                                      <p>เมนูช่วยเหลือ</p>
                                    </TooltipContent>
                                  </Tooltip>
                                  <DropdownMenuContent align="end" className="w-52 dark:bg-slate-900 dark:border-slate-800">
                                    <DropdownMenuItem className="cursor-pointer dark:text-slate-300 dark:focus:bg-slate-800" onClick={() => setJobToView(job.id)}>
                                      <ClipboardList className="mr-2 h-4 w-4 text-blue-600 dark:text-blue-400" />
                                      รายละเอียด / ประเมินราคา
                                    </DropdownMenuItem>

                                    {col.id !== "REPAIRED" ? (
                                      <DropdownMenuItem className="text-rose-600 dark:text-rose-400 focus:bg-rose-50 dark:focus:bg-rose-950/50 focus:text-rose-700 dark:focus:text-rose-300 cursor-pointer" onClick={() => setJobToCancel(job.id)}>
                                        <XCircle className="mr-2 h-4 w-4" />
                                        ยกเลิกงาน
                                      </DropdownMenuItem>
                                    ) : (
                                      <DropdownMenuItem className="text-amber-600 dark:text-amber-500 focus:bg-amber-50 dark:focus:bg-amber-950/50 focus:text-amber-700 dark:focus:text-amber-400 cursor-pointer" onClick={() => handleMoveToArchive(job.id)}>
                                        <Archive className="mr-2 h-4 w-4" />
                                        เก็บเข้าคลังดอง
                                      </DropdownMenuItem>
                                    )}
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </CardHeader>

                              <CardContent className="p-3 pt-0 text-sm space-y-2">
                                <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                                  <span className="font-medium truncate mr-2">
                                    {job.customerName} {(job.phoneNumber || job.phone) && <span className="text-xs text-slate-400 dark:text-slate-500 font-normal">({formatPhoneNumber(job.phoneNumber || job.phone)})</span>}
                                  </span>

                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <span className="text-[10px] text-slate-400 dark:text-slate-500 whitespace-nowrap shrink-0 cursor-help">
                                        {job.timeElapsed || formatShortDate(job.createdAt)}
                                      </span>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>{formatFullDateTime(job.createdAt)}</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </div>
                                <div className="bg-slate-50 dark:bg-slate-800/50 p-2 rounded border border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 flex flex-col gap-1">
                                  <div><span className="font-semibold text-emerald-700 dark:text-emerald-400">[{job.serviceName || "ทั่วไป"}]</span> {job.issue || "-"}</div>
                                  
                                  {/* 🌟 Add estimatedPrice display here for Main Board Jobs */}
                                  {job.estimatedPrice && (
                                    <div className="text-blue-600 dark:text-blue-400 font-medium">ประเมิน: ฿{job.estimatedPrice.toLocaleString()}</div>
                                  )}

                                  {(job.serialNumber || job.imei) && (
                                    <div className="flex flex-col gap-0.5 mt-1 pt-1.5 border-t border-slate-200/60 dark:border-slate-700/60 text-[10px] text-slate-500 dark:text-slate-400">
                                      {job.serialNumber && <div className="flex items-center gap-1.5">S/N: {job.serialNumber}</div>}
                                      {job.imei && <div className="flex items-center gap-1.5">IMEI: {job.imei}</div>}
                                    </div>
                                  )}
                                </div>
                              </CardContent>
                              <CardFooter className="p-3 pt-0 flex gap-2">
                                <Button
                                  onClick={() => {
                                    if (job.status === "REPAIRED") {
                                      setJobToWarranty(job.id)
                                    } else {
                                      moveJob(job.id, job.status)
                                    }
                                  }}
                                  disabled={updateJobMutation.isPending || job._isOptimistic} // 🌟 ถ้ากำลังโหลดอยู่ ห้ามกดซ้ำ
                                  className="w-full text-xs h-8 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 hover:text-emerald-700 dark:hover:text-emerald-400 hover:border-emerald-300 dark:hover:border-emerald-700/50"
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
          )}
        </div>

        <QueueDetailDialog
          job={jobToViewData}
          open={!!jobToViewData}
          onOpenChange={(open) => { if (!open) setJobToView(null) }}
          onSave={async (jobId, data) => {
            const updatedData = {
              estimatedPrice: data.estimatedPrice ? parseFloat(data.estimatedPrice) : null,
              serialNumber: data.serialNumber,
              imei: data.imei
            };
            await updateJobMutation.mutateAsync({ id: jobId, status: jobToViewData!.status, data: updatedData });
            toast({ title: "💾 บันทึกข้อมูลสำเร็จ", description: `อัปเดตรายละเอียดคิวเรียบร้อยแล้ว` });
            setJobToView(null);
          }}
          onUpdateJobInStore={(updatedJob) => {
            queryClient.setQueryData(queryKeys.queues.list(shopId), (old: RepairJob[]) => {
              return old?.map((job) => job.id === updatedJob.id ? { ...job, ...updatedJob } : job)
            })
          }}
        />

        <Dialog open={!!jobToWarrantyData} onOpenChange={(open) => !open && setJobToWarranty(null)}>
          <DialogContent className="dark:bg-slate-900 dark:border-slate-800 sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle className="text-emerald-600 dark:text-emerald-500 flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5" /> ยืนยันจบงาน?
              </DialogTitle>
              <DialogDescription className="text-base text-slate-700 dark:text-slate-300 pt-3 space-y-2">
                <p>งานที่จบแล้วจะถูกย้ายไปอยู่ใน <strong>คลังประกัน</strong></p>
                <p className="text-sm text-slate-500">หมายถึงลูกค้ารับเครื่อง และคุณได้รับเงินเรียบร้อยแล้ว</p>
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="mt-4 gap-2">
              <Button variant="outline" onClick={() => setJobToWarranty(null)}>ยกเลิก</Button>
              <Button
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={() => {
                  if (jobToWarrantyData) {
                    moveJob(jobToWarrantyData.id, jobToWarrantyData.status)
                    setJobToWarranty(null)
                  }
                }}
                disabled={updateJobMutation.isPending}
              >
                {updateJobMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                ยืนยันจบงาน
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={!!jobToCancelData} onOpenChange={(open) => {
          if (!open) { setJobToCancel(null); setCancelReason(""); }
        }}>
          <DialogContent className="sm:max-w-[450px] dark:bg-slate-900 dark:border-slate-800">
            <DialogHeader>
              <DialogTitle className="text-rose-600 dark:text-rose-500 flex items-center gap-2 text-lg">
                <AlertCircle className="h-5 w-5" /> ยืนยันการยกเลิกงาน
              </DialogTitle>
              <DialogDescription className="pt-2 text-slate-600 dark:text-slate-400">
                คุณกำลังจะยกเลิกคิว <span className="font-bold text-slate-800 dark:text-slate-200">{jobToCancelData?.jobRef}</span> ของคุณ <span className="font-medium text-slate-800 dark:text-slate-200">{jobToCancelData?.customerName}</span>
                <br className="mb-2" />กรุณาระบุเหตุผลในการยกเลิก เพื่อเก็บเป็นสถิติ:
              </DialogDescription>
            </DialogHeader>

            <div className="py-2">
              <RadioGroup value={cancelReason} onValueChange={(val) => setCancelReason(val as CancelReason)} className="flex flex-col gap-3">
                <div className="flex items-center space-x-3 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" onClick={() => setCancelReason("CUSTOMER_CANCEL")}>
                  <RadioGroupItem value="CUSTOMER_CANCEL" id="r1" disabled={updateJobMutation.isPending} />
                  <Label htmlFor="r1" className="cursor-pointer flex-1 font-medium text-slate-700 dark:text-slate-300">ลูกค้าเปลี่ยนใจ / ไม่ซ่อมแล้ว</Label>
                </div>
                {jobToCancelData?.status !== "PROCESSING" && (
                  <div className="flex items-center space-x-3 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" onClick={() => setCancelReason("NO_SHOW")}>
                    <RadioGroupItem value="NO_SHOW" id="r2" disabled={updateJobMutation.isPending} />
                    <Label htmlFor="r2" className="cursor-pointer flex-1 font-medium text-slate-700 dark:text-slate-300">ลูกค้าไม่มาส่งเครื่องตามนัด</Label>
                  </div>
                )}
                <div className="flex items-center space-x-3 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" onClick={() => setCancelReason("UNREPAIRABLE")}>
                  <RadioGroupItem value="UNREPAIRABLE" id="r3" disabled={updateJobMutation.isPending} />
                  <Label htmlFor="r3" className="cursor-pointer flex-1 font-medium text-slate-700 dark:text-slate-300">เครื่องซ่อมไม่ได้ / ไม่คุ้ม</Label>
                </div>
                <div className="flex items-center space-x-3 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" onClick={() => setCancelReason("NO_PARTS")}>
                  <RadioGroupItem value="NO_PARTS" id="r4" disabled={updateJobMutation.isPending} />
                  <Label htmlFor="r4" className="cursor-pointer flex-1 font-medium text-slate-700 dark:text-slate-300">ไม่มีอะไหล่</Label>
                </div>
              </RadioGroup>
            </div>

            <DialogFooter className="gap-3 mt-4 flex flex-row justify-end">
              <Button variant="outline" className="flex-1 sm:flex-none dark:border-slate-700 dark:hover:bg-slate-800 dark:text-slate-300" onClick={() => { setJobToCancel(null); setCancelReason("") }} disabled={updateJobMutation.isPending}>
                ปิดหน้าต่าง
              </Button>
              <Button variant="destructive" className="flex-1 sm:flex-none bg-rose-600 hover:bg-rose-700 dark:bg-rose-700 dark:hover:bg-rose-600" onClick={confirmCancelJob} disabled={!cancelReason || updateJobMutation.isPending}>
                {updateJobMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                ยืนยันการยกเลิกคิว
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isConfirmEmptyOpen} onOpenChange={setIsConfirmEmptyOpen}>
          <DialogContent className="dark:bg-slate-900 dark:border-slate-800">
            <DialogHeader>
              <DialogTitle className="dark:text-slate-100">ล้างถังขยะใช่ไหม?</DialogTitle>
              <DialogDescription className="dark:text-slate-400">ล้างงานในถังขยะทั้งหมด...</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" className="dark:border-slate-700 dark:hover:bg-slate-800 dark:text-slate-300" onClick={() => setIsConfirmEmptyOpen(false)} disabled={emptyTrashMutation.isPending}>ยกเลิก</Button>
              <Button variant="destructive" className="dark:bg-rose-700 dark:hover:bg-rose-600" onClick={confirmEmptyTrash} disabled={emptyTrashMutation.isPending}>
                {emptyTrashMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null} ล้าง
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={!!jobToDeleteData} onOpenChange={(open) => !open && setJobToDelete(null)}>
          <DialogContent className="dark:bg-slate-900 dark:border-slate-800">
            <DialogHeader>
              <DialogTitle className="text-rose-600 dark:text-rose-500">ลบงานใช่ไหม?</DialogTitle>
              <DialogDescription>งาน <span className="font-bold">{jobToDeleteData?.jobRef}</span> กำลังจะถูกลบ</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setJobToDelete(null)} disabled={deleteMutation.isPending}>ยกเลิก</Button>
              <Button variant="destructive" onClick={confirmDeletePermanently} disabled={deleteMutation.isPending}>
                {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : "ลบ"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={!!galleryJob} onOpenChange={(open) => !open && setGalleryJob(null)}>
          <DialogContent className="sm:max-w-md bg-transparent border-none shadow-none p-0 overflow-hidden [&>button]:hidden">
            <DialogHeader className="sr-only">
              <DialogTitle>แกลลอรี่รูปภาพ</DialogTitle>
            </DialogHeader>

            <div className="bg-slate-950/90 backdrop-blur-xl p-5 rounded-2xl relative border border-slate-800/50 shadow-2xl">
              <button
                onClick={() => setGalleryJob(null)}
                className="absolute top-4 right-4 text-slate-400 bg-slate-800/50 rounded-full p-1.5 hover:bg-slate-800 hover:text-white transition-colors z-10"
              >
                <X className="w-4 h-4" />
              </button>

              <h3 className="text-white font-medium mb-4 flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-emerald-400" /> รูปภาพเครื่อง {galleryJob?.jobRef}
              </h3>

              <div className="grid grid-cols-2 gap-3 overflow-y-auto max-h-[60vh] pr-1 custom-scrollbar">
                {galleryJob?.images?.map((url, idx) => (
                  <div
                    key={idx}
                    className="aspect-square rounded-xl overflow-hidden relative bg-slate-800 border border-slate-700/50 group cursor-pointer"
                    onClick={() => setExpandedImage(url)}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={url}
                      alt="queue-image"
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />

                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                      <ZoomIn className="w-8 h-8 text-white/80 drop-shadow-lg" />
                    </div>

                    <div className="absolute bottom-0 left-0 right-0 bg-black/60 p-1.5 text-[10px] text-white text-center backdrop-blur-sm pointer-events-none">
                      {extractUploadDateFromUrl(url)}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-5 flex justify-end border-t border-slate-800/50 pt-4">
                <Button
                  className="bg-emerald-600 hover:bg-emerald-700 text-white w-full sm:w-auto"
                  onClick={() => {
                    setJobToView(galleryJob?.id || null);
                    setGalleryJob(null);
                  }}
                >
                  <ClipboardList className="w-4 h-4 mr-2" /> จัดการรูปเพิ่มเติม
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog
          open={!!expandedImage}
          onOpenChange={(open) => {
            if (!open) {
              setExpandedImage(null);
              setIsZoomed(false);
            }
          }}
        >
          <DialogContent className="max-w-5xl w-[95vw] h-[90vh] bg-black/95 border-slate-800 p-0 overflow-hidden flex flex-col z-[100] [&>button]:hidden">
            <DialogHeader className="sr-only">
              <DialogTitle>แสดงรูปภาพขนาดใหญ่</DialogTitle>
            </DialogHeader>

            <div className="p-3 flex items-center justify-between border-b border-white/10 shrink-0">
              <span className="text-white/90 text-sm font-medium pl-2">
                <CalendarClock className="w-4 h-4 inline-block mr-2 text-emerald-400" />
                อัปโหลดเมื่อ: {expandedImage ? extractUploadDateFromUrl(expandedImage) : ''}
              </span>
              <button
                onClick={() => { setExpandedImage(null); setIsZoomed(false); }}
                className="text-white/70 hover:text-white bg-white/10 hover:bg-white/20 rounded-full p-1.5 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div
              className={`flex-1 overflow-auto flex p-2 custom-scrollbar ${isZoomed ? 'items-start justify-start cursor-zoom-out' : 'items-center justify-center cursor-zoom-in'}`}
              onClick={() => setIsZoomed(!isZoomed)}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={expandedImage || ""}
                alt="expanded"
                className={`${isZoomed ? 'w-[250%] sm:w-auto h-auto max-w-none' : 'w-full h-full object-contain'} rounded-md transition-all duration-300`}
              />
            </div>
          </DialogContent>
        </Dialog>

      </div>
    </TooltipProvider>
  )
}