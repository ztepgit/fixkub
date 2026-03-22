import { useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useShopStore } from '@/store/useShopStore'
import { getShopSettings } from '@/actions/shop'

export function useShopSync(shopId: string) {
  const shop = useShopStore((s) => s.shop)
  const setShop = useShopStore((s) => s.setShop)
  const loadFromCache = useShopStore((s) => s.loadFromCache)
  const isInitialized = useRef(false)

  // 1. Initial Load (ดึงจาก Cache ก่อน แล้วค่อยดึง DB)
  useEffect(() => {
    if (isInitialized.current) return
    isInitialized.current = true

    const init = async () => {
      await loadFromCache(shopId)
      const res = await getShopSettings(shopId)
      if (res.success && res.data) {
        setShop({ id: shopId, name: res.data.name, logoUrl: res.data.logoUrl })
      }
    }
    init()
  }, [shopId, loadFromCache, setShop])

  // 2. Realtime Subscription (รอรับข้อมูลที่ถูกอัปเดตจากเครื่องอื่น)
  useEffect(() => {
    const channel = supabase.channel(`shop_sync_${shopId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'Shop', filter: `id=eq.${shopId}` },
        (payload) => {
          setShop({ id: shopId, name: payload.new.name, logoUrl: payload.new.logoUrl })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [shopId, setShop])

  return shop
}