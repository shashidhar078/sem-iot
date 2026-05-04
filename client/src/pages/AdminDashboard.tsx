import { useEffect, useState } from "react";
import { ShieldCheck, Package, ReceiptText } from "lucide-react";
import type { User, Product, Bill, Toast } from "../types";
import { api } from "../api";
import { card, Metric } from "../components/common";

export function AdminDashboard({
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
  const [expandedBillId, setExpandedBillId] = useState<string | null>(null);
  const [edits, setEdits] = useState<
    Record<string, { price: number; quantity: number }>
  >({});

  const loadData = async (isPolling = false) => {
    if (!isPolling) setLoading(true);
    try {
      const productRes = await api.get<Product[]>("/products");
      const billRes = await api.get<Bill[]>("/bills");

      setProducts(productRes.data);
      setBills(billRes.data);
      setEdits((prev) => {
        const nextEdits = { ...prev };
        productRes.data.forEach((product) => {
          if (!nextEdits[product.uid]) {
            nextEdits[product.uid] = {
              price: product.price,
              quantity: product.quantity,
            };
          }
        });
        return nextEdits;
      });
    } catch (error: any) {
      if (!isPolling) {
        onToast(
          "error",
          error?.response?.data?.message || "Failed to load admin data",
        );
      }
    } finally {
      if (!isPolling) setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(() => loadData(true), 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6">
      <header
        className={`${card} flex flex-wrap items-center justify-between gap-4 p-5`}
      >
        <div>
          <p className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-indigo-300">
            <ShieldCheck size={14} /> Admin Console
          </p>
          <h1 className="mt-1 text-2xl font-semibold md:text-3xl">
            Inventory + Bills
          </h1>
          <p className="text-sm text-slate-300">Signed in as {user?.name}</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => loadData()}
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
            <div className="hidden md:grid md:grid-cols-6 gap-2 px-3 py-2 text-xs uppercase text-slate-400">
              <div>Name</div>
              <div>UID</div>
              <div>Price</div>
              <div>Quantity</div>
              <div>Status</div>
              <div>Action</div>
            </div>
            {products.map((product) => (
              <div
                key={product.uid}
                className={`grid grid-cols-2 md:grid-cols-6 gap-2 items-center rounded-xl border p-3 ${
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
                        quantity:
                          prev[product.uid]?.quantity ?? product.quantity,
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
                <div
                  className={
                    product.quantity < 10 ? "text-rose-200" : "text-emerald-200"
                  }
                >
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
                      await loadData(false);
                    } catch (error: any) {
                      onToast(
                        "error",
                        error?.response?.data?.message || "Update failed",
                      );
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
            <div
              key={bill.billId}
              onClick={() => setExpandedBillId(prev => prev === bill.billId ? null : bill.billId)}
              className="cursor-pointer rounded-xl border border-white/10 bg-white/5 p-4 transition hover:bg-white/10"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium">{bill.billId}</p>
                <p className="text-sm text-slate-300">
                  {new Date(bill.createdAt).toLocaleString()}
                </p>
              </div>
              <div className="mt-1 flex items-center justify-between">
                <p className="text-sm text-slate-300">
                  {bill.customerName} ({bill.customerPhone})
                </p>
                <p className="font-bold text-amber-200">Rs {bill.total}</p>
              </div>

              {expandedBillId === bill.billId && (
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
              )}
            </div>
          ))}
          {!bills.length && <p className="text-slate-300">No bills yet.</p>}
        </div>
      </section>
    </div>
  );
}
