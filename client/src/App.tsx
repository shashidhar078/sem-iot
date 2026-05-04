import { AnimatePresence, motion } from "framer-motion";
import axios from "axios";
import {
  AlertTriangle,
  IndianRupee,
  Package,
  ReceiptText,
  RotateCcw,
  ScanLine,
  ShieldCheck,
  Sparkles,
  UserCircle2,
  Wallet,
  X,
} from "lucide-react";
import { type FormEvent, type ReactNode, useEffect, useMemo, useState } from "react";
import { Link, Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";

type Role = "admin" | "customer";

type User = {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: Role;
  balance: number;
};

type CartItem = {
  uid: string;
  name: string;
  price: number;
  quantity: number;
  lineTotal: number;
};

type CartResponse = {
  items: CartItem[];
  total: number;
};

type Bill = {
  billId: string;
  customerName: string;
  customerPhone: string;
  items: CartItem[];
  total: number;
  createdAt: string;
};

type Product = {
  uid: string;
  name: string;
  price: number;
  quantity: number;
  category: string;
  status?: string;
};

type Toast = {
  id: number;
  kind: "success" | "error" | "info";
  message: string;
};

const api = axios.create({
  baseURL: "/api",
});

const card = "rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-xl";

function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const pushToast = (kind: Toast["kind"], message: string) => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    setToasts((prev) => [...prev, { id, kind, message }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, 3200);
  };

  useEffect(() => {
    const stored = localStorage.getItem("esiot_user");
    if (!stored) return;
    try {
      const parsed = JSON.parse(stored) as User;
      setCurrentUser(parsed);
      api.defaults.headers.common["x-user-id"] = parsed.id;
    } catch {
      localStorage.removeItem("esiot_user");
    }
  }, []);

  const saveUser = (user: User | null) => {
    setCurrentUser(user);
    if (!user) {
      localStorage.removeItem("esiot_user");
      delete api.defaults.headers.common["x-user-id"];
      return;
    }
    localStorage.setItem("esiot_user", JSON.stringify(user));
    api.defaults.headers.common["x-user-id"] = user.id;
  };

  return (
    <div className="min-h-screen bg-[#070b14] text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(99,102,241,0.35),transparent_35%),radial-gradient(circle_at_80%_0%,rgba(16,185,129,0.25),transparent_30%),radial-gradient(circle_at_50%_100%,rgba(245,158,11,0.2),transparent_35%)]" />
      <main className="relative mx-auto max-w-6xl p-6 md:p-10">
        <Routes>
          <Route
            path="/login"
            element={
              <LoginPage
                onLogin={(user) => {
                  saveUser(user);
                  pushToast("success", `Welcome ${user.name}`);
                }}
                onToast={pushToast}
              />
            }
          />
          <Route
            path="/admin-dashboard"
            element={
              <Guard user={currentUser} role="admin">
                <AdminDashboard
                  user={currentUser}
                  onLogout={() => {
                    saveUser(null);
                    pushToast("info", "Logged out");
                  }}
                  onToast={pushToast}
                />
              </Guard>
            }
          />
          <Route
            path="/customer-dashboard"
            element={
              <Guard user={currentUser} role="customer">
                <CustomerDashboard
                  user={currentUser}
                  onUserUpdate={(next) => saveUser(next)}
                  onLogout={() => {
                    saveUser(null);
                    pushToast("info", "Logged out");
                  }}
                  onToast={pushToast}
                />
              </Guard>
            }
          />
          <Route
            path="*"
            element={
              <Navigate
                to={
                  !currentUser
                    ? "/login"
                    : currentUser.role === "admin"
                      ? "/admin-dashboard"
                      : "/customer-dashboard"
                }
                replace
              />
            }
          />
        </Routes>

        <ToastStack
          toasts={toasts}
          onDismiss={(id) => setToasts((prev) => prev.filter((toast) => toast.id !== id))}
        />
      </main>
    </div>
  );
}

