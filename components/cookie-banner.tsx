//app/components/cookie-banner.tsx
"use client";

import { useEffect } from "react";
import { useCookieStore } from "../store/useCookieStore";
import { Button } from "@/components/ui/button";
import { CookieSettingsModal } from "@/components/cookie-settings-modal";
import Link from "next/link";

export function CookieBanner() {
  const {
    hasMounted,
    showBanner,
    openSettings,
    acceptAll,
    rejectAll,
    initializeFromStorage
  } = useCookieStore();

  useEffect(() => {
    initializeFromStorage();
  }, [initializeFromStorage]);

  if (!hasMounted) return null;

  return (
    <>
      {showBanner && (
        <div className="fixed bottom-0 left-0 right-0 z-[100] bg-background/95 backdrop-blur-md border-t border-border shadow-[0_-10px_40px_rgba(0,0,0,0.1)] animate-in slide-in-from-bottom-5">
          <div className="mx-auto max-w-6xl px-4 py-4 md:py-6 flex flex-col md:flex-row items-center justify-between gap-4 md:gap-8">

            <div className="flex-1 text-center md:text-left">
              <p className="text-sm text-foreground/90 font-medium">
                เราใช้คุกกี้เพื่อให้เว็บไซต์ทำงานได้ และปรับปรุงประสบการณ์ของคุณ
              </p>
              <div className="flex items-center justify-center md:justify-start gap-4 mt-1.5 text-xs text-muted-foreground">
                <button
                  onClick={openSettings}
                  // 🌟 แก้ไข: เปลี่ยน hover:text-primary เป็น hover:text-foreground เพื่อไม่ให้เป็นสีแดง
                  className="hover:text-foreground hover:underline transition-colors focus:outline-none"
                >
                  ตั้งค่าคุกกี้
                </button>
                <span className="opacity-50">|</span>
                {/* 🌟 แก้ไข: เปลี่ยน hover:text-primary เป็น hover:text-foreground เพื่อไม่ให้เป็นสีแดง */}
                <Link href="/privacy-policy" className="hover:text-foreground hover:underline transition-colors">
                  นโยบายความเป็นส่วนตัว
                </Link>
              </div>
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto shrink-0">
              <Button
                variant="outline"
                onClick={rejectAll}
                className="flex-1 md:flex-none border-border/50 text-foreground hover:bg-secondary/80"
              >
                ปฏิเสธทั้งหมด
              </Button>
              <Button
                onClick={acceptAll}
                className="flex-1 md:flex-none bg-black text-white hover:bg-blue-600 font-semibold shadow-sm"
              >
                ยอมรับทั้งหมด
              </Button>
            </div>

          </div>
        </div>
      )}

      <CookieSettingsModal />
    </>
  );
}
