import { ReactNode } from "react";
import { Link } from "react-router-dom";

export const card = "rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-xl";

export function NavButton({
  to,
  label,
  icon,
}: {
  to: string;
  label: string;
  icon: ReactNode;
}) {
  return (
    <Link
      to={to}
      className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-slate-100 transition hover:border-indigo-300/50 hover:bg-indigo-400/20"
    >
      {icon}
      {label}
    </Link>
  );
}

export function Metric({
  label,
  value,
  className = "",
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div
      className={`rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-2 ${className}`}
    >
      <p className="text-xs uppercase text-emerald-300">{label}</p>
      <p className="font-semibold">{value}</p>
    </div>
  );
}