function Guard({
  user,
  role,
  children,
}: {
  user: User | null;
  role: Role;
  children: ReactNode;
}) {
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== role) {
    return (
      <Navigate
        to={user.role === "admin" ? "/admin-dashboard" : "/customer-dashboard"}
        replace
      />
    );
  }
  return <>{children}</>;
}

function NavButton({ to, label, icon }: { to: string; label: string; icon: ReactNode }) {
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

function Metric({
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

function LoginPage({
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
      const { data } = await api.post<{ user: User }>("/auth/login", { email, password, phone });
      onLogin(data.user);
      navigate(data.user.role === "admin" ? "/admin-dashboard" : "/customer-dashboard");
    } catch (error: any) {
      onToast("error", error?.response?.data?.message || "Authentication failed");
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
      <p className="mt-2 text-slate-300">Role based access is automatic after successful login.</p>
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
          {isSubmitting ? "Please wait..." : isSignup ? "Signup + Login" : "Login"}
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

function AdminDashboard({
  user,
  onLogout,
  onToast,
}: {
  user: User | null;
  onLogout: () => void;
  onToast: (kind: Toast["kind"], message: string) => void;
}) {
  const [products, setProducts] = useState<Product[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [edits, setEdits] = useState<Record<string, { price: number; quantity: number }>>({});

  const loadData = async () => {
    setLoading(true);
    try {
      const [{ data: productData }, { data: billData }] = await Promise.all([
        api.get<Product[]>("/products"),
        api.get<Bill[]>("/bills"),
      ]);
      setProducts(productData);
      setBills(billData);
      const nextEdits: Record<string, { price: number; quantity: number }> = {};
      productData.forEach((product) => {
        nextEdits[product.uid] = { price: product.price, quantity: product.quantity };
      });
      setEdits(nextEdits);
    } catch (error: any) {
      onToast("error", error?.response?.data?.message || "Failed to load admin data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div className="space-y-6">
      <header className={`${card} flex flex-wrap items-center justify-between gap-4 p-5`}>
        <div>
          <p className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-indigo-300">
            <ShieldCheck size={14} /> Admin Console
          </p>
          <h1 className="mt-1 text-2xl font-semibold md:text-3xl">Inventory + Bills</h1>
          <p className="text-sm text-slate-300">Signed in as {user?.name}</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={loadData}
            className="rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm"
          >
            Refresh
          </button>
          <button
            type="button"
            onClick={onLogout}
            className="rounded-xl border border-rose-300/30 bg-rose-500/10 px-4 py-2 text-rose-100"
          >
            Logout
          </button>
        </div>
      </header>

      <section className={`${card} p-5`}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-xl font-semibold">
            <Package size={18} /> Inventory
          </h2>
          <Metric label="Products" value={String(products.length)} />
        </div>
        {loading ? (
          <p className="text-slate-300">Loading products...</p>
        ) : (
          <div className="space-y-2">
            {products.map((product) => (
              <div
                key={product.uid}
                className={`grid grid-cols-1 gap-2 rounded-xl border p-3 md:grid-cols-6 ${
                  product.quantity < 10
                    ? "border-rose-300/40 bg-rose-500/10"
                    : "border-white/10 bg-white/5"
                }`}
              >
                <div className="font-medium">{product.name}</div>
                <div className="text-slate-300">{product.uid}</div>
                <input
                  type="number"
                  value={edits[product.uid]?.price ?? product.price}
                  onChange={(e) =>
                    setEdits((prev) => ({
                      ...prev,
                      [product.uid]: {
                        price: Number(e.target.value),
                        quantity: prev[product.uid]?.quantity ?? product.quantity,
                      },
                    }))
                  }
                  className="rounded-lg border border-white/20 bg-white/5 px-2 py-1"
                />
                <input
                  type="number"
                  value={edits[product.uid]?.quantity ?? product.quantity}
                  onChange={(e) =>
                    setEdits((prev) => ({
                      ...prev,
                      [product.uid]: {
                        price: prev[product.uid]?.price ?? product.price,
                        quantity: Number(e.target.value),
                      },
                    }))
                  }
                  className="rounded-lg border border-white/20 bg-white/5 px-2 py-1"
                />
                <div className={product.quantity < 10 ? "text-rose-200" : "text-emerald-200"}>
                  {product.quantity < 10 ? "LOW STOCK" : "STOCK OK"}
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      const update = edits[product.uid];
                      if (!update) return;
                      await api.put(`/products/${product.uid}`, update);
                      onToast("success", `Updated ${product.name}`);
                      await loadData();
                    } catch (error: any) {
                      onToast("error", error?.response?.data?.message || "Update failed");
                    }
                  }}
                  className="rounded-lg border border-indigo-300/40 bg-indigo-500/15 px-3 py-1 text-indigo-100"
                >
                  Save
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className={`${card} p-5`}>
        <h2 className="mb-3 flex items-center gap-2 text-xl font-semibold">
          <ReceiptText size={18} /> All Bills
        </h2>
        <div className="space-y-2">
          {bills.map((bill) => (
            <div key={bill.billId} className="rounded-xl border border-white/10 bg-white/5 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium">{bill.billId}</p>
                <p className="text-sm text-slate-300">{new Date(bill.createdAt).toLocaleString()}</p>
              </div>
              <p className="text-sm text-slate-300">
                {bill.customerName} ({bill.customerPhone})
              </p>
              <p className="mt-1 text-amber-200">Total: Rs {bill.total}</p>
            </div>
          ))}
          {!bills.length && <p className="text-slate-300">No bills yet.</p>}
        </div>
      </section>
    </div>
  );
}

function CustomerDashboard({
  user,
  onUserUpdate,
  onLogout,
  onToast,
}: {
  user: User | null;
  onUserUpdate: (user: User) => void;
  onLogout: () => void;
  onToast: (kind: Toast["kind"], message: string) => void;
}) {
  const [cart, setCart] = useState<CartResponse>({ items: [], total: 0 });
  const [bills, setBills] = useState<Bill[]>([]);
  const [wallet, setWallet] = useState(0);
  const [uid, setUid] = useState("");
  const [amount, setAmount] = useState(500);
  const [notice, setNotice] = useState("Ready to scan RFID tags.");
  const [lastScannedUid, setLastScannedUid] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isPaying, setIsPaying] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const location = useLocation();

  const itemCount = useMemo(() => cart.items.reduce((sum, item) => sum + item.quantity, 0), [cart.items]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [{ data: cartData }, { data: billData }, { data: walletData }] = await Promise.all([
        api.get<CartResponse>("/cart"),
        api.get<Bill[]>("/my-bills"),
        api.get<{ balance: number }>("/wallet"),
      ]);
      setCart(cartData);
      setBills(billData);
      setWallet(walletData.balance);
      if (user) onUserUpdate({ ...user, balance: walletData.balance });
    } catch (error: any) {
      onToast("error", error?.response?.data?.message || "Failed to load customer dashboard");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const scanProduct = async () => {
    if (!uid.trim()) return;
    try {
      await api.post("/scan", { uid });
      setLastScannedUid(uid.toUpperCase().trim());
      setNotice(`Scanned UID: ${uid.toUpperCase().trim()}`);
      setUid("");
      await loadData();
      onToast("success", "Item added to cart");
    } catch (error: any) {
      setNotice(error?.response?.data?.message || "Scan failed");
      onToast("error", error?.response?.data?.message || "Scan failed");
    }
  };

  const addMoney = async () => {
    try {
      const { data } = await api.post<{ balance: number }>("/wallet/add", { amount });
      setWallet(data.balance);
      if (user) onUserUpdate({ ...user, balance: data.balance });
      onToast("success", "Wallet updated");
    } catch (error: any) {
      onToast("error", error?.response?.data?.message || "Failed to add money");
    }
  };

  const payNow = async () => {
    try {
      setIsPaying(true);
      const { data } = await api.post<{ billId: string; balance: number }>("/pay");
      setNotice(`Payment success: ${data.billId}. WhatsApp bill triggered.`);
      setWallet(data.balance);
      if (user) onUserUpdate({ ...user, balance: data.balance });
      await loadData();
      onToast("success", "Payment successful");
    } catch (error: any) {
      onToast("error", error?.response?.data?.message || "Payment failed");
    } finally {
      setIsPaying(false);
    }
  };

  const removeItem = async (productUid: string) => {
    try {
      const { data } = await api.delete<{ cart: CartResponse }>(`/cart/${productUid}`);
      setCart(data.cart);
      onToast("info", "Item removed");
    } catch (error: any) {
      onToast("error", error?.response?.data?.message || "Failed to remove item");
    }
  };

  const resetCart = async () => {
    try {
      await api.delete("/cart");
      setCart({ items: [], total: 0 });
      setShowResetConfirm(false);
      onToast("info", "Cart reset");
    } catch (error: any) {
      onToast("error", error?.response?.data?.message || "Failed to reset cart");
    }
  };

  return (
    <>
      <header className={`${card} mb-6 flex flex-wrap items-center justify-between gap-4 p-5`}>
        <div>
          <p className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-indigo-300">
            <UserCircle2 size={14} /> Customer Dashboard
          </p>
          <h1 className="mt-1 text-2xl font-semibold md:text-3xl">Smart RFID Billing</h1>
          <p className="text-sm text-slate-300">Hello {user?.name}</p>
        </div>
        <div className="flex flex-wrap gap-2 text-sm">
          <NavButton to="/customer-dashboard" icon={<ScanLine size={16} />} label="Cart" />
          <button
            type="button"
            onClick={onLogout}
            className="inline-flex items-center gap-2 rounded-xl border border-rose-300/30 bg-rose-500/10 px-4 py-2 text-rose-100"
          >
            Logout
          </button>
        </div>
      </header>

      <section className={`${card} mb-6 flex flex-wrap items-center justify-between gap-3 p-4`}>
        <p className="text-sm text-slate-200">{notice}</p>
        <div className="flex flex-wrap gap-2">
          <Metric label="Items" value={String(itemCount)} />
          <Metric label="Cart Total" value={`Rs ${cart.total}`} />
          <Metric label="Wallet" value={`Rs ${wallet}`} className="border-indigo-300/40 bg-indigo-500/10" />
        </div>
      </section>

      <section className="mb-6 grid gap-4 md:grid-cols-3">
        <div className={`${card} p-4 md:col-span-2`}>
          <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
            <ScanLine size={16} /> Scan RFID
          </h2>
          <div className="flex gap-2">
            <input
              value={uid}
              onChange={(e) => setUid(e.target.value)}
              placeholder="Enter UID (e.g. FE5783B9)"
              className="w-full rounded-xl border border-white/20 bg-white/5 px-4 py-2 outline-none focus:border-indigo-300"
            />
            <button
              type="button"
              onClick={scanProduct}
              className="rounded-xl bg-gradient-to-r from-indigo-500 to-emerald-500 px-5 py-2 font-semibold"
            >
              Scan
            </button>
          </div>
          <p className="mt-2 text-xs text-slate-400">Last scanned: {lastScannedUid || "N/A"}</p>
        </div>

        <div className={`${card} p-4`}>
          <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
            <Wallet size={16} /> Add Money
          </h2>
          <div className="flex gap-2">
            <input
              type="number"
              min={1}
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="w-full rounded-xl border border-white/20 bg-white/5 px-3 py-2"
            />
            <button
              type="button"
              onClick={addMoney}
              className="rounded-xl border border-emerald-300/40 bg-emerald-500/15 px-4 py-2 text-emerald-100"
            >
              Add
            </button>
          </div>
        </div>
      </section>

      <AnimatePresence mode="wait">
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.25 }}
          className="space-y-6"
        >
          <div className={`${card} overflow-hidden`}>
            <div className="flex items-center justify-between border-b border-white/10 p-4">
              <h2 className="text-lg font-semibold">Current Cart</h2>
              <button
                type="button"
                onClick={() => setShowResetConfirm(true)}
                className="inline-flex items-center gap-2 rounded-xl border border-rose-300/30 bg-rose-500/10 px-4 py-2 text-rose-100"
              >
                <RotateCcw size={16} />
                Reset Cart
              </button>
            </div>
            {isLoading ? (
              <div className="p-5 text-slate-300">Loading cart...</div>
            ) : !cart.items.length ? (
              <div className="p-6 text-slate-300">Cart is empty. Start scanning items.</div>
            ) : (
              <table className="w-full text-left text-sm">
                <thead className="bg-white/5 text-slate-300">
                  <tr>
                    <th className="px-4 py-3">Product</th>
                    <th className="px-4 py-3">UID</th>
                    <th className="px-4 py-3">Qty</th>
                    <th className="px-4 py-3">Price</th>
                    <th className="px-4 py-3">Line Total</th>
                    <th className="px-4 py-3">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {cart.items.map((item) => (
                    <tr
                      key={item.uid}
                      className={`border-t border-white/10 ${
                        lastScannedUid === item.uid ? "bg-emerald-400/10" : "hover:bg-white/5"
                      }`}
                    >
                      <td className="px-4 py-3">{item.name}</td>
                      <td className="px-4 py-3 text-slate-300">{item.uid}</td>
                      <td className="px-4 py-3">{item.quantity}</td>
                      <td className="px-4 py-3">Rs {item.price}</td>
                      <td className="px-4 py-3">Rs {item.lineTotal}</td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => removeItem(item.uid)}
                          className="rounded-lg border border-rose-300/30 bg-rose-500/10 px-3 py-1 text-rose-100"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className={`${card} p-5`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-300">Wallet payment gateway</p>
                <h2 className="mt-1 text-2xl font-semibold">Pay securely</h2>
              </div>
              <p className="text-3xl font-bold text-amber-300">Rs {cart.total}</p>
            </div>
            <button
              type="button"
              onClick={payNow}
              disabled={!cart.items.length || isPaying}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-emerald-500 px-6 py-3 font-semibold text-white disabled:opacity-40"
            >
              <IndianRupee size={18} />
              {isPaying ? "Processing..." : "Pay Now"}
            </button>
          </div>

          <div className={`${card} p-5`}>
            <h2 className="mb-3 flex items-center gap-2 text-xl font-semibold">
              <ReceiptText size={18} /> My Bills
            </h2>
            <div className="space-y-2">
              {bills.map((bill) => (
                <div key={bill.billId} className="rounded-xl border border-white/10 bg-white/5 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-medium">{bill.billId}</span>
                    <span className="text-sm text-slate-300">
                      {new Date(bill.createdAt).toLocaleDateString()}{" "}
                      {new Date(bill.createdAt).toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="mt-1 flex justify-between">
                    <span className="text-sm text-slate-400">{bill.items.length} items</span>
                    <span className="font-semibold">Rs {bill.total}</span>
                  </div>
                </div>
              ))}
              {!bills.length && <p className="text-slate-300">No personal bills yet.</p>}
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      <AnimatePresence>
        {showResetConfirm && (
          <ConfirmModal
            title="Reset current cart?"
            description="This will clear your cart and release item quantities."
            onCancel={() => setShowResetConfirm(false)}
            onConfirm={resetCart}
          />
        )}
      </AnimatePresence>
    </>
  );
}

function ConfirmModal({
  title,
  description,
  onCancel,
  onConfirm,
}: {
  title: string;
  description: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-30 flex items-center justify-center bg-black/60 p-4"
    >
      <motion.div
        initial={{ y: 16, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 10, opacity: 0 }}
        className="w-full max-w-md rounded-2xl border border-white/10 bg-[#111827] p-6"
      >
        <div className="mb-4 flex items-start justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="text-amber-300" size={20} />
            <h3 className="text-lg font-semibold">{title}</h3>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg p-1 text-slate-300 transition hover:bg-white/10"
          >
            <X size={16} />
          </button>
        </div>
        <p className="text-sm text-slate-300">{description}</p>
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl border border-white/20 px-4 py-2 text-sm"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-xl bg-rose-500 px-4 py-2 text-sm font-semibold text-white"
          >
            Yes, Reset
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function ToastStack({
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

export default App;
