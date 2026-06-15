//components/receipt-history-card.tsx
"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { format } from "date-fns"
import { th } from "date-fns/locale"
import { CalendarIcon, Search as SearchIcon, FileText, Download, Loader2 } from "lucide-react"
import type { PaymentTransaction, Receipt } from "@prisma/client"

import { ScrollArea } from "@/components/ui/scroll-area"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import { downloadReceiptPDF, getLatestReceiptHistory, searchReceiptHistory } from "@/actions/receipt"

// 🌟 Strict TypeScript Type สำหรับ Receipt
type ReceiptHistoryItem = PaymentTransaction & {
  receipt: Receipt | null;
}

// 🌟 Component สำหรับแสดงประวัติใบเสร็จขนาดกะทัดรัด
export function ReceiptHistoryCard({ shopId }: { shopId?: string }) {
  console.log("ReceiptHistoryCard render")
  console.log("shopId =", shopId)
  const { toast } = useToast();
  const router = useRouter();

  const [searchNo, setSearchNo] = useState("");
  const [searchDate, setSearchDate] = useState<Date | undefined>(undefined);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  // 🌟 TanStack Query แบบ Query ต่อตรงไปที่ DB โดยไม่กรองบน Client
  const { data: displayData = [], isLoading } = useQuery<ReceiptHistoryItem[], Error>({
    queryKey: ["receipt-history-search", shopId, searchNo, searchDate],
    queryFn: async () => {
      if (!shopId) throw new Error("No Shop ID");

      let res;
      // ถ้ามีการค้นหา ให้ยิง Query ไปที่ฟังก์ชันค้นหา, ถ้าไม่มีดึงเฉพาะตัวล่าสุด 10 อัน
      if (searchNo || searchDate) {
        res = await searchReceiptHistory({ shopId, receiptNo: searchNo, date: searchDate });
      } else {
        res = await getLatestReceiptHistory(shopId);
      }

      if (!res.success) throw new Error(res.error || "เกิดข้อผิดพลาดในการดึงข้อมูล");
      return res.data as unknown as ReceiptHistoryItem[];
    },
    enabled: !!shopId,
    staleTime: 5 * 60 * 1000,
  });
  console.log("displayData =", displayData)
  console.log("displayData length =", displayData.length)

  const handleDownload = async (receiptNo: string) => {
    if (!shopId) return;
    setDownloadingId(receiptNo);
    try {
      const res = await downloadReceiptPDF(shopId, receiptNo);
      if (res.success && res.url) {
        const link = document.createElement("a");
        link.href = res.url;
        link.download = `${receiptNo}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        toast({ title: "❌ ผิดพลาด", description: res.error, variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "❌ ผิดพลาด", description: "โหลดไฟล์ไม่สำเร็จ", variant: "destructive" });
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <Card className="border-slate-200 dark:border-slate-800 shadow-sm dark:bg-slate-900 mt-6">
      <CardHeader className="bg-slate-50/50 dark:bg-slate-900/50 border-b dark:border-slate-800 pb-4 flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-lg flex items-center gap-2 text-slate-800 dark:text-slate-100">
            <FileText className="h-5 w-5 text-emerald-600 dark:text-emerald-500" />
            ประวัติใบเสร็จ
          </CardTitle>
          <CardDescription className="dark:text-slate-400 mt-1">
            ค้นหาและดาวน์โหลดใบเสร็จย้อนหลัง
          </CardDescription>
        </div>
        {/* 🌟 ปุ่มดูประวัติเต็ม (นำไปสู่หน้าแยก) Temporaly Hidden
        <Button 
          variant="link" 
          className="text-sm text-emerald-600 dark:text-emerald-500 p-0 h-auto" 
          onClick={() => router.push('/dashboard/settings/payment-history')}
        >
          ดูประวัติทั้งหมด
        </Button>
        */}
      </CardHeader>

      <CardContent className="pt-6 space-y-4">
        {/* 🌟 Search Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <div className="relative">
              <SearchIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500 dark:text-slate-400" />
              <Input
                placeholder="ค้นหาเลขที่ใบเสร็จ..."
                value={searchNo}
                onChange={(e) => setSearchNo(e.target.value)}
                className="pl-9 dark:bg-slate-950 dark:border-slate-700 dark:text-slate-200 focus-visible:ring-emerald-500"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "w-full justify-start text-left font-normal dark:bg-slate-950 dark:border-slate-700 dark:text-slate-200 hover:text-emerald-600 hover:border-emerald-500",
                    !searchDate && "text-slate-500 dark:text-slate-400"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {searchDate ? format(searchDate, "dd MMM yyyy", { locale: th }) : "เลือกวันที่"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={searchDate}
                  onSelect={setSearchDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* 🌟 Scrollable List */}
        <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
          <ScrollArea className="h-[280px]">
            {isLoading ? (
              <div className="p-4 space-y-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="space-y-2">
                      <div className="h-4 w-32 bg-slate-100 dark:bg-slate-800 rounded animate-pulse"></div>
                      <div className="h-3 w-24 bg-slate-50 dark:bg-slate-800/50 rounded animate-pulse"></div>
                    </div>
                    <div className="h-8 w-24 bg-slate-100 dark:bg-slate-800 rounded animate-pulse"></div>
                  </div>
                ))}
              </div>
            ) : displayData.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-slate-500 dark:text-slate-400">
                <FileText className="h-8 w-8 text-slate-300 dark:text-slate-600 mb-2" />
                <p className="text-sm">ไม่พบใบเสร็จที่ตรงกับการค้นหา</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {displayData.map((item) => (
                  <div key={item.id} className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                    <div>
                      <p className="font-mono text-sm font-semibold text-slate-800 dark:text-slate-200">
                        {item.receipt?.receiptNo || "-"}
                      </p>
                      <div className="flex items-center gap-3 mt-1">
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {format(new Date(item.approvedAt || item.createdAt), "dd MMM yyyy HH:mm", { locale: th })}
                        </p>
                        <Badge variant="secondary" className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-medium">
                          ฿{item.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </Badge>
                      </div>
                    </div>
                    {item.receipt?.receiptNo && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownload(item.receipt!.receiptNo)}
                        disabled={downloadingId === item.receipt!.receiptNo}
                        className="text-blue-600 border-blue-200 hover:bg-blue-50 dark:text-blue-400 dark:border-blue-900 dark:hover:bg-blue-950/30"
                      >
                        {downloadingId === item.receipt!.receiptNo ? (
                          <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
                        ) : (
                          <Download className="h-3 w-3 mr-1.5" />
                        )}
                        ดาวน์โหลด
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      </CardContent>
    </Card>
  );
}