import { useState, FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Sparkles } from "lucide-react";
import type { User, Toast } from "../types";
import { api } from "../api";
import { card } from "../components/common";

export function LoginPage({
  onLogin,
  onToast,
}: {
  onLogin: (user: User) => void;
  onToast: (kind: Toast["kind"], message: string) => void;
}) {
  const [isSignup, setIsSignup] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const navigate = useNavigate();

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    try {
      if (isSignup) {
        await api.post("/auth/signup", { name, email, password, phone });
      }
      const { data } = await api.post<{ user: User }>("/auth/login", {
        email,
        password,
        phone,
      });
      onLogin(data.user);
      navigate(
        data.user.role === "admin" ? "/admin-dashboard" : "/customer-dashboard",
      );
    } catch (error: any) {
      onToast(
        "error",
        error?.response?.data?.message || "Authentication failed",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={`${card} mx-auto mt-16 max-w-xl p-8`}>
      <p className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-indigo-300">
        <Sparkles size={14} /> ESIOT Access
      </p>
      <h1 className="mt-2 text-3xl font-semibold">
        {isSignup ? "Create customer account" : "Login to continue"}
      </h1>
      <p className="mt-2 text-slate-300">
        Role based access is automatic after successful login.
      </p>
      <form onSubmit={submit} className="mt-6 space-y-3">
        {isSignup && (
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="Name"
            className="w-full rounded-xl border border-white/20 bg-white/5 px-4 py-3 outline-none focus:border-indigo-400"
          />
        )}
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          placeholder="Email"
          className="w-full rounded-xl border border-white/20 bg-white/5 px-4 py-3 outline-none focus:border-indigo-400"
        />
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          required
          placeholder="Phone"
          className="w-full rounded-xl border border-white/20 bg-white/5 px-4 py-3 outline-none focus:border-indigo-400"
        />
        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          type="password"
          placeholder="Password"
          className="w-full rounded-xl border border-white/20 bg-white/5 px-4 py-3 outline-none focus:border-indigo-400"
        />
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-xl bg-gradient-to-r from-indigo-500 to-emerald-500 px-6 py-3 font-semibold text-white transition hover:opacity-90 disabled:opacity-40"
        >
          {isSubmitting
            ? "Please wait..."
            : isSignup
              ? "Signup + Login"
              : "Login"}
        </button>
      </form>
      <button
        type="button"
        onClick={() => setIsSignup((prev) => !prev)}
        className="mt-3 w-full rounded-xl border border-white/20 px-6 py-3 text-sm text-slate-200 transition hover:bg-white/10"
      >
        {isSignup ? "Already registered? Login" : "New customer? Signup"}
      </button>
    </div>
  );
}
