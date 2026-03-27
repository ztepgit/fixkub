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

// 🌟 ต้องเปลี่ยนเป็น async function เพื่อให้รองรับ await supabase.auth.getUser()
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
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "localhost:3000";
  const subdomain = hostname.replace(`.${rootDomain}`, "");

  // เพิ่ม "www" เข้าไปในคำสงวนเพื่อความปลอดภัย
  const reservedSubdomains = ["admin", "app", "api", "dashboard", "super-admin", "support", "www"];

  if (!isVercel && subdomain && subdomain !== hostname && subdomain !== rootDomain) {
    if (subdomain === "www") {
      // SEO Best Practice: Redirect www กลับไปหาโดเมนหลักเปล่าๆ
      response = NextResponse.redirect(new URL(`https://${rootDomain}${url.pathname}`, request.url));
    } else if (!reservedSubdomains.includes(subdomain)) {
      // 🪄 ปลายทาง: Rewrite เข้าไปในโฟลเดอร์ app/shop/[shopSlug]/page.tsx
      response = NextResponse.rewrite(new URL(`/shop/${subdomain}${url.pathname}`, request.url));
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
  // ระบุ Path ที่บังคับว่า "ต้องล็อกอิน" ถึงจะเข้าได้
  const isProtectedRoute = url.pathname.startsWith('/dashboard') || url.pathname.startsWith('/super-admin');

  if (!user && isProtectedRoute) {
    // ถ้ายังไม่ได้ Login ให้เตะกลับไปหน้า /login
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (user && url.pathname.startsWith('/login')) {
    // ถ้า Login แล้ว แต่เผลอกดมาหน้า /login ให้เตะเข้า /dashboard ทันที
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // คืนค่า Response สุดท้าย (ที่มีการตั้งค่าทั้ง Subdomain Rewrite และ Auth Cookie ครบถ้วนแล้ว)
  return response;
}