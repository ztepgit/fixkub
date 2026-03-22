import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { getCache, setCache } from '@/lib/idb'

type Job = any // คุณปิ๊กสามารถเปลี่ยนเป็น Type QueueData ตามที่ใช้งานจริงได้ครับ

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

// 🌟 กฎเหล็ก: เรียงจากใหม่ไปเก่า และเอาแค่ 50 รายการ
const sortAndTrim = (jobs: Job[]) => {
  return jobs
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 50)
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
        state.jobs[idx] = { ...state.jobs[idx], ...job }
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
      incomingJobs.forEach((j) => map.set(j.id, j)) // Update or Add new
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