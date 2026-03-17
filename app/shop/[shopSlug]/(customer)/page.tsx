"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CustomerBookingForm } from "@/components/customer-booking-form"
import { CustomerQueueStatus } from "@/components/customer-queue-status"
import { Smartphone, Search } from "lucide-react"

export default function CustomerPortalPage() {
    return (
        <div className="min-h-screen bg-slate-50 py-8 px-4">
            <div className="mx-auto w-full max-w-md space-y-6">

                {/* หัวเว็บร้าน (จำลอง) */}
                <div className="text-center space-y-2">
                    <h1 className="text-2xl font-bold text-slate-800">ยินดีต้อนรับสู่ร้านซ่อม</h1>
                    <p className="text-sm text-slate-500">บริการซ่อมมือถือครบวงจร รวดเร็ว ทันใจ</p>
                </div>

                {/* ระบบ Tabs สลับหน้าจอ */}
                <Tabs defaultValue="book" className="w-full">
                    <TabsList className="grid w-full grid-cols-2 mb-6 h-12 bg-white border shadow-sm rounded-xl">
                        <TabsTrigger value="book" className="rounded-lg data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-700 font-medium">
                            <Smartphone className="h-4 w-4 mr-2" />
                            แจ้งซ่อมเครื่อง
                        </TabsTrigger>
                        <TabsTrigger value="status" className="rounded-lg data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 font-medium">
                            <Search className="h-4 w-4 mr-2" />
                            เช็คสถานะ
                        </TabsTrigger>
                    </TabsList>

                    {/* เนื้อหาแท็บแจ้งซ่อม */}
                    <TabsContent value="book" className="mt-0 outline-none animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <CustomerBookingForm />
                    </TabsContent>

                    {/* เนื้อหาแท็บเช็คสถานะ */}
                    <TabsContent value="status" className="mt-0 outline-none animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <CustomerQueueStatus />
                    </TabsContent>
                </Tabs>

            </div>
        </div>
    )
}