// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export const config = {
  matcher: [
    /*
     * ดักจับทุก URL ยกเว้นไฟล์ระบบ รูปภาพ หรือ API
     */
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};

export default function middleware(req: NextRequest) {
  const url = req.nextUrl;

  // อ่านค่า Host เช่น esyq.net, a-mobile.esyq.net หรือ localhost:3000
  const hostname = req.headers.get("host") || "";

  // 🌟 1. ดักเคส Vercel Preview URL (ถ้าโฮสต์บน Vercel ให้ระบบหลังบ้านทำงานตามปกติ)
  if (hostname.includes("vercel.app")) {
    return NextResponse.next();
  }

  // กำหนด Root Domain (ต้องเปลี่ยนเป็น esyq.net ตอนขึ้น Production)
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "localhost:3000";

  // ตัด string เพื่อหาว่ามี Subdomain ไหม
  const subdomain = hostname.replace(`.${rootDomain}`, "");

  // 🌟 2. รายการ Subdomain คำสงวน ที่เราจะไม่มองว่าเป็นร้านค้า
  const reservedSubdomains = ["admin", "app", "api", "dashboard", "super-admin", "support"];

  // ถ้า URL เป็น Subdomain จริงๆ (เช่น a-mobile)
  if (subdomain && subdomain !== hostname && subdomain !== rootDomain) {
    
    // 🌟 3. ถ้าคนพิมพ์ www.esyq.net ให้ Redirect กลับไปที่โดเมนหลัก esyq.net เปล่าๆ ทันที (SEO Best Practice)
    if (subdomain === "www") {
      return NextResponse.redirect(new URL(`https://${rootDomain}${url.pathname}`, req.url));
    }

    // 🌟 4. ถ้าเป็นคำสงวนที่ตั้งไว้ ให้ระบบปล่อยผ่านไปทำงานตามโฟลเดอร์ปกติ (เผื่ออนาคตทำเว็บแยก)
    if (reservedSubdomains.includes(subdomain)) {
      return NextResponse.next();
    }

    // 🪄 ปลายทาง: Rewrite เข้าไปในโฟลเดอร์ app/shop/[shopSlug]/page.tsx
    return NextResponse.rewrite(
      new URL(`/shop/${subdomain}${url.pathname}`, req.url)
    );
  }

  // ถ้าเป็นโดเมนหลัก (esyq.net) ก็ปล่อยผ่านให้ทำงานตามปกติ (เข้าหน้า Landing Page)
  return NextResponse.next();
}