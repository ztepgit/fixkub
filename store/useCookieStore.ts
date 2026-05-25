//store/useCookieStore.ts
import { create } from "zustand";

export type CookiePreferences = {
  essential: boolean;
  functional: boolean;
  analytics: boolean;
};

interface CookieState {
  hasMounted: boolean;
  showBanner: boolean;
  showSettings: boolean;
  preferences: CookiePreferences;

  openSettings: () => void;
  closeSettings: () => void;
  acceptAll: () => void;
  rejectAll: () => void;
  savePreferences: (prefs: CookiePreferences) => void;
  hideBanner: () => void;
  initializeFromStorage: () => void;
}

const defaultPreferences: CookiePreferences = {
  essential: true,
  functional: false,
  analytics: false,
};

const ALL_ACCEPTED: CookiePreferences = {
  essential: true,
  functional: true,
  analytics: true,
};

const ALL_REJECTED: CookiePreferences = {
  essential: true,
  functional: false,
  analytics: false,
};

export const useCookieStore = create<CookieState>((set) => ({
  hasMounted: false,
  showBanner: false,
  showSettings: false,
  preferences: defaultPreferences,

  initializeFromStorage: () => {
    try {
      const stored = localStorage.getItem("cookie-consent");
      if (stored) {
        set({
          preferences: JSON.parse(stored),
          showBanner: false, // ถ้าเคยมีข้อมูลแล้ว ไม่ต้องโชว์ Banner
          hasMounted: true,
        });
      } else {
        set({
          showBanner: true, // ถ้ายังไม่มี ต้องโชว์ Banner
          hasMounted: true,
        });
      }
    } catch (e) {
      set({ showBanner: true, hasMounted: true });
    }
  },

  openSettings: () => set({ showSettings: true }),

  closeSettings: () => set({ showSettings: false }),

  acceptAll: () => {
    localStorage.setItem("cookie-consent", JSON.stringify(ALL_ACCEPTED));
    set({ preferences: ALL_ACCEPTED, showBanner: false, showSettings: false });
  },

  rejectAll: () => {
    localStorage.setItem("cookie-consent", JSON.stringify(ALL_REJECTED));
    set({ preferences: ALL_REJECTED, showBanner: false, showSettings: false });
  },

  savePreferences: (prefs) => {
    localStorage.setItem("cookie-consent", JSON.stringify(prefs));
    set({ preferences: prefs, showBanner: false, showSettings: false });
  },

  hideBanner: () => set({ showBanner: false }),
}));