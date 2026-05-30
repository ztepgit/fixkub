//components/shop-owner-create-queue.tsx
"use client"

import { useState } from "react"
import { useQueryClient } from "@tanstack/react-query" // 🌟 1. นำเข้า useQueryClient
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { createQueue, updateQueueImages } from "@/actions/queue"
import { useToast } from "@/hooks/use-toast"
import { Loader2, ImagePlus, X } from "lucide-react"
import { useShopStore } from "@/store/useShopStore"
import { compressImageToWebP } from "@/lib/image-utils"
import { supabase } from "@/lib/supabase"
import { queryKeys } from "@/lib/query-keys" // 🌟 2. นำเข้า queryKeys

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
  const queryClient = useQueryClient() // 🌟 3. เรียกใช้ queryClient

  const shopId = useShopStore((state) => state.shop?.id)

  // Form States
  const [customerName, setCustomerName] = useState("")
  const [phone, setPhone] = useState("")
  const [deviceModel, setDeviceModel] = useState("")
  const [deviceColor, setDeviceColor] = useState("")
  const [serialNumber, setSerialNumber] = useState("")
  const [imei, setImei] = useState("")
  const [issue, setIssue] = useState("")
  const [serviceName, setServiceName] = useState("")

  // QUEUE IMAGE SYSTEM: States สำหรับจัดการรูปภาพก่อนอัปโหลด
  const [selectedImages, setSelectedImages] = useState<{ file: File, preview: string }[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleChipClick = (service: string) => {
    setServiceName(service)
  }

  // QUEUE IMAGE SYSTEM: ฟังก์ชันจัดการเมื่อเลือกรูป
  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);

    // ดักเกิน 4 รูป
    if (selectedImages.length + files.length > 4) {
      toast({ title: "❌ เลือกได้สูงสุด 4 รูปเท่านั้น", variant: "destructive" });
      return;
    }

    const newImages: { file: File; preview: string }[] = [];
    for (const file of files) {
      // ดักไฟล์ใหญ่เกิน 5MB
      if (file.size > 5 * 1024 * 1024) {
        toast({ title: `❌ รูป ${file.name} มีขนาดเกิน 5MB`, variant: "destructive" });
        continue;
      }
      try {
        // บีบอัดรูปฝั่ง Client เป็น WebP ทันทีที่เลือก
        const compressedFile = await compressImageToWebP(file);
        newImages.push({ file: compressedFile, preview: URL.createObjectURL(compressedFile) });
      } catch (err) {
        console.error("Compress error", err);
      }
    }

    setSelectedImages(prev => [...prev, ...newImages]);
  };

  // QUEUE IMAGE SYSTEM: ลบรูปออกจาก Preview
  const removeImage = (index: number) => {
    const newImages = [...selectedImages];
    URL.revokeObjectURL(newImages[index].preview); // คืน Memory ให้ Browser
    newImages.splice(index, 1);
    setSelectedImages(newImages);
  };

  // รวมร่างฟังก์ชัน Submit (บันทึกข้อมูล -> อัปโหลดรูป -> อัปเดตคิว)
  const handleSubmit = async () => {
    if (!shopId) {
      toast({ title: "❌ ข้อผิดพลาดของระบบ", description: "ไม่พบข้อมูลร้านค้า กรุณารีเฟรชหน้าจอ", variant: "destructive" })
      return
    }

    setIsSubmitting(true)
    try {
      // 1. สร้างคิวใน Database เพื่อเอา queueId ออกมาก่อน (ถ้าพังจะจบตรงนี้ ไม่มีขยะใน Storage)
      const response = await createQueue({
        shopId: shopId,
        customerName,
        phoneNumber: phone,
        deviceModel,
        deviceColor,
        serialNumber,
        imei,
        issue,
        serviceName,
        isManualEntry: true,
      })

      if (!response.success || !response.data) {
        toast({ title: "❌ เกิดข้อผิดพลาด", description: response.error || "ข้อมูลสูญหาย", variant: "destructive" })
        return;
      }

      const queueId = response.data.id;
      let finalImagesUrls: string[] = [];

      // 2. ถ้าระบบสร้างคิวสำเร็จ และมีรูปภาพ ให้ทำการอัปโหลด
      if (selectedImages.length > 0) {
        for (const img of selectedImages) {
          // สุ่มชื่อไฟล์กันซ้ำ (เช่น 169876543210-x7y8z.webp)
          const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.webp`;
          const filePath = `${shopId}/${queueId}/${fileName}`;

          const { data, error } = await supabase.storage.from('queue-images').upload(filePath, img.file);

          if (!error && data) {
            const { data: { publicUrl } } = supabase.storage.from('queue-images').getPublicUrl(filePath);
            finalImagesUrls.push(publicUrl);
          }
        }

        // 3. ถ้าอัปโหลดรูปสำเร็จ ให้เอา URL ไปอัปเดตลง Database
        if (finalImagesUrls.length > 0) {
          await updateQueueImages(shopId, queueId, finalImagesUrls);
          response.data.images = finalImagesUrls; // เอารูปยัดใส่ object
        }
      }

      // 4. ล้าง Preview ออกจาก Memory
      selectedImages.forEach(img => URL.revokeObjectURL(img.preview));

      // 🌟 5. แจ้ง TanStack Query ให้ทำการดึงข้อมูลคิวที่ร้านใหม่ (แทนการใช้ upsertJob)
      queryClient.invalidateQueries({ queryKey: queryKeys.queues.list(shopId) })

      toast({
        title: "✅ สร้างคิวสำเร็จ",
        description: "เพิ่มรายการซ่อมเข้าสู่ระบบแล้ว"
      })

      onSuccess()

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

      <div className="p-6 flex flex-col gap-8 overflow-y-auto max-h-[75vh] custom-scrollbar">

        {/* แถวที่ 1: ลูกค้า & เบอร์โทร */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8">
          <div className="flex flex-col gap-2.5">
            <Label htmlFor="customerName" className="font-semibold text-slate-700">ชื่อลูกค้า <span className="text-red-500">*</span></Label>
            <Input id="customerName" placeholder="ชื่อ หรือ ชื่อเล่น" value={customerName} onChange={(e) => setCustomerName(e.target.value)} disabled={isSubmitting} />
          </div>
          <div className="flex flex-col gap-2.5">
            <Label htmlFor="phone" className="font-semibold text-slate-700">เบอร์โทรศัพท์ <span className="text-red-500">*</span></Label>
            <Input id="phone" type="tel" placeholder="08x-xxx-xxxx" value={phone} onChange={(e) => setPhone(e.target.value)} disabled={isSubmitting} />
          </div>
        </div>

        {/* แถวที่ 2: รุ่น & สี */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8">
          <div className="flex flex-col gap-2.5">
            <Label htmlFor="deviceModel" className="font-semibold text-slate-700">รุ่นมือถือ/อุปกรณ์<span className="text-red-500">*</span></Label>
            <Input id="deviceModel" placeholder="เช่น iPhone 14" value={deviceModel} onChange={(e) => setDeviceModel(e.target.value)} disabled={isSubmitting} />
          </div>
          <div className="flex flex-col gap-2.5">
            <Label htmlFor="deviceColor" className="font-semibold text-slate-700">สีเครื่อง</Label>
            <Input id="deviceColor" placeholder="เช่น ดำ" value={deviceColor} onChange={(e) => setDeviceColor(e.target.value)} disabled={isSubmitting} />
          </div>
        </div>

        {/* แถวที่ 3: S/N & IMEI (ไม่บังคับกรอก) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8">
          <div className="flex flex-col gap-2.5">
            <Label htmlFor="serialNumber" className="font-semibold text-slate-700">Serial Number <span className="text-xs text-slate-400 font-normal">(ไม่บังคับ)</span></Label>
            <Input id="serialNumber" placeholder="กรอก S/N ตัวเครื่อง" value={serialNumber} onChange={(e) => setSerialNumber(e.target.value)} disabled={isSubmitting} />
          </div>
          <div className="flex flex-col gap-2.5">
            <Label htmlFor="imei" className="font-semibold text-slate-700">IMEI <span className="text-xs text-slate-400 font-normal">(ไม่บังคับ)</span></Label>
            <Input id="imei" placeholder="กรอกเลข IMEI 15 หลัก" value={imei} onChange={(e) => setImei(e.target.value)} disabled={isSubmitting} />
          </div>
        </div>

        {/* แถวที่ 4: บริการที่ต้องการ */}
        <div className="flex flex-col gap-3">
          <Label htmlFor="serviceName" className="font-semibold text-slate-700">บริการที่ต้องการ</Label>
          <Input id="serviceName" placeholder="เช่น เปลี่ยนจอ, เปลี่ยนแบต" value={serviceName} onChange={(e) => setServiceName(e.target.value)} className="focus-visible:ring-emerald-500" disabled={isSubmitting} />
          <div className="flex flex-wrap gap-2 pt-1">
            {COMMON_SERVICES.map((service) => (
              <button
                key={service} type="button" onClick={() => handleChipClick(service)} disabled={isSubmitting}
                className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${serviceName === service ? "bg-emerald-600 text-white border-emerald-600 shadow-sm" : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-700"}`}
              >
                {service}
              </button>
            ))}
          </div>
        </div>

        {/* แถวที่ 5: อาการเสีย */}
        <div className="flex flex-col gap-2.5">
          <Label htmlFor="issue" className="font-semibold text-slate-700">อาการเสีย / หมายเหตุ</Label>
          <Textarea id="issue" placeholder="อธิบายอาการเพิ่มเติม..." className="resize-none" rows={3} value={issue} onChange={(e) => setIssue(e.target.value)} disabled={isSubmitting} />
        </div>

        {/* 🌟 QUEUE IMAGE SYSTEM: ส่วนอัปโหลดรูปภาพ */}
        <div className="space-y-3 pt-2 border-t border-slate-100">
          <div className="flex items-center justify-between">
            <Label className="font-semibold text-slate-700">รูปภาพประกอบ <span className="text-xs text-slate-400 font-normal">(สูงสุด 4 รูป)</span></Label>
            <div>
              <Input type="file" id="image-upload" accept="image/*" multiple className="hidden" onChange={handleImageSelect} disabled={selectedImages.length >= 4 || isSubmitting} />
              <Button type="button" variant="outline" size="sm" className="h-8 border-slate-300" disabled={selectedImages.length >= 4 || isSubmitting} onClick={() => document.getElementById("image-upload")?.click()}>
                <ImagePlus className="w-4 h-4 mr-1.5" /> แนบรูปภาพ
              </Button>
            </div>
          </div>

          {selectedImages.length > 0 && (
            <div className="grid grid-cols-4 gap-3 mt-2">
              {selectedImages.map((img, idx) => (
                <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border border-slate-200 shadow-sm group">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img.preview} alt="preview" className="object-cover w-full h-full" />
                  <button type="button" onClick={() => removeImage(idx)} disabled={isSubmitting} className="absolute top-1.5 right-1.5 bg-black/60 text-white rounded-full p-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity hover:bg-rose-500">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* ส่วน Footer (จัดขวา) */}
      <div className="bg-slate-50 p-5 border-t border-slate-100 flex flex-row justify-end items-center gap-3 w-full shrink-0 mt-auto">
        <Button variant="outline" onClick={onCancel} disabled={isSubmitting} className="min-w-[100px] border-slate-300 text-slate-600">
          ยกเลิก
        </Button>
        <Button onClick={handleSubmit} className="bg-emerald-600 hover:bg-emerald-700 min-w-[140px]" disabled={!customerName || !deviceModel || !phone || isSubmitting}>
          {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          {isSubmitting ? "กำลังอัปโหลด..." : "บันทึกข้อมูล"}
        </Button>
      </div>
    </div>
  )
}