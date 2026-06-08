// lib/receipt-generator.tsx
import React from 'react';
import path from 'path';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
  Svg,
  Path,
  pdf,
} from '@react-pdf/renderer';

// 🌟 Import bahttext
import { bahttext } from 'bahttext';

interface ReceiptData {
  receiptNo: string;
  issuedAt: Date;
  shopName: string;
  plan: string;
  amount: number;
  subscriptionStartsAt: Date | null;
  expiresAt: Date | null;
}

// 1. ลงทะเบียนฟอนต์ภาษาไทยแบบ Global
Font.register({
  family: 'NotoSansThai',
  fonts: [
    {
      src: path.join(process.cwd(), 'public', 'fonts', 'NotoSansThai-Regular.ttf'),
      fontWeight: 'normal',
    },
    {
      src: path.join(process.cwd(), 'public', 'fonts', 'NotoSansThai-Bold.ttf'),
      fontWeight: 'bold',
    },
  ],
});

// 2. สร้าง StyleSheet ดึง Theme Color เดิมมาใช้
const styles = StyleSheet.create({
  page: {
    fontFamily: 'NotoSansThai',
    padding: 50,
    backgroundColor: '#FFFFFF',
    color: '#262626', // grayDark
  },
  // --- Header ---
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 30,
  },
  logoCompanyGroup: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  // 🌟 เพิ่ม/แก้ไข Style สำหรับ WrenchIcon ตาม Requirement
  logoWrapper: {
    width: 32,
    height: 32,
    backgroundColor: '#059669', // emerald-600
    borderRadius: 8,            // Tailwind rounded-lg ใกล้เคียงสุด
    alignItems: 'center',
    justifyContent: 'center',
  },
  companyName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  companyDetails: {
    fontSize: 10,
    color: '#666666', // grayMedium
    lineHeight: 1.5,
  },
  receiptTitleGroup: {
    alignItems: 'flex-end',
  },
  receiptTitleTH: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#059669', // primaryColor
  },
  receiptTitleEN: {
    fontSize: 11,
    color: '#8C8C8C', // grayLight
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: '#E6E6E6', // borderColor
    marginBottom: 30,
  },
  // --- Info Section ---
  infoContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 40,
  },
  customerGroup: {
    flex: 1,
  },
  metaGroup: {
    flex: 1,
    alignItems: 'flex-end',
  },
  label: {
    fontSize: 10,
    color: '#8C8C8C',
    marginBottom: 2,
  },
  valueText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#262626',
    marginBottom: 10,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 6,
  },
  metaLabel: {
    fontSize: 10,
    color: '#666666',
    width: 100,
    textAlign: 'right',
    paddingRight: 10,
  },
  metaValue: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#262626',
    width: 100,
    textAlign: 'right',
  },
  metaStatusValue: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#059669',
    width: 100,
    textAlign: 'right',
  },
  // --- Table Section ---
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#F7FAFA', // bgHeaderColor
    padding: 8,
    paddingHorizontal: 15,
    marginBottom: 10,
  },
  colNo: {
    width: 60,
    fontSize: 10,
    fontWeight: 'bold',
    color: '#666666',
  },
  colDesc: {
    flex: 1,
    fontSize: 10,
    fontWeight: 'bold',
    color: '#666666',
  },
  colAmount: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#666666',
    textAlign: 'right',
  },
  tableRow: {
    flexDirection: 'row',
    paddingHorizontal: 15,
    marginBottom: 40,
  },
  colNoValue: {
    width: 60,
    fontSize: 12,
    color: '#262626',
  },
  descText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#262626',
    marginBottom: 4,
  },
  descSubText: {
    fontSize: 10,
    color: '#666666',
  },
  amountText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#262626',
    textAlign: 'right',
  },
  // --- Summary Section ---
  summaryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between', // 🌟 ปรับให้ข้อความอยู่สองฝั่ง
    alignItems: 'center',
    marginBottom: 50,
  },
  summaryBahtText: {
    fontSize: 11,
    color: '#666666', // ใช้สีเทากลางเพื่อให้ไม่แย่งซีนตัวเลขหลัก
    flex: 1,
    paddingRight: 10,
  },
  summaryTotalGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#262626',
    marginRight: 20,
  },
  summaryTotal: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#059669',
  },
  // --- Footer ---
  footerContainer: {
    position: 'absolute',
    bottom: 50,
    left: 50,
    right: 50,
    borderTopWidth: 1,
    borderTopColor: '#E6E6E6',
    paddingTop: 20,
  },
  footerTextTH: {
    fontSize: 10,
    color: '#666666',
    marginBottom: 2,
  },
  footerTextEN: {
    fontSize: 9,
    color: '#8C8C8C',
  },
});

// --- Reusable Components ---

