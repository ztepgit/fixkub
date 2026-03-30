import { create } from "zustand"
import { immer } from "zustand/middleware/immer"
import { getCache, setCache } from "@/lib/idb"

interface ShopData {
  id: string
  name: string
  logoUrl: string | null
  slug: string | null // 🌟 1. เพิ่มฟิลด์ slug เข้ามาตรงนี้ เพื่อนำไปสร้าง Subdomain
  isDemo?: boolean // 👈 เพิ่มตรงนี้
}

interface ShopStore {
  shop: ShopData | null
  setShop: (data: ShopData) => void
  updateShop: (partial: Partial<ShopData>) => void
  loadFromCache: (shopId: string) => Promise<void>
}

export const useShopStore = create<ShopStore>()(
  immer((set) => ({
    shop: null,

    // 🌟 นำข้อมูลจาก DB มาทับ (ข้อมูลที่มี slug จะถูกเซฟลง Cache อัตโนมัติด้วย)
    setShop: (data) => set((state) => {
      state.shop = data
      setCache(`shop_${data.id}`, data)
    }),

    // 🌟 สำหรับทำ Optimistic Update ทันทีตอนแก้ข้อมูล
    updateShop: (partial) => set((state) => {
      if (state.shop) {
        state.shop = { ...state.shop, ...partial }
        setCache(`shop_${state.shop.id}`, state.shop)
      }
    }),

    // 🌟 โหลดจาก Cache เพื่อความเร็ว (ตอนโหลดกลับมาก็จะได้ slug ติดมาด้วยทันที)
    loadFromCache: async (shopId) => {
      const data = await getCache(`shop_${shopId}`)
      if (data) {
        set((state) => { state.shop = data })
      }
    }
  }))
)