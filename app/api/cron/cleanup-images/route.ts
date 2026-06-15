// app/api/cron/cleanup-images/route.ts

import { db } from "@/lib/prisma";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// QUEUE IMAGE SYSTEM
// Cleanup storage images after queue soft delete

const supabase = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
    // 1. หา queue ที่ soft delete แล้ว แต่ยังมีรูปค้าง
    const queuesToCleanup = await db.queue.findMany({
      where: {
        isDeleted: true,
        NOT: {
          images: {
            equals: [],
          },
        },
      },
      select: {
        id: true,
        images: true,
      },
      take: 100, // กัน cron ยิงหนักเกินถ้ามีข้อมูลเยอะ
    });

    if (queuesToCleanup.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No images to cleanup",
      });
    }

    let deletedCount = 0;

    for (const queue of queuesToCleanup) {
      // 2. แปลง public URL -> storage path
      const paths = queue.images
        .map((url) => {
          try {
            return decodeURIComponent(
              url.split("/storage/v1/object/public/queue-images/")[1]
            );
          } catch {
            return null;
          }
        })
        .filter(Boolean) as string[];

      if (paths.length === 0) continue;

      // 3. ลบรูปจาก storage
      const { error } = await supabase.storage
        .from("queue-images")
        .remove(paths);

      // ❌ ถ้าลบ storage ไม่สำเร็จ ห้ามเคลียร์ DB
      if (error) {
        console.error(
          `[CRON_IMAGE_CLEANUP] Failed removing queue ${queue.id}`,
          error
        );
        continue;
      }

      // 4. เคลียร์ array ใน DB แต่เก็บ row ไว้ analytics
      await db.queue.update({
        where: {
          id: queue.id,
        },
        data: {
          images: [],
        },
      });

      deletedCount += paths.length;
    }

    return NextResponse.json({
      success: true,
      message: `Cleaned up ${deletedCount} images from storage.`,
    });

  } catch (error: any) {
    console.error("[CRON_IMAGE_CLEANUP]", error);

    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      {
        status: 500,
      }
    );
  }
}