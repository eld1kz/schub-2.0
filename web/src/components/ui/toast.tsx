"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useLinger } from "./use-linger";

const shownFor = 2000;
const ToastContext = createContext<(message: string) => void>(() => {});

// A toast's look, on its own for /design
export function ToastMessage({ open = true, ref, children }: { open?: boolean; ref?: React.Ref<HTMLParagraphElement>; children: ReactNode }) {
  return (
    <p ref={ref} data-open={open} className="motion-toast rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background shadow-modal">
      {children}
    </p>
  );
}

// A short message that slides in at the bottom of the screen; lives above the page so it survives it re-rendering
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<{ message: string; id: number } | null>(null);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLParagraphElement>(null);
  const shown = useLinger(open, ref);
  const show = useCallback((message: string) => {
    setToast({ message, id: Date.now() });
    setOpen(true);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setOpen(false), shownFor);
    return () => clearTimeout(timer);
  }, [toast]);

  return (
    <ToastContext value={show}>
      {children}
      <div role="status" aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center px-4">
        {shown && toast && (
          <div key={toast.id} className="mb-16 sm:mb-0">
            <ToastMessage ref={ref} open={open}>{toast.message}</ToastMessage>
          </div>
        )}
      </div>
    </ToastContext>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
