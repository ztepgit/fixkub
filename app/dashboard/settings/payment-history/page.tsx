"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { format } from "date-fns"
import { th } from "date-fns/locale"
import { Download, Loader2, AlertCircle, RefreshCw } from "lucide-react"
import type { PaymentTransaction, Receipt } from "@prisma/client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { getShopPaymentHistory, downloadReceiptPDF } from "@/actions/receipt"
import { useShopStore } from "@/store/useShopStore"
import { useToast } from "@/hooks/use-toast"

// 🌟 สร้าง Type ที่ตรงกับผลลัพธ์ของ Prisma include: { receipt: true }
type PaymentHistoryItem = PaymentTransaction & {
  receipt: Receipt | null;
}

export default function PaymentHistoryPage() {
  const shopId = useShopStore((state) => state.shop?.id)
  const { toast } = useToast()
  const [downloadingId, setDownloadingId] = useState<string | null>(null)

  // 🌟 TanStack Query Setup สำหรับดึงข้อมูล (Fetch Only)
  const { 
    data, 
    isLoading, 
    isError, 
    error, 
    refetch,
    isRefetching
  } = useQuery<PaymentHistoryItem[], Error>({
    queryKey: ["payment-history", shopId],
    queryFn: async () => {
      if (!shopId) throw new Error("ไม่พบข้อมูลร้านค้า");
      
      const res = await getShopPaymentHistory(shopId);
      if (!res.success || !res.data) {
        throw new Error(res.error || "เกิดข้อผิดพลาดในการดึงข้อมูล");
      }
      
      return res.data as unknown as PaymentHistoryItem[]; // ✅ Cast type ให้เข้ากับสิ่งที่เรานิยามไว้
    },
    enabled: !!shopId,            // ทำงานเมื่อมี shopId เท่านั้น
    staleTime: 5 * 60 * 1000,     // 5 นาที ข้อมูลถือว่าสดใหม่ ไม่ต้องยิง API ซ้ำถ้าเปลี่ยนหน้าไปมา
    gcTime: 15 * 60 * 1000,       // 15 นาที เก็บ Cache ไว้ใน Memory
    refetchOnWindowFocus: false,  // ไม่ต้องยิงใหม่ทุกครั้งที่สลับหน้าต่างเบราว์เซอร์
  });

  // 🌟 ฟังก์ชันดาวน์โหลด PDF (Mutation/Action ธรรมดา ไม่ใช้ TanStack Query)
  const handleDownload = async (receiptNo: string) => {
    if (!shopId) return;
    
    setDownloadingId(receiptNo);
    try {
      const res = await downloadReceiptPDF(shopId, receiptNo);
      if (res.success && res.url) {
        window.open(res.url, '_blank');
      } else {
        toast({ 
          title: "❌ ผิดพลาด", 
          description: res.error || "ไม่สามารถดาวน์โหลดได้", 
          variant: "destructive" 
        });
      }
    } catch (err) {
      toast({ 
        title: "❌ ผิดพลาด", 
        description: "ระบบขัดข้อง กรุณาลองใหม่อีกครั้ง", 
        variant: "destructive" 
      });
    } finally {
      setDownloadingId(null);
    }
  };

  // --- UI: Loading State ---
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 text-slate-500">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
        <p>กำลังโหลดประวัติการชำระเงิน...</p>
      </div>
    );
  }

  // --- UI: Error State ---
  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4 p-8 text-center bg-rose-50 rounded-xl border border-rose-100">
        <AlertCircle className="w-10 h-10 text-rose-500" />
        <div>
          <h3 className="text-lg font-bold text-rose-700">ไม่สามารถดึงข้อมูลได้</h3>
          <p className="text-rose-600/80 text-sm mt-1">{error.message}</p>
        </div>
        <Button variant="outline" onClick={() => refetch()} className="mt-2 border-rose-200 text-rose-600 hover:bg-rose-100">
          <RefreshCw className={`w-4 h-4 mr-2 ${isRefetching ? 'animate-spin' : ''}`} />
          ลองใหม่อีกครั้ง
        </Button>
      </div>
    );
  }

  // --- UI: Success State ---
  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">ประวัติการชำระเงิน</h2>
          <p className="text-slate-500 text-sm mt-1">ดูย้อนหลังและดาวน์โหลดใบเสร็จรับเงิน</p>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => refetch()} 
          disabled={isRefetching}
          className="text-slate-600"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${isRefetching ? 'animate-spin' : ''}`} />
          รีเฟรชข้อมูล
        </Button>
      </div>

      <Card className="border-slate-200 shadow-sm overflow-hidden">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50/80">
              <TableRow>
                <TableHead className="w-[180px]">วันที่ชำระเงิน</TableHead>
                <TableHead>เลขที่ใบเสร็จ</TableHead>
                <TableHead>แพ็กเกจ</TableHead>
                <TableHead className="text-right">จำนวนเงิน (บาท)</TableHead>
                <TableHead className="text-center">สถานะ</TableHead>
                <TableHead className="text-right">เอกสาร</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!data || data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-slate-500">
                    ยังไม่มีประวัติการชำระเงิน
                  </TableCell>
                </TableRow>
              ) : (
                data.map((row) => (
                  <TableRow key={row.id} className="hover:bg-slate-50/50">
                    <TableCell className="text-sm">
                      {format(new Date(row.approvedAt || row.createdAt), "dd MMM yyyy HH:mm", { locale: th })}
                    </TableCell>
                    <TableCell>
                      {row.receipt?.receiptNo ? (
                        <span className="font-mono text-xs font-medium text-slate-700 bg-slate-100 px-2 py-1 rounded">
                          {row.receipt.receiptNo}
                        </span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {row.plan.replace('_', ' ')}
                    </TableCell>
                    <TableCell className="text-right font-bold text-slate-700">
                      {row.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge 
                        variant="secondary"
                        className={
                          row.status === "APPROVED" 
                            ? "bg-emerald-100/80 text-emerald-700 hover:bg-emerald-100" 
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }
                      >
                        {row.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {row.receipt ? (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleDownload(row.receipt!.receiptNo)}
                          disabled={downloadingId === row.receipt.receiptNo}
                          className="text-blue-600 border-blue-200 hover:bg-blue-50 shadow-sm"
                        >
                          {downloadingId === row.receipt.receiptNo ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" /> 
                          ) : (
                            <Download className="w-4 h-4 mr-2" />
                          )}
                          ดาวน์โหลด
                        </Button>
                      ) : (
                        <span className="text-xs text-slate-400 mr-4">ไม่มีเอกสาร</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}