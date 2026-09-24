"use client";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { X, CircleCheck, CircleX, Info } from "lucide-react";
import { Button } from "./core.js";

// ---------------- Modal ----------------
export function Modal({ title, subtitle, onClose, children, footer, size }) {
  const ref = useRef(null);
  useEffect(() => {
    const k = (e) => e.key === "Escape" && onClose?.();
    window.addEventListener("keydown", k);
    const prev = document.activeElement;
    ref.current?.querySelector("input,select,textarea,button:not([aria-label='Close'])")?.focus?.();
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", k); document.body.style.overflow = ""; prev?.focus?.(); };
  }, [onClose]);
  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}>
      <div ref={ref} className={"modal" + (size === "lg" ? " modal-lg" : "")} role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal-head">
          <div className="stack-1">
            <h2 className="t-section">{title}</h2>
            {subtitle && <p className="t-secondary">{subtitle}</p>}
          </div>
          <Button variant="ghost" size="sm" icon={X} onClick={onClose} aria-label="Close" />
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  );
}

// ---------------- Toasts ----------------
const ToastCtx = createContext(() => {});
const TOAST_ICON = { success: CircleCheck, error: CircleX, info: Info };
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const push = useCallback((msg, kind = "info") => {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t.slice(-2), { id, msg, kind }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4200);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {toasts.map((t) => {
          const I = TOAST_ICON[t.kind] || Info;
          return <div key={t.id} className={"toast " + t.kind}><I size={18} aria-hidden /><span>{t.msg}</span></div>;
        })}
      </div>
    </ToastCtx.Provider>
  );
}
export const useToast = () => useContext(ToastCtx);
