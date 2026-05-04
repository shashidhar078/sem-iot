import { useState, useMemo, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { UserCircle2, ScanLine, Wallet, ReceiptText, IndianRupee, RotateCcw } from "lucide-react";
import type { User, CartResponse, Bill, Toast } from "../types";
import { api } from "../api";
import { card, NavButton, Metric } from "../components/common";
import { ConfirmModal } from "../components/ConfirmModal";

export function CustomerDashboard({
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
  const [expandedBillId, setExpandedBillId] = useState<string | null>(null);
  const location = useLocation();

  const itemCount = useMemo(
    () => cart.items.reduce((sum, item) => sum + item.quantity, 0),
    [cart.items],
  );

  const loadData = async (isPolling = false) => {
    if (!isPolling) setIsLoading(true);
    try {
      const [{ data: cartData }, { data: billData }, { data: walletData }] =
        await Promise.all([
          api.get<CartResponse>("/cart"),
          api.get<Bill[]>("/my-bills"),
          api.get<{ balance: number }>("/wallet"),
        ]);
      setCart(cartData);
      setBills(billData);
      setWallet(walletData.balance);
      if (user) onUserUpdate({ ...user, balance: walletData.balance });
    } catch (error: any) {
      if (!isPolling) {
        onToast(
          "error",
          error?.response?.data?.message || "Failed to load customer dashboard",
        );
      }
    } finally {
      if (!isPolling) setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(() => loadData(true), 2000);
    return () => clearInterval(interval);
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
      const { data } = await api.post<{ balance: number }>("/wallet/add", {
        amount,
      });
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
      const { data } = await api.post<{ billId: string; balance: number }>(
        "/pay",
      );
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
      const { data } = await api.delete<{ cart: CartResponse }>(
        `/cart/${productUid}`,
      );
      setCart(data.cart);
      onToast("info", "Item removed");
    } catch (error: any) {
      onToast(
        "error",
        error?.response?.data?.message || "Failed to remove item",
      );
    }
  };

  const resetCart = async () => {
    try {
      await api.delete("/cart");
      setCart({ items: [], total: 0 });
      setShowResetConfirm(false);
      onToast("info", "Cart reset");
    } catch (error: any) {
      onToast(
        "error",
        error?.response?.data?.message || "Failed to reset cart",
      );
    }
  };

  return (
    <>
      <header
        className={`${card} mb-6 flex flex-wrap items-center justify-between gap-4 p-5`}
      >
        <div>
          <p className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-indigo-300">
            <UserCircle2 size={14} /> Customer Dashboard
          </p>
          <h1 className="mt-1 text-2xl font-semibold md:text-3xl">
            Smart RFID Billing
          </h1>
          <p className="text-sm text-slate-300">Hello {user?.name}</p>
        </div>
        <div className="flex flex-wrap gap-2 text-sm">
          <NavButton
            to="/customer-dashboard"
            icon={<ScanLine size={16} />}
            label="Cart"
          />
          <button
            type="button"
            onClick={onLogout}
            className="inline-flex items-center gap-2 rounded-xl border border-rose-300/30 bg-rose-500/10 px-4 py-2 text-rose-100"
          >
            Logout
          </button>
        </div>
      </header>

      <section
        className={`${card} mb-6 flex flex-wrap items-center justify-between gap-3 p-4`}
      >
        <p className="text-sm text-slate-200">{notice}</p>
        <div className="flex flex-wrap gap-2">
          <Metric label="Items" value={String(itemCount)} />
          <Metric label="Cart Total" value={`Rs ${cart.total}`} />
          <Metric
            label="Wallet"
            value={`Rs ${wallet}`}
            className="border-indigo-300/40 bg-indigo-500/10"
          />
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
          <p className="mt-2 text-xs text-slate-400">
            Last scanned: {lastScannedUid || "N/A"}
          </p>
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
              <div className="p-6 text-slate-300">
                Cart is empty. Start scanning items.
              </div>
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
                        lastScannedUid === item.uid
                          ? "bg-emerald-400/10"
                          : "hover:bg-white/5"
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
              <p className="text-3xl font-bold text-amber-300">
                Rs {cart.total}
              </p>
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
                <div
                  key={bill.billId}
                  onClick={() => setExpandedBillId(prev => prev === bill.billId ? null : bill.billId)}
                  className="cursor-pointer rounded-xl border border-white/10 bg-white/5 p-4 transition hover:bg-white/10"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-medium">{bill.billId}</span>
                    <span className="text-sm text-slate-300">
                      {new Date(bill.createdAt).toLocaleDateString()}{" "}
                      {new Date(bill.createdAt).toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="mt-1 flex justify-between">
                    <span className="text-sm text-slate-400">
                      {bill.items.length} items
                    </span>
                    <span className="font-semibold">Rs {bill.total}</span>
                  </div>
                  
                  <AnimatePresence>
                    {expandedBillId === bill.billId && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="mt-4 border-t border-white/10 pt-4 text-sm">
                          <p className="mb-2 font-medium text-slate-200">Purchased Items:</p>
                          <div className="space-y-2">
                            {bill.items.map((item, idx) => (
                              <div key={idx} className="flex justify-between text-slate-300">
                                <span>{item.quantity}x {item.name}</span>
                                <span>Rs {item.lineTotal}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
              {!bills.length && (
                <p className="text-slate-300">No personal bills yet.</p>
              )}
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
