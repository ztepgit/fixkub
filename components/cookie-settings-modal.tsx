// app/components/cookie-settings-modal.tsx
"use client";

import { useState, useEffect } from "react";
import { useCookieStore, CookiePreferences } from "@/store/useCookieStore";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter
} from "@/components/ui/dialog";

export function CookieSettingsModal() {
    const { showSettings, closeSettings, preferences, savePreferences } = useCookieStore();

    const [localConsent, setLocalConsent] = useState<CookiePreferences>(preferences);

    useEffect(() => {
        if (showSettings) {
            setLocalConsent(preferences);
        }
    }, [showSettings, preferences]);

    const handleSave = () => {
        savePreferences(localConsent);
    };

    return (
        <Dialog open={showSettings} onOpenChange={(open) => !open && closeSettings()}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle className="text-xl">ตั้งค่าคุกกี้</DialogTitle>
                    <DialogDescription className="text-sm pt-2">
                        เลือกประเภทของคุกกี้ที่คุณอนุญาตให้เราใช้งาน "ปฏิเสธทั้งหมด" จะคงไว้เฉพาะคุกกี้ที่จำเป็นต่อระบบเท่านั้น
                    </DialogDescription>
                </DialogHeader>

                <div className="flex flex-col gap-6 py-4">
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex-1">
                            <h4 className="font-semibold text-sm">คุกกี้ที่จำเป็น (Essential)</h4>
                            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                                คุกกี้พื้นฐานที่ขาดไม่ได้ เพื่อให้ระบบ Login และระบบความปลอดภัย (Security/CSRF) ทำงานได้ปกติ
                            </p>
                        </div>
                        <Switch checked={true} disabled className="data-[state=checked]:bg-foreground/50" />
                    </div>

                    <div className="flex items-center justify-between gap-4">
                        <div className="flex-1">
                            <h4 className="font-semibold text-sm">คุกกี้เพื่อการทำงาน (Functional)</h4>
                            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                                ช่วยให้เราจดจำการตั้งค่าหน้าบอร์ดคิวซ่อม และรูปแบบการแสดงผลหน้าจอของคุณ เพื่อความสะดวกในการใช้งานครั้งถัดไป
                            </p>
                        </div>
                        <Switch
                            checked={localConsent.functional}
                            onCheckedChange={(c) => setLocalConsent(prev => ({ ...prev, functional: c }))}
                            className="data-[state=checked]:bg-foreground"
                        />
                    </div>

                    <div className="flex items-center justify-between gap-4">
                        <div className="flex-1">
                            <h4 className="font-semibold text-sm">คุกกี้เพื่อการวิเคราะห์ (Analytics)</h4>
                            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                                ช่วยให้เราเข้าใจการใช้งานเว็บไซต์ เช่น สถิติการเช็คสถานะคิวของลูกค้า เพื่อนำไปพัฒนา Fixkub ให้ดียิ่งขึ้น
                            </p>
                        </div>
                        <Switch
                            checked={localConsent.analytics}
                            onCheckedChange={(c) => setLocalConsent(prev => ({ ...prev, analytics: c }))}
                            className="data-[state=checked]:bg-foreground"
                        />
                    </div>
                </div>

                <DialogFooter className="gap-2 sm:gap-0 mt-2">
                    <Button variant="ghost" onClick={closeSettings}>
                        ยกเลิก
                    </Button>
                    <Button
                        onClick={handleSave}
                        className="bg-black text-white hover:bg-blue-600"
                    >
                        บันทึกการตั้งค่า
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}