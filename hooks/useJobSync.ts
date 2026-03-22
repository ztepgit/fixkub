import { useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useJobStore } from '@/store/useJobStore'
import { getTop50Jobs } from '@/actions/queue'

export function useJobSync(shopId: string) {
  const loadFromCache = useJobStore(state => state.loadFromCache)
  const replaceAll = useJobStore(state => state.replaceAll)
  const mergeJobs = useJobStore(state => state.mergeJobs)
  const upsertJob = useJobStore(state => state.upsertJob)
  const removeJob = useJobStore(state => state.removeJob)
  const isConnectedRealtime = useJobStore(state => state.isConnectedRealtime)
  const setConnectionState = useJobStore(state => state.setConnectionState)

  const isInitialized = useRef(false)

  // 🌟 1. Initial Load Flow
  useEffect(() => {
    if (isInitialized.current) return
    isInitialized.current = true

    const init = async () => {
      await loadFromCache() // ให้ UI ขึ้นทันทีจาก IndexedDB
      
      const res = await getTop50Jobs(shopId)
      if (res.success && res.data) {
        replaceAll(res.data) // อัปเดตข้อมูลสดทับไป
      }
    }
    init()
  }, [shopId, loadFromCache, replaceAll])

  // 🌟 2. Supabase Realtime Flow
  useEffect(() => {
    const channel = supabase.channel('dashboard_sync')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'Queue', filter: `shopId=eq.${shopId}` },
        (payload) => upsertJob(payload.new)
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'Queue', filter: `shopId=eq.${shopId}` },
        (payload) => upsertJob(payload.new)
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'Queue', filter: `shopId=eq.${shopId}` },
        (payload) => removeJob(payload.old.id)
      )
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          setConnectionState(true)
          // กัน Event หลุดตอนเน็ตตัดแล้วต่อใหม่
          const res = await getTop50Jobs(shopId)
          if (res.success && res.data) replaceAll(res.data)
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          setConnectionState(false)
        }
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [shopId, setConnectionState, upsertJob, removeJob, replaceAll])

  // 🌟 3. Polling System (Fallback)
  useEffect(() => {
    // ถ้า Realtime ปกติ: Sync ทุก 30 วิ / ถ้าเน็ตหลุด/Realtime พัง: Sync ถี่ขึ้นเป็น 10 วิ
    const intervalTime = isConnectedRealtime ? 30000 : 10000
    
    const interval = setInterval(async () => {
      const res = await getTop50Jobs(shopId)
      if (res.success && res.data) {
        mergeJobs(res.data) // ใช้ merge แทน replace เพื่อป้องกัน UI กระตุก
      }
    }, intervalTime)

    return () => clearInterval(interval)
  }, [isConnectedRealtime, shopId, mergeJobs])
}