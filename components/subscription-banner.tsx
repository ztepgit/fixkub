"use client"

import { useState, useEffect } from "react" 
import Link from "next/link" 
import { AlertTriangle, Clock, AlertCircle, X } from "lucide-react" 
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"

export function SubscriptionBanner({ trialEndsAt }: { trialEndsAt: Date | string }) {
  const [isVisible, setIsVisible] = useState(true);
  const [isMounted, setIsMounted] = useState(false); 

  // คำนวณวันคงเหลือ
  const today = new Date();
  const endDate = new Date(trialEndsAt);
  const diffTime = endDate.getTime() - today.getTime();
  const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 

  // 1. กำหนดระดับการแจ้งเตือน (Threshold)
  let currentThreshold = 0;
  if (daysRemaining === 1) {
    currentThreshold = 1;
  } else if (daysRemaining <= 3 && daysRemaining > 1) {
    currentThreshold = 3;
  } else if (daysRemaining <= 7 && daysRemaining > 3) {
    currentThreshold = 7;
  }

  // 2. ดึงความจำจาก Local Storage เมื่อโหลดหน้าเว็บเสร็จ
  useEffect(() => {
    setIsMounted(true);
    
    const savedThreshold = localStorage.getItem("esyq_dismissed_threshold");
    if (savedThreshold && parseInt(savedThreshold) === currentThreshold) {
      setIsVisible(false);
    }
  }, [currentThreshold]);

  // 3. ฟังก์ชันตอนผู้ใช้กดปุ่ม X (กากบาท)
  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem("esyq_dismissed_threshold", currentThreshold.toString());
  };

  if (!isMounted) return null;

  // ถ้าเหลือมากกว่า 7 วัน หรือถูกปิดไปแล้ว ให้ซ่อน
  if (daysRemaining > 7 || !isVisible) return null;

  const PricingBlock = () => (
    <div className="flex flex-col space-y-1 my-3 bg-white/60 p-3 rounded-md border border-black/5 w-fit">
      <span className="text-sm font-medium text-slate-700">199 / เดือน</span>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-bold text-emerald-700">⭐ 1,690 / ปี</span>
        <span className="text-xs bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-semibold">
          ประหยัด 698 บาท
        </span>
      </div>
    </div>
  );

  // 🚨 ถ้าหมดอายุแล้ว = โชว์แบนเนอร์สีแดง (ถึงจะโดน Redirect ก็เผื่อเหนียวไว้ก่อน)
  if (daysRemaining <= 0) {
    return (
      <Alert variant="destructive" className="mb-6 border-red-500 bg-red-50">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle className="font-bold">วันใช้งานหมดแล้ว!</AlertTitle>
        <AlertDescription className="mt-2">
          <p>กรุณาต่ออายุแพ็กเกจ เพื่อใช้งานต่อ</p>
          <PricingBlock />
          <Link href="/payment?plan=yearly">
            <Button variant="destructive" size="sm" className="mt-1">
              ต่ออายุทันที
            </Button>
          </Link>
        </AlertDescription>
      </Alert>
    );
  }

  // --- จัดการสไตล์และไอคอนตาม Threshold ---
  let bannerStyle = "border-yellow-400 bg-yellow-50 text-yellow-800"; 
  let icon = <Clock className="h-4 w-4 text-yellow-600" />;

  if (currentThreshold === 3) {
    bannerStyle = "border-orange-400 bg-orange-50 text-orange-800"; 
    icon = <AlertTriangle className="h-4 w-4 text-orange-600" />;
  } else if (currentThreshold === 1) {
    bannerStyle = "border-red-400 bg-red-50 text-red-800"; 
    icon = <AlertCircle className="h-4 w-4 text-red-600" />;
  }

  return (
    <Alert className={`mb-6 relative ${currentThreshold !== 1 ? 'pr-10' : ''} ${bannerStyle}`}>
      {icon}
      
      {/* 🌟 แสดงปุ่มปิด เฉพาะตอนที่ยังไม่ถึงวันสุดท้าย (Threshold ไม่ใช่ 1) */}
      {currentThreshold !== 1 && (
        <button 
          onClick={handleDismiss}
          className="absolute top-3 right-3 p-1.5 rounded-md opacity-60 hover:opacity-100 hover:bg-black/5 transition-all"
          aria-label="ปิดการแจ้งเตือน"
        >
          <X className="h-4 w-4" />
        </button>
      )}

      <AlertTitle className="font-bold">
        {daysRemaining === 1 ? "เตือนครั้งสุดท้าย!" : "แจ้งเตือนวันหมดอายุ"}
      </AlertTitle>
      <AlertDescription className="mt-2">
        <p>ระบบของคุณจะหมดอายุในอีก <strong>{daysRemaining} วัน</strong></p>
        
        <PricingBlock />

        <Link href="/#pricing">
          <Button className="bg-emerald-600 hover:bg-emerald-700 text-white mt-1" size="sm">
            ต่ออายุทันที
          </Button>
        </Link>
      </AlertDescription>
    </Alert>
  );
}