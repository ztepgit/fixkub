//components/footer.tsx
"use client";

import Link from "next/link";
import { useCookieStore } from "../store/useCookieStore";
import { Wrench } from "lucide-react";

export function Footer() {
  const openSettings = useCookieStore((state) => state.openSettings);

  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-white/5 bg-slate-900">
      <div className="container mx-auto flex flex-col items-center px-4 py-10 text-center md:px-6">

        {/* Logo */}
        <div className="mb-4 flex items-center gap-2">
          <Wrench className="h-5 w-5 text-emerald-500" />

          <span className="text-xl font-semibold tracking-tight text-white">
            getfixx <span className="text-emerald-500">Repair</span>
          </span>
        </div>

      {/* ค่าเริ่มต้น flex-col (มือถือเป็นแนวตั้ง) และ md:flex-row (จอคอม/แท็บเล็ตเป็นแนวนอน) */}
        <div className="mb-5 flex flex-col md:flex-row items-center gap-3 text-sm text-slate-400">
          <button
            type="button"
            onClick={openSettings}
            className="transition-colors hover:text-white hover:underline underline-offset-4"
          >
            ตั้งค่าคุกกี้
          </button>
          <span className="hidden md:block h-1 w-1 rounded-full bg-slate-600" />
          <Link
            href="/privacy-policy"
            className="transition-colors hover:text-white hover:underline underline-offset-4"
          >
            นโยบายความเป็นส่วนตัว
          </Link>
          <span className="hidden md:block h-1 w-1 rounded-full bg-slate-600" />
          <Link
            href="/refund-policy"
            className="transition-colors hover:text-white hover:underline underline-offset-4"
          >
            นโยบายการคืนเงิน
          </Link>
          <span className="hidden md:block h-1 w-1 rounded-full bg-slate-600" />
          <Link
            href="/terms-of-service"
            className="transition-colors hover:text-white hover:underline underline-offset-4"
          >
            เงื่อนไขการใช้บริการ
          </Link>
          <span className="hidden md:block h-1 w-1 rounded-full bg-slate-600" />
          <Link
            href="/contact-us"
            className="transition-colors hover:text-white hover:underline underline-offset-4"
          >
            ติดต่อเรา
          </Link>
        </div>

        {/* Copyright */}
        <p className="text-xs leading-relaxed text-slate-500">
          © {currentYear} getfixx Systems. All rights reserved.
        </p>
      </div>
    </footer>
  );
}