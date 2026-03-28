"use client"

import { useState, useRef, useEffect } from "react"
import dynamic from "next/dynamic"
import { useQuery } from "@tanstack/react-query" 
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { 
  UploadCloud, Save, Store, Loader2, Info, 
  QrCode, Copy, Download, Link as LinkIcon,
  Eye, EyeOff, AlertCircle
} from "lucide-react"

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

// 🌟 1. Import getShopSettings เข้ามาช่วยดึง Logo
import { updateShopSettings, getUserShops, getShopSettings } from "@/actions/shop"
import { useShopStore } from "@/store/useShopStore"
import { supabase } from "@/lib/supabase"

const QRCodeCanvas = dynamic(
  () => import("qrcode.react").then((mod) => mod.QRCodeCanvas),
  { ssr: false }
)

export function ShopSettings() {
  const updateShop = useShopStore((s) => s.updateShop)
  const { toast } = useToast()

  const fileInputRef = useRef<HTMLInputElement>(null)
  const qrWrapperRef = useRef<HTMLDivElement>(null) 

  const { data: shop, isLoading, isError } = useQuery({
    queryKey: ["shop-settings"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user?.email) throw new Error("Unauthorized")

      // สเต็ป 1: หาร้านค้าของ User ให้เจอ
      const res = await getUserShops(user.email)
      if (!res.success || !res.shops || res.shops.length === 0) {
        throw new Error("Shop not found")
      }

      const baseShop = res.shops[0]

      // 🌟 สเต็ป 2: ใช้ getShopSettings เพื่อดึง logoUrl ของแท้มาประกอบร่าง
      const settingsRes = await getShopSettings(baseShop.id)
      
      const fullShopData = {
        ...baseShop,
        logoUrl: settingsRes.success && settingsRes.data ? settingsRes.data.logoUrl : null
      }

      // ดันเข้า Store ทันที
      updateShop(fullShopData)
      return fullShopData
    }
  })

  const [shopName, setShopName] = useState("")
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [logoFile, setLogoFile] = useState<Blob | null>(null) 
  const [shopUrl, setShopUrl] = useState("")
  
  const [isSaving, setIsSaving] = useState(false)
  const [isQrHidden, setIsQrHidden] = useState(false)

  // 🌟 Type จะไม่แดงแล้ว เพราะ fullShopData มี logoUrl แน่นอน
  useEffect(() => {
    if (shop) {
      setShopName(shop.name || "")
      setLogoPreview(shop.logoUrl || null)
      setShopUrl(shop.slug ? `https://${shop.slug}.esyq.net` : "")
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
    
    // Optimistic Update
    updateShop({ name: shopName, logoUrl: logoPreview })
    
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
      updateShop({ name: res.data.name, logoUrl: res.data.logoUrl }) 
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
      <div className="flex h-[60vh] w-full items-center justify-center text-slate-400 gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
        <p className="text-lg">กำลังโหลดข้อมูลร้านค้า...</p>
      </div>
    )
  }

  if (isError || !shop) {
    return (
        <div className="flex h-[60vh] w-full items-center justify-center text-rose-500 gap-3">
            <AlertCircle className="h-8 w-8" />
            <p className="text-lg">ไม่พบข้อมูลร้านค้า หรือการเชื่อมต่อมีปัญหา กรุณารีเฟรชหน้าจอ</p>
        </div>
    )
  }

  return (
    <TooltipProvider>
      <div className="grid gap-8 md:grid-cols-2 max-w-5xl mx-auto py-6">
        
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-800 tracking-tight">ตั้งค่าร้านค้า (Shop Settings)</h2>
            <p className="text-sm text-slate-500">ปรับแต่งชื่อและโลโก้เพื่อแสดงผลบนฟอร์มของลูกค้า</p>
          </div>

          <Card className="border-slate-200 shadow-sm relative overflow-hidden">
            <CardContent className="pt-6 space-y-6">
              <div className="space-y-2">
                <Label htmlFor="shopName" className="font-semibold text-slate-700">ชื่อร้านค้า (Display Name)</Label>
                <Input 
                  id="shopName" 
                  value={shopName} 
                  onChange={(e) => setShopName(e.target.value)} 
                  placeholder="เช่น ร้าน A Mobile Repair" 
                  className="text-lg h-12 focus-visible:ring-emerald-500"
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="font-semibold text-slate-700">โลโก้ร้าน (Shop Logo)</Label>
                  <span className="text-xs text-slate-500 bg-emerald-50 text-emerald-700 px-2 py-1 rounded flex items-center">
                    <Info className="h-3 w-3 mr-1" /> เพิ่มความน่าเชื่อถือ
                  </span>
                </div>
                
                <div className="flex items-center gap-6">
                  <Avatar className="h-20 w-20 border-2 border-slate-100 shadow-sm">
                    {logoPreview ? (
                      <AvatarImage src={logoPreview} alt="Shop Logo" className="object-cover bg-white" />
                    ) : (
                      <AvatarFallback className="bg-emerald-100 text-emerald-700 text-3xl font-bold">
                        {getInitial(shopName)}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  
                  <div className="space-y-2 flex-1">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full flex items-center gap-2 border-slate-300 border-dashed hover:border-emerald-500 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                    >
                      <UploadCloud className="h-4 w-4" /> อัปโหลดรูปภาพ
                    </Button>
                    <Input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                    <p className="text-xs text-slate-400">ระบบจะทำการย่อรูปให้อัตโนมัติเพื่อความรวดเร็ว</p>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="bg-slate-50 border-t py-4">
              <Button onClick={handleSave} disabled={isSaving || !shop?.id} className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-base shadow-sm">
                {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                {isSaving ? "กำลังบันทึก..." : "บันทึกการตั้งค่า"}
              </Button>
            </CardFooter>
          </Card>

          <Card className={`shadow-sm transition-all duration-500 overflow-hidden animate-in fade-in slide-in-from-bottom-4 ${isQrHidden ? 'border-slate-200 border-t-4 border-t-slate-300 bg-slate-50/30' : 'border-slate-200 border-t-4 border-t-blue-500'}`}>
            <CardHeader className="bg-slate-50/50 border-b pb-4 flex flex-row items-center justify-between space-y-0 gap-3">
              <div className="space-y-1">
                <CardTitle className={`text-lg flex items-center gap-2 ${isQrHidden ? 'text-slate-500' : 'text-slate-800'}`}>
                  <QrCode className={`h-5 w-5 ${isQrHidden ? 'text-slate-400' : 'text-blue-600'}`} />
                  {isQrHidden ? 'ซ่อนรหัส QR แล้ว' : 'ช่องทางแจ้งซ่อม (Booking URL & QR)'}
                </CardTitle>
                <CardDescription className={isQrHidden ? 'text-slate-400' : ''}>
                  {isQrHidden ? 'กดปุ่มขวาบนเพื่อแสดงอีกครั้ง' : 'แชร์ลิงก์ให้ลูกค้า หรือดาวน์โหลด QR Code นำไปทำป้ายตั้งโต๊ะ'}
                </CardDescription>
              </div>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className={`h-8 w-8 rounded-full shrink-0 ${isQrHidden ? 'text-slate-500 hover:text-slate-800 hover:bg-slate-200' : 'text-slate-400 hover:text-blue-600 hover:bg-blue-50'}`} 
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
                  <div className="flex flex-col items-center justify-center h-[156px] w-[156px] bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 animate-in fade-in duration-300 shrink-0">
                    <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center border-4 border-white shadow-sm mb-2"><QrCode className="h-6 w-6 text-slate-300 opacity-60" /></div>
                    <p className="text-[10px] font-medium text-slate-400">QR Code ถูกซ่อน</p>
                  </div>
                ) : (
                  <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-200 transition-transform hover:scale-105 duration-300 shrink-0 animate-in fade-in duration-300">
                    {shopUrl ? (
                      <div ref={qrWrapperRef}>
                        <QRCodeCanvas value={shopUrl} size={130} bgColor={"#ffffff"} fgColor={"#0f172a"} level={"H"} includeMargin={false} />
                      </div>
                    ) : (
                      <div className="w-[130px] h-[130px] bg-slate-50 rounded-lg flex flex-col items-center justify-center border-2 border-dashed border-slate-200 text-center p-2">
                         <p className="text-xs text-slate-400">ยังไม่มี URL ร้าน<br/>(กรุณาตั้งชื่อ URL)</p>
                      </div>
                    )}
                  </div>
                )}
                
                <div className="flex-1 w-full space-y-4">
                  <div className="space-y-2">
                    <Label className="text-xs text-slate-500 font-bold uppercase tracking-wider">ลิงก์ร้านค้าของคุณ (URL)</Label>
                    <div className="flex gap-2">
                      <Input readOnly value={shopUrl || "ยังไม่มี URL ร้านค้า"} className={`bg-slate-50 text-slate-600 border-slate-200 focus-visible:ring-0 cursor-copy ${!shopUrl ? 'text-rose-400 italic' : ''}`} onClick={(e) => (e.target as HTMLInputElement).select()} />
                      <Button variant="outline" size="icon" onClick={copyLink} disabled={!shopUrl} className="shrink-0 text-slate-500 hover:text-blue-600 hover:bg-blue-50 border-slate-200"><Copy className="h-4 w-4" /></Button>
                    </div>
                  </div>
                  
                  <div className="flex gap-2 w-full pt-1">
                    <Button variant="outline" className="flex-1 text-slate-700 h-10 border-slate-300 hover:bg-slate-50" onClick={copyLink} disabled={!shopUrl}>
                      <LinkIcon className="h-4 w-4 mr-2 text-slate-500" /> คัดลอกลิงก์
                    </Button>
                    <Button className="flex-1 bg-blue-600 hover:bg-blue-700 h-10 shadow-sm" onClick={downloadQR} disabled={isQrHidden || !shopUrl}>
                      <Download className="h-4 w-4 mr-2" /> โหลดคิวอาร์โค้ด
                    </Button>
                  </div>
                </div>

              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-center md:justify-start">
            <Label className="text-sm font-bold text-slate-500 uppercase tracking-wider flex items-center">
              <Store className="h-4 w-4 mr-2" />
              ตัวอย่างหน้าจอฝั่งลูกค้า
            </Label>
          </div>
          
          <div className="mx-auto md:ml-0 w-full max-w-[340px] bg-slate-100 border-[8px] border-slate-800 rounded-[2.5rem] shadow-2xl overflow-hidden relative min-h-[500px] flex flex-col pointer-events-none select-none">
            <div className="absolute top-0 inset-x-0 h-5 bg-slate-800 w-32 mx-auto rounded-b-xl z-20"></div>
            <div className="flex-1 overflow-y-auto no-scrollbar pb-6 bg-slate-100/50">
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
    </TooltipProvider>
  )
}