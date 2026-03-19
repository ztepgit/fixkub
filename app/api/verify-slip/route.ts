import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const slipFile = formData.get('files') as File;

    if (!slipFile) {
      return NextResponse.json({ success: false, message: 'ไม่พบไฟล์สลิป' }, { status: 400 });
    }

    // ดึงค่าจาก .env
    const branchId = process.env.SLIPOK_BRANCH_ID;
    const apiKey = process.env.SLIPOK_API_KEY;

    if (!branchId || !apiKey) {
      console.error("SlipOK credentials missing in .env");
      return NextResponse.json({ success: false, message: 'ระบบตรวจสลิปยังไม่พร้อมใช้งาน' }, { status: 500 });
    }

    // เตรียมข้อมูลส่งไปหา SlipOK
    const slipOkFormData = new FormData();
    slipOkFormData.append('files', slipFile);

    // ยิง API ไปที่ SlipOK
    const response = await fetch(`https://api.slipok.com/api/line/apikey/${branchId}`, {
      method: 'POST',
      headers: {
        'x-authorization': apiKey,
        // ไม่ต้องใส่ Content-Type เพราะ fetch จะจัดการ boundary ของ FormData ให้เอง
      },
      body: slipOkFormData,
    });

    const result = await response.json();

    // เช็คผลลัพธ์จาก SlipOK
    if (result.success) {
      // ตรวจสอบสำเร็จ ส่งข้อมูลกลับไปให้หน้าเว็บเช็คยอดเงิน
      return NextResponse.json({ 
        success: true, 
        data: {
          amount: result.data.amount, // ยอดโอน
          sender: result.data.sender.displayName, // ชื่อคนโอน
          receiver: result.data.receiver.displayName, // ชื่อคนรับ (ควรจะเป็นชื่อบริษัทเรา)
          transRef: result.data.transRef, // รหัสอ้างอิงของธนาคาร
        }
      });
    } else {
      // สลิปปลอม, สลิปซ้ำ, หรืออ่านคิวอาร์โค้ดไม่ออก
      return NextResponse.json({ 
        success: false, 
        message: result.message || 'สลิปไม่ถูกต้อง หรือเคยถูกใช้งานแล้ว' 
      }, { status: 400 });
    }

  } catch (error) {
    console.error("Error verifying slip:", error);
    return NextResponse.json({ success: false, message: 'เกิดข้อผิดพลาดในการตรวจสอบสลิป' }, { status: 500 });
  }
}