// store/useJobStore.ts
import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'

// 🌟 กฎเหล็กใหม่: Zustand ใช้เก็บเฉพาะสถานะการแสดงผลของ UI เท่านั้น (UI State)
// ห้ามเก็บ Array ของข้อมูล Database ไว้ในนี้เด็ดขาด ปล่อยให้ TanStack Query จัดการ

interface JobUIState {
  // Modal / Dialog States
  isCreateOpen: boolean
  jobToView: string | null // เก็บแค่ ID ก็พอ (ส่วนข้อมูลเต็มให้ TanStack Query จัดการ)
  jobToCancel: string | null
  jobToDelete: string | null
  jobToWarranty: string | null

  // Sheet States
  isArchiveOpen: boolean
  isTrashOpen: boolean
  isWarrantyOpen: boolean

  // Search & Filters (สามารถเพิ่มเข้ามาได้ถ้าใช้ร่วมกันหลาย Component)
  archiveSearchQuery: string
  trashSearchQuery: string
  warrantySearch: string

  // Actions
  setCreateOpen: (isOpen: boolean) => void
  setJobToView: (id: string | null) => void
  setJobToCancel: (id: string | null) => void
  setJobToDelete: (id: string | null) => void
  setJobToWarranty: (id: string | null) => void

  setArchiveOpen: (isOpen: boolean) => void
  setTrashOpen: (isOpen: boolean) => void
  setWarrantyOpen: (isOpen: boolean) => void

  setArchiveSearch: (query: string) => void
  setTrashSearch: (query: string) => void
  setWarrantySearch: (query: string) => void
}

export const useJobStore = create<JobUIState>()(
  immer((set) => ({
    // Initial States
    isCreateOpen: false,
    jobToView: null,
    jobToCancel: null,
    jobToDelete: null,
    jobToWarranty: null,

    isArchiveOpen: false,
    isTrashOpen: false,
    isWarrantyOpen: false,

    archiveSearchQuery: "",
    trashSearchQuery: "",
    warrantySearch: "",

    // Mutators (Actions)
    setCreateOpen: (isOpen) => set((state) => { state.isCreateOpen = isOpen }),
    setJobToView: (id) => set((state) => { state.jobToView = id }),
    setJobToCancel: (id) => set((state) => { state.jobToCancel = id }),
    setJobToDelete: (id) => set((state) => { state.jobToDelete = id }),
    setJobToWarranty: (id) => set((state) => { state.jobToWarranty = id }),

    setArchiveOpen: (isOpen) => set((state) => { state.isArchiveOpen = isOpen }),
    setTrashOpen: (isOpen) => set((state) => { state.isTrashOpen = isOpen }),
    setWarrantyOpen: (isOpen) => set((state) => { state.isWarrantyOpen = isOpen }),

    setArchiveSearch: (query) => set((state) => { state.archiveSearchQuery = query }),
    setTrashSearch: (query) => set((state) => { state.trashSearchQuery = query }),
    setWarrantySearch: (query) => set((state) => { state.warrantySearch = query }),
  }))
)