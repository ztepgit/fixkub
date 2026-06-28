import { create } from 'zustand'

interface EstimatedPriceState {
  estimatedPrice: string
  setEstimatedPrice: (value: string) => void
  resetEstimatedPrice: () => void
}

export const useEstimatedPriceStore = create<EstimatedPriceState>((set) => ({
  estimatedPrice: "",
  setEstimatedPrice: (value) => set({ estimatedPrice: value }),
  resetEstimatedPrice: () => set({ estimatedPrice: "" }),
}))