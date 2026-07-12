// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export const config = {
  matcher: [
    /*
     * ดักจับทุก URL ยกเว้นไฟล์ระบบ รูปภาพ หรือ API
     */
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};

export default async function middleware(request: NextRequest) {
  const url = request.nextUrl;
  const hostname = request.headers.get("host") || "";

  // 🛡️ 1. สร้าง Response เริ่มต้นเตรียมไว้ เพื่อให้เรานำไปแนบ Cookie ต่อได้
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  // ==========================================
  // 🌐 ส่วนที่ 1: ระบบจัดการ Subdomain (Routing)
  // ==========================================
  const isVercel = hostname.includes("vercel.app");
  
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN!;
  let subdomain = "";

  // เช็คว่าเป็นโดเมนหลักหรือไม่
  const isRootDomain =
    hostname === rootDomain ||
    hostname === `www.${rootDomain}`;

  // ถ้าไม่ใช่โดเมนหลัก และลงท้ายด้วย .fixkub.net (หรือโดเมนที่ตั้งไว้)
  if (!isRootDomain && hostname.endsWith(`.${rootDomain}`)) {
    subdomain = hostname.replace(`.${rootDomain}`, "");
  }

  // เพิ่ม "www" เข้าไปในคำสงวนเพื่อความปลอดภัย
  const reservedSubdomains = ["admin", "app", "api", "dashboard", "super-admin", "support", "www"];

  if (!isVercel && subdomain) {
    if (!reservedSubdomains.includes(subdomain)) {
      return NextResponse.rewrite(
        new URL(`/shop/${subdomain}${url.pathname}`, request.url)
      );
    }
  }

  // ==========================================
  // 🔒 ส่วนที่ 2: ระบบจัดการ Auth (Supabase SSR)
  // ==========================================
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // ดึง Cookie ล่าสุดมาตั้งค่าให้กับ Request และ Response
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));

          // 🌟 จุดสำคัญ: แนบ Cookie กลับไปที่ตัวแปร `response` ที่เราตั้งค่า Rewrite ไว้ด้านบน
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // ดึงข้อมูล User ปัจจุบัน เพื่อเช็คสถานะการเข้าสู่ระบบ
  const { data: { user } } = await supabase.auth.getUser();

  // ==========================================
  // 🛡️ ส่วนที่ 3: ระบบป้องกันหน้าเว็บ (Route Protection)
  // ==========================================

  // 🌟 เพิ่ม /paywall และ /checkout เข้าไปในหน้าสำคัญที่ต้อง Login ก่อน
  const isProtectedRoute =
    url.pathname.startsWith('/dashboard') ||
    url.pathname.startsWith('/super-admin') ||
    url.pathname.startsWith('/paywall') ||
    url.pathname.startsWith('/checkout');

  if (!user && isProtectedRoute) {
    // ถ้ายังไม่ได้ Login ให้เตะกลับไปหน้า /login
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // ในไฟล์ middleware.ts (ประมาณบรรทัดที่ 71)
  if (user && url.pathname.startsWith('/login')) {
    // 🌟 แก้ไข: เตะไปหน้า Landing Page ก่อน เพื่อให้หน้า Landing เป็นคนเช็คว่าควรไปไหนต่อ
    return NextResponse.redirect(new URL('/', request.url));
  }

  // คืนค่า Response สุดท้าย
  return response;
}