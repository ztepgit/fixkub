import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { getCache, setCache } from '@/lib/idb'

type Job = any 

interface JobState {
  jobs: Job[]
  lastSyncAt: number
  isConnectedRealtime: boolean
  setConnectionState: (status: boolean) => void
  replaceAll: (jobs: Job[]) => void
  upsertJob: (job: Job) => void
  removeJob: (id: string) => void
  mergeJobs: (jobs: Job[]) => void
  loadFromCache: () => Promise<void>
}

// 🌟 กฎเหล็กใหม่: ให้ความสำคัญกับงานที่กำลังดำเนินการก่อน (Priority Logic)
const getPriority = (status: string) => {
  switch (status) {
    case "PROCESSING": return 1 // กำลังซ่อม (สำคัญสุด)
    case "WAITING": return 2    // รอคิวซ่อม
    case "PENDING": return 3    // ลูกค้าเพิ่งแจ้งซ่อม
    case "REPAIRED": return 4   // ซ่อมเสร็จแล้ว รอรับ
    case "COMPLETED": return 5  // ปิดจ๊อบแล้ว
    case "ARCHIVED": return 6   // เข้าคลัง
    case "CANCELLED": return 7  // ยกเลิก
    default: return 8
  }
}

// 🌟 เรียงตาม Priority ก่อน, ถ้า Priority เท่ากันให้เรียงตามเวลาอัปเดต (updatedAt)
const sortAndTrim = (jobs: Job[]) => {
  return jobs
    .sort((a, b) => {
      const priorityDiff = getPriority(a.status) - getPriority(b.status)
      if (priorityDiff !== 0) return priorityDiff
      
      const timeA = new Date(a.updatedAt || a.createdAt).getTime()
      const timeB = new Date(b.updatedAt || b.createdAt).getTime()
      return timeB - timeA // ใหม่สุดขึ้นก่อน
    })
    .slice(0, 50) // เอาแค่ 50 งานที่สำคัญที่สุด
}

const persistCache = (jobs: Job[], syncTime: number) => {
  setCache('jobs_top_50', { jobs, lastSyncAt: syncTime })
}

export const useJobStore = create<JobState>()(
  immer((set) => ({
    jobs: [],
    lastSyncAt: 0,
    isConnectedRealtime: false,

    setConnectionState: (status) => set((state) => {
      state.isConnectedRealtime = status
    }),

    replaceAll: (jobs) => set((state) => {
      state.jobs = sortAndTrim(jobs)
      state.lastSyncAt = Date.now()
      persistCache(state.jobs, state.lastSyncAt)
    }),

    upsertJob: (job) => set((state) => {
      const idx = state.jobs.findIndex((j) => j.id === job.id)
      if (idx >= 0) {
        // ใช้ updatedAt ล่าสุดป้องกัน Data Conflict
        const currentUpdated = new Date(state.jobs[idx].updatedAt || 0).getTime()
        const incomingUpdated = new Date(job.updatedAt || 0).getTime()
        if (incomingUpdated >= currentUpdated) {
          state.jobs[idx] = { ...state.jobs[idx], ...job }
        }
      } else {
        state.jobs.push(job)
      }
      state.jobs = sortAndTrim(state.jobs)
      state.lastSyncAt = Date.now()
      persistCache(state.jobs, state.lastSyncAt)
    }),

    removeJob: (id) => set((state) => {
      state.jobs = state.jobs.filter((j) => j.id !== id)
      state.lastSyncAt = Date.now()
      persistCache(state.jobs, state.lastSyncAt)
    }),

    mergeJobs: (incomingJobs) => set((state) => {
      const map = new Map(state.jobs.map((j) => [j.id, j]))
      incomingJobs.forEach((j) => {
        const existing = map.get(j.id)
        if (!existing) {
          map.set(j.id, j)
        } else {
          const currentUpdated = new Date(existing.updatedAt || 0).getTime()
          const incomingUpdated = new Date(j.updatedAt || 0).getTime()
          if (incomingUpdated >= currentUpdated) {
            map.set(j.id, j)
          }
        }
      })
      state.jobs = sortAndTrim(Array.from(map.values()))
      state.lastSyncAt = Date.now()
      persistCache(state.jobs, state.lastSyncAt)
    }),

    loadFromCache: async () => {
      const data = await getCache('jobs_top_50')
      if (data?.jobs) {
        set((state) => {
          state.jobs = data.jobs
          state.lastSyncAt = data.lastSyncAt
        })
      }
    },
  }))
)