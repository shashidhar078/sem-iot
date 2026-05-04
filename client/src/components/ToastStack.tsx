import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import type { Toast } from "../types";

export function ToastStack({
  toasts,
  onDismiss,
}: {
  toasts: Toast[];
  onDismiss: (id: number) => void;
}) {
  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-40 flex w-[320px] flex-col gap-2">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className={`pointer-events-auto rounded-xl border px-4 py-3 text-sm shadow-xl ${
              toast.kind === "success"
                ? "border-emerald-300/30 bg-emerald-500/20 text-emerald-100"
                : toast.kind === "error"
                  ? "border-rose-300/30 bg-rose-500/20 text-rose-100"
                  : "border-indigo-300/30 bg-indigo-500/20 text-indigo-100"
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <span>{toast.message}</span>
              <button
                type="button"
                onClick={() => onDismiss(toast.id)}
                className="rounded p-1 transition hover:bg-black/20"
              >
                <X size={14} />
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
