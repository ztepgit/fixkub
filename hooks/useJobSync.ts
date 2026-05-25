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
  const channelRef = useRef<any>(null)

  // 1. Initial load (cache → server)
  useEffect(() => {
    if (isInitialized.current) return
    isInitialized.current = true

    const init = async () => {
      await loadFromCache()

      const res = await getTop50Jobs(shopId)
      if (res.success && res.data) {
        replaceAll(res.data)
      }
    }

    init()
  }, [shopId, loadFromCache, replaceAll])

  // 2. Realtime sync
  useEffect(() => {
    const channelName = `dashboard_sync:${shopId}`

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'Queue',
          filter: `shopId=eq.${shopId}`,
        },
        (payload) => {
          const event = payload.eventType

          if (event === 'DELETE') {
            removeJob(payload.old.id)
            return
          }

          upsertJob(payload.new)
        }
      )
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          setConnectionState(true)

          // full resync กันข้อมูลหลุด
          const res = await getTop50Jobs(shopId)
          if (res.success && res.data) {
            replaceAll(res.data)
          }
        }

        if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          setConnectionState(false)
        }
      })

    channelRef.current = channel

    return () => {
      supabase.removeChannel(channel)
    }
  }, [shopId, setConnectionState, upsertJob, removeJob, replaceAll])

  // 3. Polling fallback (optimized)
  useEffect(() => {
    const intervalTime = isConnectedRealtime ? 60000 : 15000

    const interval = setInterval(async () => {
      if (document.hidden) return

      const res = await getTop50Jobs(shopId)
      if (!res.success || !res.data) return

      mergeJobs(res.data)
    }, intervalTime)

    return () => clearInterval(interval)
  }, [isConnectedRealtime, shopId, mergeJobs])
}