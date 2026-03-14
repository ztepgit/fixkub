"use client"

import { useState } from "react"
import { CustomerBookingForm } from "@/components/customer-booking-form"
import { CustomerQueueStatus } from "@/components/customer-queue-status"

export default function CustomerQueuePage() {
    // State ชั่วคราว เอาไว้สลับดูหน้าจอ "ฟอร์มแจ้งซ่อม" กับ "สถานะคิว" 
    const [isInQueue, setIsInQueue] = useState(false)

    return (
        <div className="min-h-screen bg-slate-50 p-4 pt-8">
            {!isInQueue ? (
                <>
                    <CustomerBookingForm />
                    
                    {/* ปุ่มสำหรับเทสต์ UI (เดี๋ยวตอนต่อระบบจริงจะลบออกครับ) */}
                    <div className="text-center mt-8">
                        <button 
                            onClick={() => setIsInQueue(true)} 
                            className="text-sm font-medium text-emerald-600 hover:text-emerald-700 underline underline-offset-4"
                        >
                            🔧 (กดเทสต์) จำลองว่าลูกค้าส่งฟอร์มแล้ว ไปหน้าสถานะ
                        </button>
                    </div>
                </>
            ) : (
                <>
                    <CustomerQueueStatus />
                    
                    {/* ปุ่มสำหรับเทสต์ UI (เดี๋ยวตอนต่อระบบจริงจะลบออกครับ) */}
                    <div className="text-center mt-8">
                        <button 
                            onClick={() => setIsInQueue(false)} 
                            className="text-sm text-slate-500 hover:text-slate-700 underline underline-offset-4"
                        >
                            🔙 (กดเทสต์) ย้อนกลับไปหน้าฟอร์มแจ้งซ่อม
                        </button>
                    </div>
                </>
            )}
        </div>
    )
}