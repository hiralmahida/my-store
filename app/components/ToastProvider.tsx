// Lightweight toast system.
//
// - Client components call `useToast()` and fire a toast directly (add to cart,
//   wishlist changes).
// - Server-action redirects can't call a hook, so they append `?flash=<key>`
//   to the destination URL; this provider shows the matching toast on arrival
//   and cleans the param from the URL. We key the check on the pathname (which
//   updates on soft navigation) and read the query from window.location, which
//   avoids useSearchParams' Suspense requirement on static pages.

"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { usePathname } from "next/navigation";

type ToastType = "success" | "info" | "error";
type Toast = { id: number; message: string; type: ToastType };

const ToastContext = createContext<(message: string, type?: ToastType) => void>(
  () => {}
);

export const useToast = () => useContext(ToastContext);

// Messages shown for ?flash=<key> after a server redirect.
const FLASH: Record<string, { message: string; type: ToastType }> = {
  signin: { message: "Welcome back! 👋", type: "success" },
  order: { message: "Order placed — thank you! 🎉", type: "success" },
  "login-required": { message: "Please sign in to continue.", type: "info" },
};

const STYLES: Record<ToastType, string> = {
  success: "bg-slate-900 text-white",
  info: "bg-blue-600 text-white",
  error: "bg-rose-600 text-white",
};

export default function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const idRef = useRef(0);

  const show = useCallback((message: string, type: ToastType = "success") => {
    const id = ++idRef.current;
    setToasts((current) => [...current, { id, message, type }]);
    setTimeout(() => {
      setToasts((current) => current.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  // Fire a flash toast when arriving on a URL with ?flash=<key>.
  const pathname = usePathname();
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const key = params.get("flash");
    if (!key || !FLASH[key]) return;
    show(FLASH[key].message, FLASH[key].type);
    params.delete("flash");
    const qs = params.toString();
    window.history.replaceState(null, "", window.location.pathname + (qs ? `?${qs}` : ""));
  }, [pathname, show]);

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[100] flex flex-col items-center gap-2 px-4">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={`pointer-events-auto animate-[fadeIn_0.15s_ease-out] rounded-lg px-4 py-2.5 text-sm font-medium shadow-lg ${STYLES[t.type]}`}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
