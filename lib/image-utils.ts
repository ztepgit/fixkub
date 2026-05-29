// lib/image-utils.ts
// QUEUE IMAGE SYSTEM: Client-side Image Compression (No heavy dependencies)

export async function compressImageToWebP(file: File, maxWidth = 1600, quality = 0.85): Promise<File> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error("Canvas to Blob failed"));
              return;
            }
            const newFile = new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".webp", {
              type: "image/webp",
            });
            resolve(newFile);
          },
          "image/webp",
          quality
        );
      };
    };
    reader.onerror = (error) => reject(error);
  });
}

// 🌟 Helper ดึงวันที่และเวลาอัปโหลดจาก URL
export function extractUploadDateFromUrl(url: string): string {
  try {
    // ดึงตัวเลข Timestamp 13 หลักจากชื่อไฟล์ เช่น 1716976620000-abcd.webp
    const match = url.match(/(\d{13})-[a-z0-9]+\.webp/i);
    if (match && match[1]) {
      return new Date(parseInt(match[1])).toLocaleString('th-TH', {
        day: 'numeric', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
      }) + ' น.';
    }
  } catch (e) {}
  return 'ไม่ระบุเวลา';
}