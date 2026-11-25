import { create } from 'zustand';

export interface ToastAction {
  label: string;
  onAction: () => void;
}

export interface ToastItem {
  id: number;
  title: string;
  description?: string;
  /** Typically "Undo". Rendered as a real button so it is reachable by keyboard. */
  action?: ToastAction;
  /** Milliseconds; actions get a longer default so there is time to undo. */
  duration?: number;
  tone?: 'info' | 'error';
}

interface ToastState {
  toasts: ToastItem[];
  push: (toast: Omit<ToastItem, 'id'>) => number;
  dismiss: (id: number) => void;
}

let nextId = 1;

export const useToasts = create<ToastState>()((set) => ({
  toasts: [],
  push: (toast) => {
    const id = nextId++;
    set((s) => ({ toasts: [...s.toasts, { ...toast, id }] }));
    return id;
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

/** Shows a toast from anywhere (components, repositories' callers, etc.). */
export function toast(item: Omit<ToastItem, 'id'>): number {
  return useToasts.getState().push(item);
}
