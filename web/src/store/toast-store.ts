import { create } from 'zustand';

export type ToastKind = 'info' | 'success' | 'error' | 'warning';

export interface Toast {
  id: number;
  kind: ToastKind;
  title: string;
  lines?: string[];
}

interface ToastState {
  toasts: Toast[];
  push(kind: ToastKind, title: string, lines?: string[]): void;
  dismiss(id: number): void;
}

let nextId = 1;

export const useToastStore = create<ToastState>()((set, get) => ({
  toasts: [],
  push(kind, title, lines) {
    const id = nextId++;
    set((s) => ({ toasts: [...s.toasts, { id, kind, title, lines }] }));
    setTimeout(() => get().dismiss(id), kind === 'error' ? 9000 : 5000);
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

export const toast = {
  info: (t: string, l?: string[]) => useToastStore.getState().push('info', t, l),
  success: (t: string, l?: string[]) => useToastStore.getState().push('success', t, l),
  warning: (t: string, l?: string[]) => useToastStore.getState().push('warning', t, l),
  error: (t: string, l?: string[]) => useToastStore.getState().push('error', t, l),
};
