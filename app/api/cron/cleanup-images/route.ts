// app/api/cron/cleanup-images/route.ts
import { db } from "@/lib/prisma"
import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

// QUEUE IMAGE SYSTEM: Cron ล้างรูปลด Cost (Soft delete Analytics-safe)
export async function GET(req: Request) {
  try {
    const supabase = await createClient();

    // 1. หาคิวที่โดน Soft Delete ไปแล้ว (isDeleted = true) แต่ยังมีรูปค้างอยู่
    const queuesToCleanup = await db.queue.findMany({
      where: {
        isDeleted: true,
        // Prisma เช็ค array.length > 0 (ใช้วิธีเช็คว่าไม่เท่ากับ empty array)
        NOT: { images: { equals: [] } } 
      },
      select: { id: true, images: true }
    });

    if (queuesToCleanup.length === 0) {
      return NextResponse.json({ message: "No images to cleanup" });
    }

    let deletedCount = 0;

    for (const queue of queuesToCleanup) {
      // 2. ลบรูปจริงออกจาก Storage
      const paths = queue.images.map(url => url.split('/queue-images/')[1]).filter(Boolean);
      if (paths.length > 0) {
        await supabase.storage.from('queue-images').remove(paths);
      }

      // 3. อัปเดต Database เคลียร์ Array แต่ไม่ลบ Row (Analytics-safe)
      await db.queue.update({
        where: { id: queue.id },
        data: { images: [] }
      });
      deletedCount += paths.length;
    }

    return NextResponse.json({ success: true, message: `Cleaned up ${deletedCount} images from storage.` });

  } catch (error: any) {
    console.error("Cron Cleanup Images Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}