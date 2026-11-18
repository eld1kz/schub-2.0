"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

const shownFor = 2000;
const ToastContext = createContext<(message: string) => void>(() => {});

// A short message at the bottom of the screen; lives above the cards so it survives them re-rendering
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<{ message: string; id: number } | null>(null);
  const show = useCallback((message: string) => setToast({ message, id: Date.now() }), []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), shownFor);
    return () => clearTimeout(timer);
  }, [toast]);

  return (
    <ToastContext value={show}>
      {children}
      <div role="status" aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center px-4">
        {toast && (
          <p key={toast.id} className="mb-16 rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background shadow-lg sm:mb-0">
            {toast.message}
          </p>
        )}
      </div>
    </ToastContext>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
