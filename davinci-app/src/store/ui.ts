import { create } from 'zustand';
import type { DayRange, PeriodId } from '../lib/time';

export type SyncPhase = 'idle' | 'connecting' | 'authApp' | 'authAccount' | 'symbols' | 'positions' | 'history' | 'cashflow' | 'done' | 'error' | 'reconnecting';

export interface SyncState {
  phase: SyncPhase;
  progress: number | null; // 0..1 during first sync
  error: string | null;
  live: boolean;
  accountId?: number;
}

interface UIState {
  accountFilter: 'all' | number;
  period: PeriodId;
  custom: DayRange;
  sidebarCollapsed: boolean;
  tradeKey: string | null;
  dayKey: string | null;
  sync: SyncState;
  toast: { id: number; text: string; tone?: 'ok' | 'err' } | null;
  setAccountFilter: (a: 'all' | number) => void;
  setPeriod: (p: PeriodId, custom?: DayRange) => void;
  toggleSidebar: () => void;
  openTrade: (k: string | null) => void;
  openDay: (k: string | null) => void;
  setSync: (s: Partial<SyncState>) => void;
  showToast: (text: string, tone?: 'ok' | 'err') => void;
}

const persisted = (() => {
  try {
    return JSON.parse(localStorage.getItem('davinci.ui') ?? '{}') as Partial<UIState>;
  } catch {
    return {};
  }
})();

export const useUI = create<UIState>((set, get) => ({
  accountFilter: persisted.accountFilter ?? 'all',
  period: persisted.period ?? 'month',
  custom: persisted.custom ?? { from: null, to: null },
  sidebarCollapsed: persisted.sidebarCollapsed ?? false,
  tradeKey: null,
  dayKey: null,
  sync: { phase: 'idle', progress: null, error: null, live: false },
  toast: null,
  setAccountFilter: (accountFilter) => set({ accountFilter }),
  setPeriod: (period, custom) => set({ period, ...(custom ? { custom } : {}) }),
  toggleSidebar: () => set({ sidebarCollapsed: !get().sidebarCollapsed }),
  openTrade: (tradeKey) => set({ tradeKey }),
  openDay: (dayKey) => set({ dayKey }),
  setSync: (s) => set({ sync: { ...get().sync, ...s } }),
  showToast: (text, tone) => set({ toast: { id: Date.now(), text, tone } }),
}));

useUI.subscribe((s) => {
  try {
    localStorage.setItem('davinci.ui', JSON.stringify({ accountFilter: s.accountFilter, period: s.period, custom: s.custom, sidebarCollapsed: s.sidebarCollapsed }));
  } catch {
    /* storage unavailable */
  }
});