const WrenchIcon = () => {
  const svgPath = "M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z";
  return (
    // 🌟 แก้ไข: ใช้ style.logoWrapper ที่กำหนด borderRadius=8 (มุมมนคล้าย Tailwind rounded-lg) 
    // และ backgroundColor สี #059669 (emerald-600)
    <View style={styles.logoWrapper}>
      <Svg viewBox="0 0 24 24" width={18} height={18}>
        <Path
          d={svgPath}
          stroke="#FFFFFF" // 🌟 แก้ไข: เปลี่ยนสีเส้น SVG Wrench ให้เป็นสีขาว (#FFFFFF)
          strokeWidth={2}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    </View>
  );
};

const ReceiptHeader = () => (
  <View style={styles.headerContainer}>
    <View style={styles.logoCompanyGroup}>
      <WrenchIcon />
      <View>
        <Text style={styles.companyName}>Getfixx Systems</Text>
        <Text style={styles.companyDetails}>104 ซอยติวานนท์ 38 (18/5) ต.ท่าทราย อ.เมือง จ.นนทบุรี 11000</Text>
        <Text style={styles.companyDetails}>Tax ID: 3102001480460</Text>
      </View>
    </View>
    <View style={styles.receiptTitleGroup}>
      <Text style={styles.receiptTitleTH}>ใบเสร็จรับเงิน</Text>
      <Text style={styles.receiptTitleEN}>Receipt</Text>
    </View>
  </View>
);

const ReceiptInfoSection = ({ data }: { data: ReceiptData }) => {
  const formattedDate = data.issuedAt ? new Date(data.issuedAt).toLocaleDateString("th-TH") : "-";
  
  return (
    <View style={styles.infoContainer}>
      <View style={styles.customerGroup}>
        <Text style={styles.label}>ชื่อลูกค้า (Customer):</Text>
        <Text style={styles.valueText}>ร้าน: {data.shopName}</Text>
      </View>
      <View style={styles.metaGroup}>
        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>เลขที่ (Receipt No):</Text>
          <Text style={styles.metaValue}>{data.receiptNo}</Text>
        </View>
        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>วันที่ (Date):</Text>
          <Text style={styles.metaValue}>{formattedDate}</Text>
        </View>
        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>สถานะ (Status):</Text>
          <Text style={styles.metaStatusValue}>ชำระแล้ว (PAID)</Text>
        </View>
      </View>
    </View>
  );
};

const ReceiptTable = ({ data }: { data: ReceiptData }) => {
  const formattedAmount = `THB ${data.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
  
  return (
    <View>
      <View style={styles.tableHeader}>
        <Text style={styles.colNo}>ลำดับ (No.)</Text>
        <Text style={styles.colDesc}>รายการ (Description)</Text>
        <Text style={styles.colAmount}>จำนวนเงิน (Amount)</Text>
      </View>
      <View style={styles.tableRow}>
        <Text style={styles.colNoValue}>1</Text>
        <View style={styles.colDesc}>
          <Text style={styles.descText}>ค่าบริการระบบคิวซ่อมมือถือ Getfixx</Text>
          <Text style={styles.descSubText}>- แพ็กเกจ: {data.plan.replace('_', ' ')}</Text>
        </View>
        <Text style={styles.amountText}>{formattedAmount}</Text>
      </View>
    </View>
  );
};

const ReceiptSummary = ({ amount }: { amount: number }) => {
  const formattedAmount = `THB ${amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
  
  // 🌟 ใช้ไลบรารีแปลงตัวเลขเป็นตัวอักษรภาษาไทย
  const amountInWords = `(${bahttext(amount)})`;
  console.log('amount =', amount);
  console.log('bahttext =', bahttext(amount));

  return (
    <View>
      <View style={styles.divider} />
      <View style={styles.summaryContainer}>
        {/* 🌟 แสดงคำอ่านภาษาไทยฝั่งซ้าย */}
        <Text style={styles.summaryBahtText}>{amountInWords}</Text>
        
        {/* แสดงสรุปยอดฝั่งขวา */}
        <View style={styles.summaryTotalGroup}>
          <Text style={styles.summaryLabel}>จำนวนเงินทั้งสิ้น (Total)</Text>
          <Text style={styles.summaryTotal}>{formattedAmount}</Text>
        </View>
      </View>
    </View>
  );
};

const ReceiptFooter = () => (
  <View style={styles.footerContainer}>
    <Text style={styles.footerTextTH}>ใบเสร็จฉบับนี้จัดทำขึ้นโดยระบบอัตโนมัติ ไม่ใช่ใบกำกับภาษี</Text>
    <Text style={styles.footerTextEN}>(This receipt is automatically generated as proof of payment and is not a tax invoice)</Text>
  </View>
);

const ReceiptDocument = ({ data }: { data: ReceiptData }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      <ReceiptHeader />
      <View style={styles.divider} />
      <ReceiptInfoSection data={data} />
      <ReceiptTable data={data} />
      <ReceiptSummary amount={data.amount} />
      <ReceiptFooter />
    </Page>
  </Document>
);

// --- Main Export Function ---

export async function generateReceiptPDF(data: ReceiptData): Promise<Uint8Array> {
  const blob = await pdf(<ReceiptDocument data={data} />).toBlob();
  const arrayBuffer = await blob.arrayBuffer();
  return new Uint8Array(arrayBuffer);
}