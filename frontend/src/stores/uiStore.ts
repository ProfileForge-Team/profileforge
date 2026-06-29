import { create } from 'zustand';

type ToastKind = 'success' | 'error' | 'info';

type Toast = { id: number; message: string; kind: ToastKind };

type UiState = {
  toast: Toast | null;
  showToast: (message: string, kind?: ToastKind) => void;
  clearToast: () => void;
};

export const useUiStore = create<UiState>((set) => ({
  toast: null,
  showToast: (message, kind = 'success') => {
    const id = Date.now();
    set({ toast: { id, message, kind } });
    window.setTimeout(() => {
      set((state) => state.toast?.id === id ? { toast: null } : state);
    }, 3400);
  },
  clearToast: () => set({ toast: null })
}));
