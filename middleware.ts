// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export const config = {
  matcher: [
    /*
     * ดักจับทุก URL ยกเว้นพวกไฟล์ระบบ รูปภาพ หรือ API
     */
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};

export default function middleware(req: NextRequest) {
  const url = req.nextUrl;

  // อ่านค่า Host เช่น esyq.com, barber.esyq.com หรือ localhost:3000
  const hostname = req.headers.get("host") || "";

  // กำหนด Root Domain (ตอนรันในเครื่องจะเป็น localhost:3000)
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "localhost:3000";

  // ตัด string เพื่อหาว่ามี Subdomain ไหม
  const subdomain = hostname.replace(`.${rootDomain}`, "");

  // ถ้า URL เป็น Subdomain (เช่น barber) ให้ Rewrite เข้าไปในโฟลเดอร์ app/[shopSlug]
  if (subdomain && subdomain !== hostname && subdomain !== rootDomain) {
    return NextResponse.rewrite(
      new URL(`/shop/${subdomain}${url.pathname}`, req.url)
    );
  }

  // ถ้าเป็นโดเมนหลัก (esyq.com) ก็ปล่อยผ่านให้ทำงานปกติ (เข้าโฟลเดอร์ (main))
  return NextResponse.next();
}