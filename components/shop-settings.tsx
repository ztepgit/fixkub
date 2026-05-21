"use client"

import { useState, useRef, useEffect } from "react"
import dynamic from "next/dynamic"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import {
  UploadCloud, Save, Store, Loader2, Info,
  QrCode, Copy, Download, Link as LinkIcon,
  Eye, EyeOff, AlertCircle, Users, UserMinus, Plus,
  ShieldCheck, AlertTriangle, Zap, CreditCard, CalendarDays
} from "lucide-react"

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

// 🌟 Date-fns สำหรับคำนวณวันที่
import { format, differenceInDays, isAfter } from "date-fns"
import { th } from "date-fns/locale"

import { updateShopSettings, getShopSettings, getShopStaff, addShopStaff, removeShopStaff } from "@/actions/shop"
import { useShopStore } from "@/store/useShopStore"

const QRCodeCanvas = dynamic(
  () => import("qrcode.react").then((mod) => mod.QRCodeCanvas),
  { ssr: false }
)

// 🌟 ตัวช่วยคำนวณสถานะแพ็กเกจ
const getPlanDisplay = (shop: any) => {
  if (!shop) return null;

  const isFreeTrial = shop.planType === "FREE_TRIAL";
  const expiryDate = shop.expiresAt ? new Date(shop.expiresAt) : (shop.trialEndsAt ? new Date(shop.trialEndsAt) : null);
  const now = new Date();

  const isExpired = expiryDate ? !isAfter(expiryDate, now) : false;

  // คำนวณจำนวนวันที่เหลือ
  const daysLeft = expiryDate && !isExpired ? differenceInDays(expiryDate, now) : 0;

  let badgeColor = "bg-emerald-100 text-emerald-700 border-emerald-200";
  let icon = <ShieldCheck className="h-5 w-5 text-emerald-600" />;
  let planName = shop.planType;

  if (isExpired) {
    badgeColor = "bg-rose-100 text-rose-700 border-rose-200";
    icon = <AlertTriangle className="h-5 w-5 text-rose-600" />;
  } else if (isFreeTrial) {
    badgeColor = "bg-blue-100 text-blue-700 border-blue-200";
    icon = <Zap className="h-5 w-5 text-blue-600" />;
    planName = "ทดลองใช้งานฟรี";
  }

  return { isFreeTrial, expiryDate, isExpired, daysLeft, badgeColor, icon, planName };
};


