import { useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useShopStore } from '@/store/useShopStore'
import { getShopSettings } from '@/actions/shop'

// 🌟 ย้ายฟังก์ชัน fetch ออกมานอก Hook เพื่อป้องกันการสร้างฟังก์ชันใหม่ (Re-creation) 
// และลดภาระการทำงานของ useEffect
const fetchShopData = async (
  shopId: string, 
  loadFromCache: (id: string) => Promise<void>, 
  setShop: (data: any) => void
) => {
  // โหลดจาก Cache ก่อนเพื่อให้ UI แสดงผลทันที
  await loadFromCache(shopId)
  
  // ดึงข้อมูลล่าสุดจาก DB 
  const res = await getShopSettings(shopId)
  if (res.success && res.data) {
    setShop({ 
      id: shopId, 
      name: res.data.name, 
      logoUrl: res.data.logoUrl,
      slug: res.data.slug // 🌟 ดึงค่า slug ส่งเข้า Store เพื่อไปทำ Subdomain
    })
  }
}

export function useShopSync(shopId: string) {
  const shop = useShopStore((s) => s.shop)
  const setShop = useShopStore((s) => s.setShop)
  const loadFromCache = useShopStore((s) => s.loadFromCache)
  const isInitialized = useRef(false)

  // 1. Initial Load (ดึงจาก Cache ก่อน แล้วค่อยดึง DB)
  useEffect(() => {
    if (isInitialized.current) return
    isInitialized.current = true

    // 🌟 เรียกใช้ฟังก์ชันที่อยู่นอก Hook
    fetchShopData(shopId, loadFromCache, setShop)
  }, [shopId, loadFromCache, setShop])

  // 2. Realtime Subscription (รอรับข้อมูลที่ถูกอัปเดตจากเครื่องอื่น)
  useEffect(() => {
    const channel = supabase.channel(`shop_sync_${shopId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'Shop', filter: `id=eq.${shopId}` },
        (payload) => {
          // 🌟 อัปเดต slug จากข้อมูล Realtime ของ Supabase ด้วย
          setShop({ 
            id: shopId, 
            name: payload.new.name, 
            logoUrl: payload.new.logoUrl,
            slug: payload.new.slug 
          })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [shopId, setShop])

  return shop
}