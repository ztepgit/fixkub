"use client"

import { useState, useEffect } from "react"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { 
  Breadcrumb, 
  BreadcrumbItem, 
  BreadcrumbLink, 
  BreadcrumbList, 
  BreadcrumbPage, 
  BreadcrumbSeparator 
} from "@/components/ui/breadcrumb"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useToast } from "@/hooks/use-toast"

import { QRCodeCanvas } from "qrcode.react"
import { QrCode, Copy, Download, Link as LinkIcon, Eye, EyeOff, Loader2 } from "lucide-react"

export function DashboardHeader() {
  const SHOP_ID = "shop_test_001" 

  const [shopUrl, setShopUrl] = useState("")
  const [isShareOpen, setIsShareOpen] = useState(false)
  const [isQrHidden, setIsQrHidden] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setShopUrl(`${window.location.origin}/shop/${SHOP_ID}`)
    }
  }, [])

  const copyLink = () => {
    navigator.clipboard.writeText(shopUrl)
    toast({ 
      title: "✅ คัดลอกลิงก์สำเร็จ", 
      description: "นำไปวางในเพจ Facebook, LINE หรือส่งให้ลูกค้าได้เลย" 
    })
  }

  const downloadQR = () => {
    const canvas = document.getElementById("header-qr-code") as HTMLCanvasElement;
    if (canvas) {
      const url = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.href = url;
      link.download = `QR-Code-แจ้งซ่อม-${SHOP_ID}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast({ title: "📥 ดาวน์โหลดสำเร็จ", description: "รูป QR Code ถูกบันทึกลงในเครื่องแล้ว" })
    }
  }

  return (
    <header className="flex w-full h-16 md:h-20 shrink-0 items-center justify-between border-b px-4 md:px-6 bg-white/80 backdrop-blur-md sticky top-0 z-40">
      
      <div className="flex items-center gap-2">
        <SidebarTrigger className="-ml-1 text-slate-500 hover:text-slate-800" />
        <Separator orientation="vertical" className="mr-2 h-4 bg-slate-200" />
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem className="hidden md:block">
              <BreadcrumbLink href="#" className="text-slate-500 hover:text-slate-800">
                ระบบจัดการคิว
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator className="hidden md:block text-slate-300" />
            <BreadcrumbItem>
              <BreadcrumbPage className="font-semibold text-slate-800">ภาพรวม</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      <div className="ml-auto flex items-center gap-3">
        <TooltipProvider>
          <Button 
            variant="outline" 
            className="hidden sm:flex bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 hover:text-blue-800 shadow-sm transition-all h-10 px-4"
            onClick={() => setIsShareOpen(true)}
          >
            <QrCode className="w-4 h-4 mr-2" /> แชร์ลิงก์ร้าน
          </Button>

          <Button 
            variant="outline" 
            size="icon" 
            className="sm:hidden bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 shadow-sm h-10 w-10"
            onClick={() => setIsShareOpen(true)}
          >
            <QrCode className="w-5 h-5" />
          </Button>
        </TooltipProvider>

        <Dialog open={isShareOpen} onOpenChange={setIsShareOpen}>
          {/* 🌟 เพิ่ม onOpenAutoFocus ป้องกัน Tooltip เด้งเองตอนเปิด Pop-up */}
          <DialogContent 
            className="sm:max-w-[420px] p-0 overflow-hidden border-0 shadow-2xl rounded-2xl"
            onOpenAutoFocus={(e) => e.preventDefault()}
          >
            
            <DialogHeader className={`p-6 pb-4 border-b ${isQrHidden ? 'bg-slate-50/50' : 'bg-blue-50/50'}`}>
              <div className="flex items-start justify-between pr-4">
                <div className="space-y-1">
                  <DialogTitle className={`text-xl flex items-center gap-2 ${isQrHidden ? 'text-slate-600' : 'text-blue-800'}`}>
                    <QrCode className={`h-5 w-5 ${isQrHidden ? 'text-slate-400' : 'text-blue-600'}`} />
                    {isQrHidden ? 'ซ่อนรหัส QR แล้ว' : 'แชร์ให้ลูกค้าสแกน'}
                  </DialogTitle>
                  <DialogDescription className={isQrHidden ? 'text-slate-400' : 'text-blue-600/70'}>
                    ให้ลูกค้าสแกนเพื่อเข้าฟอร์มแจ้งซ่อมออนไลน์
                  </DialogDescription>
                </div>
                
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className={`h-8 w-8 rounded-full -mt-1 ${isQrHidden ? 'text-slate-500 hover:text-slate-800 hover:bg-slate-200' : 'text-slate-400 hover:text-blue-600 hover:bg-white/60'}`} 
                        onClick={() => setIsQrHidden(!isQrHidden)}
                      >
                        {isQrHidden ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{isQrHidden ? "แสดง QR Code" : "ซ่อน QR Code"}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </DialogHeader>

            <div className="p-6 pt-4 bg-white space-y-6">
              <div className="flex justify-center">
                {isQrHidden ? (
                  <div className="flex flex-col items-center justify-center space-y-3 h-[200px] w-full bg-slate-50 rounded-xl border-2 border-dashed border-slate-200 animate-in fade-in duration-300">
                    <div className="h-14 w-14 rounded-full bg-slate-100 flex items-center justify-center border-4 border-white shadow-sm mb-1">
                      <QrCode className="h-6 w-6 text-slate-300 opacity-60" />
                    </div>
                    <p className="text-xs font-medium text-slate-400 bg-white px-3 py-1 rounded-full border shadow-sm">ภาพ QR Code ถูกซ่อนไว้</p>
                  </div>
                ) : (
                  <div className="bg-white p-4 rounded-2xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.1)] border border-slate-100 transition-transform hover:scale-105 duration-300 animate-in fade-in duration-300 zoom-in-95">
                    {shopUrl ? (
                      <QRCodeCanvas
                        id="header-qr-code"
                        value={shopUrl}
                        size={160}
                        bgColor={"#ffffff"}
                        fgColor={"#0f172a"}
                        level={"H"}
                        includeMargin={false}
                      />
                    ) : (
                      <div className="w-[160px] h-[160px] bg-slate-50 animate-pulse rounded-xl flex items-center justify-center">
                        <Loader2 className="h-8 w-8 text-slate-300 animate-spin" />
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs text-slate-500 font-bold uppercase tracking-wider">
                    ลิงก์ร้านค้าของคุณ (URL)
                  </Label>
                  <div className="flex gap-2">
                    <Input 
                      readOnly 
                      value={shopUrl} 
                      className="bg-slate-50 text-slate-600 border-slate-200 focus-visible:ring-0 cursor-copy h-10" 
                      onClick={(e) => (e.target as HTMLInputElement).select()}
                    />
                    <Button variant="outline" size="icon" onClick={copyLink} className="h-10 w-10 shrink-0 text-slate-500 hover:text-blue-600 hover:bg-blue-50 border-slate-200">
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <Button variant="outline" className="w-full text-slate-700 border-slate-300 hover:bg-slate-50 h-11" onClick={copyLink}>
                    <LinkIcon className="h-4 w-4 mr-2 text-slate-500" /> คัดลอกลิงก์
                  </Button>
                  <Button 
                    className="w-full bg-blue-600 hover:bg-blue-700 shadow-sm h-11" 
                    onClick={downloadQR}
                    disabled={isQrHidden} 
                  >
                    <Download className="h-4 w-4 mr-2" /> โหลดรูปภาพ
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

    </header>
  )
}