export function ShopSettings() {
  const currentZustandShop = useShopStore((s) => s.shop)
  const updateShop = useShopStore((s) => s.updateShop)

  const { toast } = useToast()
  const queryClient = useQueryClient()

  const fileInputRef = useRef<HTMLInputElement>(null)
  const qrWrapperRef = useRef<HTMLDivElement>(null)

  const { data: shop, isLoading, isError } = useQuery({
    queryKey: ["shop-settings", currentZustandShop?.id],
    queryFn: async () => {
      if (!currentZustandShop?.id) throw new Error("No active shop")

      const settingsRes = await getShopSettings(currentZustandShop.id)

      const fullShopData = {
        ...currentZustandShop,
        logoUrl: settingsRes.success && settingsRes.data ? settingsRes.data.logoUrl : null
      }

      updateShop(fullShopData)
      return fullShopData
    },
    enabled: !!currentZustandShop?.id
  })

  const { data: staffList = [], isLoading: isStaffLoading } = useQuery({
    queryKey: ["shop-staff", shop?.id],
    queryFn: async () => {
      if (!shop?.id) return [];
      const res = await getShopStaff(shop.id);
      return res.success ? (res.data?.filter((s: any) => s.role === "STAFF") || []) : [];
    },
    enabled: !!shop?.id
  })

  const [newStaffEmail, setNewStaffEmail] = useState("")
  const [newStaffName, setNewStaffName] = useState("")

  const addStaffMutation = useMutation({
    mutationFn: async (data: { email: string, name: string }) => {
      const res = await addShopStaff(shop!.id, data.email, data.name, "STAFF");
      if (!res.success) throw new Error(res.error);
      return res;
    },
    onSuccess: () => {
      toast({ title: "เพิ่มพนักงานสำเร็จ", description: "พนักงานสามารถล็อกอินด้วยอีเมลนี้ได้ทันที" })
      setNewStaffEmail("")
      setNewStaffName("")
      queryClient.invalidateQueries({ queryKey: ["shop-staff", shop?.id] })
    },
    onError: (err: any) => {
      toast({ title: "ไม่สามารถเพิ่มพนักงานได้", description: err.message, variant: "destructive" })
    }
  })

  const removeStaffMutation = useMutation({
    mutationFn: async (email: string) => {
      const res = await removeShopStaff(shop!.id, email);
      if (!res.success) throw new Error(res.error);
      return res;
    },
    onSuccess: () => {
      toast({ title: "ลบพนักงานสำเร็จ", description: "พนักงานถูกถอดออกจากร้านเรียบร้อยแล้ว" })
      queryClient.invalidateQueries({ queryKey: ["shop-staff", shop?.id] })
    },
    onError: (err: any) => {
      toast({ title: "เกิดข้อผิดพลาด", description: err.message, variant: "destructive" })
    }
  })

  const [shopName, setShopName] = useState("")
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [logoFile, setLogoFile] = useState<Blob | null>(null)
  const [shopUrl, setShopUrl] = useState("")

  const [isSaving, setIsSaving] = useState(false)
  const [isQrHidden, setIsQrHidden] = useState(false)

  useEffect(() => {
    if (shop) {
      setShopName(shop.name || "")
      setLogoPreview(shop.logoUrl || null)
      setShopUrl(shop.slug ? `https://${shop.slug}.getfixx.net` : "")
    }
  }, [shop])

  const processImage = (file: File) => {
    const reader = new FileReader()
    reader.onload = (event) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement("canvas")
        const MAX_SIZE = 200
        const size = Math.min(img.width, img.height)
        const startX = (img.width - size) / 2
        const startY = (img.height - size) / 2

        canvas.width = MAX_SIZE
        canvas.height = MAX_SIZE
        const ctx = canvas.getContext("2d")

        if (ctx) {
          ctx.fillStyle = "rgba(255, 255, 255, 0)"
          ctx.fillRect(0, 0, MAX_SIZE, MAX_SIZE)
          ctx.drawImage(img, startX, startY, size, size, 0, 0, MAX_SIZE, MAX_SIZE)

          canvas.toBlob((blob) => {
            if (blob) {
              setLogoFile(blob)
              setLogoPreview(URL.createObjectURL(blob))
            }
          }, "image/webp", 0.8)
        }
      }
      img.src = event.target?.result as string
    }
    reader.readAsDataURL(file)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      if (!file.type.startsWith("image/")) {
        toast({ title: "ไฟล์ไม่รองรับ", description: "กรุณาอัปโหลดไฟล์รูปภาพ", variant: "destructive" })
        return
      }
      processImage(file)
    }
  }

  const handleSave = async () => {
    if (!shop?.id) return

    setIsSaving(true)

    updateShop({ ...shop, name: shopName, logoUrl: logoPreview })

    const formData = new FormData()
    formData.append("shopId", shop.id)
    formData.append("name", shopName)

    if (logoFile) {
      formData.append("logo", logoFile, "logo.webp")
    } else if (logoPreview) {
      formData.append("existingLogoUrl", logoPreview)
    }

    const res = await updateShopSettings(formData)

    if (res.success && res.data) {
      updateShop({ ...shop, name: res.data.name, logoUrl: res.data.logoUrl })
      toast({ title: "✅ บันทึกข้อมูลสำเร็จ", description: "อัปเดตข้อมูลร้านค้าเรียบร้อยแล้ว" })
    } else {
      toast({ title: "❌ เกิดข้อผิดพลาด", description: res.error, variant: "destructive" })
    }

    setIsSaving(false)
  }

  const getInitial = (name: string) => {
    return name && name !== "กำลังโหลด..." ? name.charAt(0).toUpperCase() : "S"
  }

  const copyLink = () => {
    if (!shopUrl) return
    navigator.clipboard.writeText(shopUrl)
    toast({ title: "✅ คัดลอกลิงก์สำเร็จ", description: "นำไปวางในเพจ Facebook, LINE หรือส่งให้ลูกค้าได้เลย" })
  }

  const downloadQR = () => {
    if (!qrWrapperRef.current) return;
    const canvas = qrWrapperRef.current.querySelector('canvas');

    if (canvas) {
      const url = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.href = url;
      const downloadName = shop?.slug ? `QR-Code-${shop.slug}.png` : `QR-Code-แจ้งซ่อม-${shop?.id}.png`;
      link.download = downloadName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast({ title: "📥 ดาวน์โหลดสำเร็จ", description: "รูป QR Code ถูกบันทึกลงในเครื่องแล้ว" })
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-[60vh] w-full items-center justify-center text-slate-400 dark:text-slate-500 gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500 dark:text-emerald-600" />
        <p className="text-lg">กำลังโหลดข้อมูลร้านค้า...</p>
      </div>
    )
  }

  if (isError || !shop) {
    return (
      <div className="flex h-[60vh] w-full items-center justify-center text-rose-500 dark:text-rose-400 gap-3">
        <AlertCircle className="h-8 w-8" />
        <p className="text-lg">ไม่พบข้อมูลร้านค้า หรือการเชื่อมต่อมีปัญหา กรุณารีเฟรชหน้าจอ</p>
      </div>
    )
  }

  if (shop.role === "STAFF") {
    return (
      <div className="flex flex-col h-[60vh] w-full items-center justify-center text-slate-500 dark:text-slate-400 gap-3">
        <Users className="h-12 w-12 text-slate-300 dark:text-slate-600" />
        <p className="text-lg font-medium text-slate-700 dark:text-slate-300">สิทธิ์การใช้งานจำกัด</p>
        <p className="text-sm text-slate-500 dark:text-slate-400">เฉพาะเจ้าของร้านเท่านั้นที่สามารถแก้ไขการตั้งค่า หรือจัดการพนักงานได้</p>
      </div>
    )
  }

  // เตรียมข้อมูลสถานะแพ็กเกจ
  const planInfo = getPlanDisplay(shop);

  return (
    <TooltipProvider>
      <div className="grid gap-8 lg:grid-cols-12 max-w-6xl mx-auto py-6">

        <div className="space-y-6 lg:col-span-8">
          <div>
            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">ตั้งค่าร้านค้า (Shop Settings)</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">ปรับแต่งชื่อ โลโก้ และจัดการพนักงาน</p>
          </div>

          {/* 🌟 1. ส่วนแสดงสถานะแพ็กเกจ (โชว์เฉพาะ OWNER) */}
          {shop?.role === "OWNER" && planInfo && (
            <Card className={`border shadow-sm relative overflow-hidden ${planInfo.isExpired ? 'border-rose-200 bg-rose-50/50 dark:bg-rose-950/20' : 'border-slate-200 dark:border-slate-800 dark:bg-slate-900'}`}>
              {/* แถบสีด้านซ้าย */}
              <div className={`absolute top-0 left-0 w-1.5 h-full ${planInfo.isExpired ? 'bg-rose-500' : (planInfo.isFreeTrial ? 'bg-blue-500' : 'bg-emerald-500')}`}></div>

              <CardContent className="p-5 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
                  <div className="flex items-start gap-4">
                    <div className="h-12 w-12 rounded-full bg-white dark:bg-slate-800 shadow-sm flex items-center justify-center shrink-0 border border-slate-100 dark:border-slate-700">
                      {planInfo.icon}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">แพ็กเกจปัจจุบัน</span>
                        <Badge variant="outline" className={`uppercase ${planInfo.badgeColor}`}>
                          {planInfo.planName.replace('_', ' ')}
                        </Badge>
                        {planInfo.isExpired && <Badge variant="destructive" className="text-xs">หมดอายุแล้ว</Badge>}
                      </div>

                      <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-medium">
                        <CalendarDays className="h-4 w-4 text-slate-400" />
                        {planInfo.expiryDate ? (
                          <>
                            {planInfo.isExpired ? 'หมดอายุเมื่อ:' : 'เหลือเวลา:'}
                            <span className={`ml-1 ${planInfo.isExpired ? 'text-rose-600' : (planInfo.daysLeft <= 3 ? 'text-amber-600' : 'text-emerald-600')}`}>
                              {planInfo.isExpired
                                ? format(planInfo.expiryDate, "dd MMM yyyy", { locale: th })
                                : `${planInfo.daysLeft} วัน (ถึง ${format(planInfo.expiryDate, "dd MMM yyyy", { locale: th })})`}
                            </span>
                          </>
                        ) : (
                          "ไม่มีข้อมูลวันหมดอายุ"
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0 pt-2 sm:pt-0 w-full sm:w-auto">
                    <Button
                      onClick={() => window.location.href = `/checkout?shopId=${shop.id}&plan=yearly`}
                      className={`w-full sm:w-auto shadow-md transition-all ${planInfo.isExpired
                          ? 'bg-rose-600 hover:bg-rose-700 animate-pulse ring-2 ring-rose-200 ring-offset-2'
                          : 'bg-emerald-600 hover:bg-emerald-700 hover:scale-105'
                        }`}
                    >
                      <CreditCard className="mr-2 h-4 w-4" />
                      {planInfo.isExpired ? 'ชำระเงินเพื่อใช้งานต่อ' : 'อัปเกรด / ต่ออายุแพ็กเกจ'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 🌟 2. การตั้งค่าข้อมูลร้านค้า */}
          <Card className="border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden dark:bg-slate-900">
            <CardContent className="pt-6 space-y-6">
              <div className="space-y-2">
                <Label htmlFor="shopName" className="font-semibold text-slate-700 dark:text-slate-300">ชื่อร้านค้า (Display Name)</Label>
                <Input
                  id="shopName"
                  value={shopName}
                  onChange={(e) => setShopName(e.target.value)}
                  placeholder="เช่น ร้าน A Mobile Repair"
                  className="text-lg h-12 focus-visible:ring-emerald-500 dark:focus-visible:ring-emerald-600 dark:bg-slate-950 dark:border-slate-700 dark:text-slate-100"
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="font-semibold text-slate-700 dark:text-slate-300">โลโก้ร้าน (Shop Logo)</Label>
                  <span className="text-xs text-slate-500 dark:text-slate-400 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 px-2 py-1 rounded flex items-center border dark:border-emerald-900/50">
                    <Info className="h-3 w-3 mr-1" /> เพิ่มความน่าเชื่อถือ
                  </span>
                </div>

                <div className="flex items-center gap-6">
                  <Avatar className="h-20 w-20 border-2 border-slate-100 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-950">
                    {logoPreview ? (
                      <AvatarImage src={logoPreview} alt="Shop Logo" className="object-cover bg-white" />
                    ) : (
                      <AvatarFallback className="bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-500 text-3xl font-bold">
                        {getInitial(shopName)}
                      </AvatarFallback>
                    )}
                  </Avatar>

                  <div className="space-y-2 flex-1">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full flex items-center gap-2 border-slate-300 dark:border-slate-700 border-dashed hover:border-emerald-500 dark:hover:border-emerald-600 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors dark:text-slate-300 dark:bg-slate-900"
                    >
                      <UploadCloud className="h-4 w-4" /> อัปโหลดรูปภาพ
                    </Button>
                    <Input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                    <p className="text-xs text-slate-400 dark:text-slate-500">ระบบจะทำการย่อรูปให้อัตโนมัติเพื่อความรวดเร็ว</p>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="bg-slate-50 dark:bg-slate-900/50 border-t dark:border-slate-800 py-4">
              <Button onClick={handleSave} disabled={isSaving || !shop?.id} className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white text-base shadow-sm dark:bg-emerald-700 dark:hover:bg-emerald-600">
                {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                {isSaving ? "กำลังบันทึก..." : "บันทึกการตั้งค่า"}
              </Button>
            </CardFooter>
          </Card>

          {/* 🌟 3. ช่องทางแจ้งซ่อม */}
          <Card className={`shadow-sm transition-all duration-500 overflow-hidden animate-in fade-in slide-in-from-bottom-4 dark:bg-slate-900 ${isQrHidden ? 'border-slate-200 dark:border-slate-800 border-t-4 border-t-slate-300 dark:border-t-slate-700 bg-slate-50/30 dark:bg-slate-900/50' : 'border-slate-200 dark:border-slate-800 border-t-4 border-t-blue-500 dark:border-t-blue-600'}`}>
            <CardHeader className="bg-slate-50/50 dark:bg-slate-900/50 border-b dark:border-slate-800 pb-4 flex flex-row items-center justify-between space-y-0 gap-3">
              <div className="space-y-1">
                <CardTitle className={`text-lg flex items-center gap-2 ${isQrHidden ? 'text-slate-500 dark:text-slate-400' : 'text-slate-800 dark:text-slate-100'}`}>
                  <QrCode className={`h-5 w-5 ${isQrHidden ? 'text-slate-400 dark:text-slate-500' : 'text-blue-600 dark:text-blue-500'}`} />
                  {isQrHidden ? 'ซ่อนรหัส QR แล้ว' : 'ช่องทางแจ้งซ่อม (Booking URL & QR)'}
                </CardTitle>
                <CardDescription className={isQrHidden ? 'text-slate-400 dark:text-slate-500' : 'dark:text-slate-400'}>
                  {isQrHidden ? 'กดปุ่มขวาบนเพื่อแสดงอีกครั้ง' : 'แชร์ลิงก์ให้ลูกค้า หรือดาวน์โหลด QR Code นำไปทำป้ายตั้งโต๊ะ'}
                </CardDescription>
              </div>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={`h-8 w-8 rounded-full shrink-0 ${isQrHidden ? 'text-slate-500 hover:text-slate-800 hover:bg-slate-200 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800' : 'text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:text-slate-500 dark:hover:text-blue-400 dark:hover:bg-slate-800'}`}
                    onClick={() => setIsQrHidden(!isQrHidden)}
                  >
                    {isQrHidden ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent><p>{isQrHidden ? "แสดง QR Code" : "ซ่อน QR Code"}</p></TooltipContent>
              </Tooltip>
            </CardHeader>

            <CardContent className="pt-6 relative">
              <div className="flex flex-col sm:flex-row gap-6 items-center sm:items-start">

                {isQrHidden ? (
                  <div className="flex flex-col items-center justify-center h-[156px] w-[156px] bg-slate-50 dark:bg-slate-800/50 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 animate-in fade-in duration-300 shrink-0">
                    <div className="h-12 w-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center border-4 border-white dark:border-slate-900 shadow-sm mb-2">
                      <QrCode className="h-6 w-6 text-slate-300 dark:text-slate-600 opacity-60" />
                    </div>
                    <p className="text-[10px] font-medium text-slate-400 dark:text-slate-500">QR Code ถูกซ่อน</p>
                  </div>
                ) : (
                  <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 transition-transform hover:scale-105 duration-300 shrink-0 animate-in fade-in duration-300">
                    {shopUrl ? (
                      <div ref={qrWrapperRef}>
                        <QRCodeCanvas value={shopUrl} size={130} bgColor={"#ffffff"} fgColor={"#0f172a"} level={"H"} includeMargin={false} />
                      </div>
                    ) : (
                      <div className="w-[130px] h-[130px] bg-slate-50 dark:bg-slate-800 rounded-lg flex flex-col items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-700 text-center p-2">
                        <p className="text-xs text-slate-400 dark:text-slate-500">ยังไม่มี URL ร้าน<br />(กรุณาตั้งชื่อ URL)</p>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex-1 w-full space-y-4">
                  <div className="space-y-2">
                    <Label className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">ลิงก์ร้านค้าของคุณ (URL)</Label>
                    <div className="flex gap-2">
                      <Input
                        readOnly
                        value={shopUrl || "ยังไม่มี URL ร้านค้า"}
                        className={`bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 focus-visible:ring-0 cursor-copy ${!shopUrl ? 'text-rose-400 italic' : ''}`}
                        onClick={(e) => (e.target as HTMLInputElement).select()}
                      />
                      <Button variant="outline" size="icon" onClick={copyLink} disabled={!shopUrl} className="shrink-0 text-slate-500 hover:text-blue-600 hover:bg-blue-50 border-slate-200 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800 dark:text-slate-400 dark:hover:text-blue-400">
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="flex gap-2 w-full pt-1">
                    <Button variant="outline" className="flex-1 text-slate-700 border-slate-300 hover:bg-slate-50 h-10 dark:text-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800 dark:hover:text-white" onClick={copyLink} disabled={!shopUrl}>
                      <LinkIcon className="h-4 w-4 mr-2 text-slate-500 dark:text-slate-400" /> คัดลอกลิงก์
                    </Button>
                    <Button className="flex-1 bg-blue-600 hover:bg-blue-700 text-white h-10 shadow-sm" onClick={downloadQR} disabled={isQrHidden || !shopUrl}>
                      <Download className="h-4 w-4 mr-2" /> โหลดคิวอาร์โค้ด
                    </Button>
                  </div>
                </div>

              </div>
            </CardContent>
          </Card>

          {/* 🌟 4. จัดการพนักงาน */}
          <Card className="border-slate-200 dark:border-slate-800 shadow-sm dark:bg-slate-900">
            <CardHeader className="bg-slate-50/50 dark:bg-slate-900/50 border-b dark:border-slate-800 pb-4">
              <CardTitle className="text-lg flex items-center gap-2 text-slate-800 dark:text-slate-100">
                <Users className="h-5 w-5 text-blue-600 dark:text-blue-500" />
                จัดการพนักงาน (Staff)
              </CardTitle>
              <CardDescription className="dark:text-slate-400">
                สร้างพนักงาน เพื่อเพิ่มหน้าจอใช้งาน ({staffList.length}/2)
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              {isStaffLoading ? (
                <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-slate-300 dark:text-slate-600" /></div>
              ) : (
                <>
                  {staffList.length > 0 ? (
                    <div className="space-y-3">
                      {staffList.map((staff: any) => (
                        <div key={staff.id} className="flex items-center justify-between p-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-blue-700 dark:text-blue-400 font-bold text-sm">
                              {(staff.name || staff.email).charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                {staff.name ? staff.name : staff.email}
                              </p>
                              {staff.name && <p className="text-[10px] text-slate-500 dark:text-slate-400">{staff.email}</p>}
                              <Badge variant="secondary" className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 mt-1">STAFF</Badge>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeStaffMutation.mutate(staff.email)}
                            disabled={removeStaffMutation.isPending}
                            className="text-rose-500 hover:bg-rose-50 hover:text-rose-600 dark:text-rose-400 dark:hover:bg-rose-950/50 dark:hover:text-rose-300"
                          >
                            {removeStaffMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserMinus className="h-4 w-4" />}
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-lg bg-slate-50/50 dark:bg-slate-900/50">
                      <p className="text-sm text-slate-500 dark:text-slate-400">ยังไม่มีพนักงานในร้านนี้</p>
                    </div>
                  )}

                  {staffList.length < 2 && (
                    <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs text-slate-500">ชื่อพนักงาน <span className="text-red-500">*</span></Label>
                          <Input
                            placeholder="เช่น สมชาย ช่างซ่อม"
                            value={newStaffName}
                            onChange={(e) => setNewStaffName(e.target.value)}
                            className="dark:bg-slate-950 dark:border-slate-700 dark:text-slate-200"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs text-slate-500">อีเมลเพื่อเข้าสู่ระบบ <span className="text-red-500">*</span></Label>
                          <Input
                            type="email"
                            placeholder="staff@email.com"
                            value={newStaffEmail}
                            onChange={(e) => setNewStaffEmail(e.target.value)}
                            className="dark:bg-slate-950 dark:border-slate-700 dark:text-slate-200"
                          />
                        </div>
                      </div>
                      <Button
                        onClick={() => addStaffMutation.mutate({ email: newStaffEmail, name: newStaffName })}
                        disabled={!newStaffEmail.includes("@") || newStaffName.trim().length === 0 || addStaffMutation.isPending}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white mt-2"
                      >
                        {addStaffMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
                        เพิ่มพนักงานใหม่
                      </Button>
                    </div>
                  )}

                  {staffList.length >= 2 && (
                    <p className="text-xs text-amber-600 dark:text-amber-500 bg-amber-50 dark:bg-amber-950/30 border dark:border-amber-900/50 p-2 rounded flex items-center gap-1.5">
                      <Info className="h-3 w-3 shrink-0" /> คุณใช้สิทธิ์พนักงานครบแล้ว อัปเกรดเพื่อเพิ่มทีมงานได้สูงสุด 5 คน
                    </p>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-4 relative hidden md:block">
          <div className="sticky top-24 space-y-4">
            <div className="flex items-center justify-center">
              <Label className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center">
                <Store className="h-4 w-4 mr-2" />
                ตัวอย่างหน้าจอฝั่งลูกค้า
              </Label>
            </div>

            <div className="mx-auto w-full max-w-[320px] bg-slate-100 dark:bg-slate-900 border-[8px] border-slate-800 dark:border-slate-950 rounded-[2.5rem] shadow-xl overflow-hidden relative min-h-[550px] flex flex-col pointer-events-none select-none">
              <div className="absolute top-0 inset-x-0 h-5 bg-slate-800 dark:bg-slate-950 w-28 mx-auto rounded-b-xl z-20"></div>

              <div className="flex-1 overflow-y-auto no-scrollbar pb-6 bg-slate-100/50 dark:bg-slate-900/50">
                <div className="bg-white px-5 pt-10 pb-4 rounded-t-[2rem] border-b border-slate-100 shadow-sm flex flex-col items-center text-center relative z-10">
                  <Avatar className="h-14 w-14 border-2 border-white shadow-md mb-2 bg-white">
                    {logoPreview ? (
                      <AvatarImage src={logoPreview} alt="Preview Logo" className="object-cover" />
                    ) : (
                      <AvatarFallback className="bg-emerald-100 text-emerald-700 text-xl font-bold">
                        {getInitial(shopName)}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <h3 className="font-bold text-slate-800 text-base truncate w-full px-2">{shopName && shopName !== "กำลังโหลด..." ? shopName : "ชื่อร้านของคุณ"}</h3>
                  <p className="text-[10px] text-slate-500 mt-0.5">ฟอร์มแจ้งซ่อมออนไลน์</p>
                </div>

                <div className="p-4 space-y-4 bg-white mx-3 mt-3 rounded-xl shadow-sm border border-slate-50">
                  <div className="space-y-2">
                    <div className="h-3 w-20 bg-slate-200 rounded"></div>
                    <div className="h-8 w-full bg-slate-50 border border-slate-100 rounded-md"></div>
                    <div className="flex gap-1.5 pt-1">
                      <div className="h-6 w-14 bg-emerald-100 rounded-full"></div>
                      <div className="h-6 w-16 bg-slate-100 rounded-full"></div>
                      <div className="h-6 w-12 bg-slate-100 rounded-full"></div>
                    </div>
                  </div>
                  <div className="space-y-2 pt-2 border-t border-slate-50">
                    <div className="h-3 w-24 bg-slate-200 rounded"></div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="h-8 w-full bg-slate-50 border border-slate-100 rounded-md"></div>
                      <div className="h-8 w-full bg-slate-50 border border-slate-100 rounded-md"></div>
                    </div>
                    <div className="h-16 w-full bg-slate-50 border border-slate-100 rounded-md mt-2"></div>
                  </div>
                  <div className="pt-2 border-t border-slate-50">
                    <div className="h-10 w-full bg-emerald-500 rounded-lg"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </TooltipProvider>
  )
}