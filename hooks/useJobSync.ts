// hooks/useJobSync.ts
import { useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { queryKeys } from '@/lib/query-keys'
import { getTop50Jobs } from '@/actions/queue'

export function useJobSync(shopId: string) {
  const queryClient = useQueryClient()
  const [isConnectedRealtime, setIsConnectedRealtime] = useState(false)
  const channelRef = useRef<any>(null)

  // 1. Realtime sync
  useEffect(() => {
    if (!shopId) return

    const channelName = `dashboard_sync:${shopId}`

    // 🌟 ลบ channel เดิมก่อนเสมอ
    const existing = supabase.getChannels()
      .find(c => c.topic === `realtime:${channelName}`)

    if (existing) {
      void supabase.removeChannel(existing)
    }


    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'Queue', filter: `shopId=eq.${shopId}` },
        (payload) => {
          const queryKey = queryKeys.queues.list(shopId)

          queryClient.setQueryData(queryKey, (oldData: any[] = []) => {
            const event = payload.eventType

            if (event === 'DELETE') {
              return oldData.filter(job => job.id !== payload.old.id)
            }

            // 🌟 ANALYTICS SAFE SOFT DELETE:
            // ดักจับ: ถ้ารายการถูกอัปเดตเป็น isDeleted = true ให้ลบออกจากหน้าจอ (Cache) ทันที
            if (payload.new && payload.new.isDeleted === true) {
              return oldData.filter(job => job.id !== payload.new.id)
            }

            if (event === 'INSERT') {
              // ป้องกันปัญหา Optimistic Update ที่เด้งข้อมูลซ้ำซ้อน
              if (oldData.some(job => job.id === payload.new.id)) return oldData
              // จัดการเรื่อง Priority / Sorting เบื้องต้น โดยเอาของใหม่ไว้บนสุด
              return [payload.new, ...oldData]
            }

            if (event === 'UPDATE') {
              return oldData.map(job =>
                job.id === payload.new.id ? { ...job, ...payload.new } : job
              )
            }

            return oldData
          })

          // Invalidate ตัว Report เมื่อมีการเปลี่ยนแปลงข้อมูลคิว เพื่อให้สถิติตรงเป๊ะเสมอ
          queryClient.invalidateQueries({ queryKey: queryKeys.reports.stats(shopId) })
        }
      )
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          setIsConnectedRealtime(true)
          // Full resync กันข้อมูลหลุดช่วงจังหวะต่อเน็ต
          queryClient.invalidateQueries({ queryKey: queryKeys.queues.list(shopId) })
        }

        if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          setIsConnectedRealtime(false)
        }
      })

    channelRef.current = channel

    return () => {
      supabase.removeChannel(channel)
    }
  }, [shopId, queryClient])

  // 2. Polling fallback (optimized) - รับประกันข้อมูลไม่เพี้ยนถ้าระบบ Socket หลุด
  useEffect(() => {
    if (!shopId) return

    const intervalTime = isConnectedRealtime ? 60000 : 15000 // 1 นาทีถ้าต่อติด, 15 วิถ้าเน็ตหลุด

    const interval = setInterval(async () => {
      if (document.hidden) return // ไม่โหลดถ้าผู้ใช้ซ่อนแท็บไว้

      const res = await getTop50Jobs(shopId)
      if (res.success && res.data) {
        // ใช้ setQueryData ดันข้อมูลลง Cache ตรงๆ เพื่อลดการกระตุกของ UI
        queryClient.setQueryData(queryKeys.queues.list(shopId), res.data)
      }
    }, intervalTime)

    return () => clearInterval(interval)
  }, [isConnectedRealtime, shopId, queryClient])
}