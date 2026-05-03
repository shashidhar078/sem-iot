import { AnimatePresence, motion } from 'framer-motion'
import axios from 'axios'
import { AlertTriangle, ReceiptText, RotateCcw, ScanLine, Sparkles, Wallet, X } from 'lucide-react'
import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react'
import { Link, Route, Routes, useLocation, useNavigate } from 'react-router-dom'

type CartItem = {
  uid: string
  name: string
  price: number
  quantity: number
  lineTotal: number
}

type CartResponse = {
  items: CartItem[]
  total: number
}

type BillResponse = {
  billId: string
  items: CartItem[]
  total: number
  createdAt: string
}

type Toast = {
  id: number
  kind: 'success' | 'error' | 'info'
  message: string
}

const api = axios.create({
  baseURL: '/api',
})

const card = 'rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-xl'

function App() {
  const [cart, setCart] = useState<CartResponse>({ items: [], total: 0 })
  const [latestBillId, setLatestBillId] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isPaying, setIsPaying] = useState(false)
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const [notice, setNotice] = useState('Waiting for RFID scans...')
  const [lastScannedUid, setLastScannedUid] = useState('')
  const [toasts, setToasts] = useState<Toast[]>([])
  const previousItemsRef = useRef<CartItem[]>([])
  const backendErrorNotifiedRef = useRef(false)
  const location = useLocation()

  const pushToast = (kind: Toast['kind'], message: string) => {
    const id = Date.now() + Math.floor(Math.random() * 1000)
    setToasts((prev) => [...prev, { id, kind, message }])
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id))
    }, 3200)
  }

  useEffect(() => {
    const loadCart = async () => {
      try {
        const { data } = await api.get<CartResponse>('/cart')
        const previousItems = previousItemsRef.current
        const previousTotalItems = previousItems.reduce((sum, item) => sum + item.quantity, 0)
        const nextTotalItems = data.items.reduce((sum, item) => sum + item.quantity, 0)
        if (nextTotalItems > previousTotalItems) {
          const previousMap = new Map(previousItems.map((item) => [item.uid, item.quantity]))
          const updated = data.items.find((item) => (previousMap.get(item.uid) || 0) < item.quantity)
          if (updated) {
            setLastScannedUid(updated.uid)
            setNotice(`Scanned: ${updated.name} (${updated.uid})`)
            pushToast('success', `${updated.name} added to cart`)
          }
        }
        previousItemsRef.current = data.items
        backendErrorNotifiedRef.current = false
        setCart(data)
      } catch {
        setNotice('Backend unreachable. Start server on port 5000.')
        if (!backendErrorNotifiedRef.current) {
          pushToast('error', 'Could not connect to backend')
          backendErrorNotifiedRef.current = true
        }
      } finally {
        setIsLoading(false)
      }
    }

    loadCart()
    const id = window.setInterval(loadCart, 2000)
    return () => window.clearInterval(id)
  }, [])

  const itemCount = useMemo(
    () => cart.items.reduce((acc, item) => acc + item.quantity, 0),
    [cart.items],
  )

  const payNow = async () => {
    try {
      setIsPaying(true)
      const { data } = await api.post<{ billId: string }>('/pay')
      setLatestBillId(data.billId)
      setNotice(`Payment successful: ${data.billId}`)
      const next = await api.get<CartResponse>('/cart')
      setCart(next.data)
      pushToast('success', 'Payment successful and invoice generated')
      return data.billId
    } catch {
      pushToast('error', 'Payment failed. Please retry.')
      throw new Error('Payment failed')
    } finally {
      setIsPaying(false)
    }
  }

  const resetCart = async () => {
    try {
      await api.delete('/cart')
      setCart({ items: [], total: 0 })
      setShowResetConfirm(false)
      setNotice('Cart reset successfully')
      pushToast('info', 'Cart was reset')
    } catch {
      pushToast('error', 'Unable to reset cart')
    }
  }

  return (
    <div className="min-h-screen bg-[#070b14] text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(99,102,241,0.35),transparent_35%),radial-gradient(circle_at_80%_0%,rgba(16,185,129,0.25),transparent_30%),radial-gradient(circle_at_50%_100%,rgba(245,158,11,0.2),transparent_35%)]" />
      <main className="relative mx-auto max-w-6xl p-6 md:p-10">
        <header className={`${card} mb-6 flex flex-wrap items-center justify-between gap-4 p-5`}>
          <div>
            <p className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-indigo-300">
              <Sparkles size={14} /> ESIOT Premium Console
            </p>
            <h1 className="mt-1 text-2xl font-semibold md:text-3xl">Smart RFID Billing</h1>
          </div>
          <div className="flex flex-wrap gap-2 text-sm">
            <NavButton to="/" icon={<ScanLine size={16} />} label="Cart" />
            <NavButton to="/payment" icon={<Wallet size={16} />} label="Payment" />
            <NavButton to={`/bill/${latestBillId || 'latest'}`} icon={<ReceiptText size={16} />} label="Bill" />
            <button
              type="button"
              onClick={() => setShowResetConfirm(true)}
              className="inline-flex items-center gap-2 rounded-xl border border-rose-300/30 bg-rose-500/10 px-4 py-2 text-rose-100 transition hover:border-rose-300/60 hover:bg-rose-500/20"
            >
              <RotateCcw size={16} />
              Reset Cart
            </button>
          </div>
        </header>

        <section className={`${card} mb-6 flex flex-wrap items-center justify-between gap-3 p-4`}>
          <p className="text-sm text-slate-200">{notice}</p>
          <div className="flex gap-2">
            <Metric label="Items" value={itemCount.toString()} />
            <Metric label="Total" value={`Rs ${cart.total}`} />
          </div>
        </section>

        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.25 }}
          >
            <Routes>
              <Route
                path="/"
                element={<CartPage cart={cart} isLoading={isLoading} lastScannedUid={lastScannedUid} />}
              />
              <Route
                path="/payment"
                element={
                  <PaymentPage
                    cart={cart}
                    isPaying={isPaying}
                    onPay={payNow}
                    onSuccess={(billId) => setLatestBillId(billId)}
                  />
                }
              />
              <Route
                path="/bill/:id"
                element={<BillPage fallbackBillId={latestBillId} />}
              />
            </Routes>
          </motion.div>
        </AnimatePresence>

        <AnimatePresence>
          {showResetConfirm && (
            <ConfirmModal
              title="Reset current cart?"
              description="This will remove all items from the live cart. This action is used for demo recovery."
              onCancel={() => setShowResetConfirm(false)}
              onConfirm={resetCart}
            />
          )}
        </AnimatePresence>

        <ToastStack toasts={toasts} onDismiss={(id) => setToasts((prev) => prev.filter((toast) => toast.id !== id))} />
      </main>
    </div>
  )
}

function NavButton({
  to,
  label,
  icon,
}: {
  to: string
  label: string
  icon: ReactNode
}) {
  return (
    <Link
      to={to}
      className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-slate-100 transition hover:border-indigo-300/50 hover:bg-indigo-400/20"
    >
      {icon}
      {label}
    </Link>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-2">
      <p className="text-xs uppercase text-emerald-300">{label}</p>
      <p className="font-semibold">{value}</p>
    </div>
  )
}

function CartPage({
  cart,
  isLoading,
  lastScannedUid,
}: {
  cart: CartResponse
  isLoading: boolean
  lastScannedUid: string
}) {
  if (isLoading) {
    return <div className={`${card} p-6 text-center text-slate-300`}>Loading cart...</div>
  }

  if (!cart.items.length) {
    return (
      <div className={`${card} p-10 text-center text-slate-300`}>
        <p className="text-xl font-medium text-white">Cart is empty</p>
        <p className="mt-2 text-sm">Scan RFID tags to populate products in real time.</p>
      </div>
    )
  }

  return (
    <div className={`${card} overflow-hidden`}>
      <table className="w-full text-left text-sm">
        <thead className="bg-white/5 text-slate-300">
          <tr>
            <th className="px-4 py-3">Product</th>
            <th className="px-4 py-3">UID</th>
            <th className="px-4 py-3">Qty</th>
            <th className="px-4 py-3">Price</th>
            <th className="px-4 py-3">Line Total</th>
          </tr>
        </thead>
        <tbody>
          {cart.items.map((item) => (
            <tr
              key={item.uid}
              className={`border-t border-white/10 transition hover:bg-white/5 ${
                lastScannedUid === item.uid ? 'bg-emerald-400/10' : ''
              }`}
            >
              <td className="px-4 py-3 font-medium">{item.name}</td>
              <td className="px-4 py-3 text-slate-300">{item.uid}</td>
              <td className="px-4 py-3">{item.quantity}</td>
              <td className="px-4 py-3">Rs {item.price}</td>
              <td className="px-4 py-3">Rs {item.lineTotal}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function PaymentPage({
  cart,
  isPaying,
  onPay,
  onSuccess,
}: {
  cart: CartResponse
  isPaying: boolean
  onPay: () => Promise<string>
  onSuccess: (id: string) => void
}) {
  const navigate = useNavigate()

  const handlePay = async () => {
    if (!cart.items.length || isPaying) return
    try {
      const billId = await onPay()
      onSuccess(billId)
      navigate(`/bill/${billId}`)
    } catch {
      // Toast feedback is already handled in parent onPay.
    }
  }

  return (
    <div className={`${card} p-6`}>
      <p className="text-sm text-slate-300">Mock payment gateway</p>
      <h2 className="mt-1 text-2xl font-semibold">Complete your purchase</h2>
      <p className="mt-3 text-slate-300">Items: {cart.items.length}</p>
      <p className="mb-6 text-3xl font-bold text-amber-300">Rs {cart.total}</p>
      <button
        type="button"
        onClick={handlePay}
        disabled={!cart.items.length || isPaying}
        className="rounded-xl bg-gradient-to-r from-indigo-500 to-emerald-500 px-6 py-3 font-semibold text-white shadow-lg shadow-emerald-800/40 transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {isPaying ? 'Processing payment...' : 'Pay Now'}
      </button>
    </div>
  )
}

function BillPage({ fallbackBillId }: { fallbackBillId: string }) {
  const location = useLocation()
  const billId = location.pathname.split('/').pop() || fallbackBillId
  const [bill, setBill] = useState<BillResponse | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchBill = async () => {
      if (!billId || billId === 'latest') return
      try {
        const { data } = await api.get<BillResponse>(`/bill/${billId}`)
        setBill(data)
      } catch {
        setError('Bill not available yet. Complete payment first.')
      }
    }
    fetchBill()
  }, [billId])

  if (error) {
    return <div className={`${card} p-6 text-rose-200`}>{error}</div>
  }

  if (!bill) {
    return <div className={`${card} p-6 text-slate-300`}>Waiting for payment receipt...</div>
  }

  return (
    <div className={`${card} p-6`}>
      <h2 className="text-2xl font-semibold">Invoice {bill.billId}</h2>
      <p className="mb-4 text-sm text-slate-300">
        Generated at {new Date(bill.createdAt).toLocaleString()}
      </p>
      <div className="space-y-2">
        {bill.items.map((item) => (
          <div key={item.uid} className="flex justify-between rounded-lg bg-white/5 px-4 py-3">
            <span>{item.name} x {item.quantity}</span>
            <span>Rs {item.lineTotal}</span>
          </div>
        ))}
      </div>
      <div className="mt-4 flex justify-between border-t border-white/10 pt-4 text-lg font-semibold">
        <span>Total</span>
        <span>Rs {bill.total}</span>
      </div>
    </div>
  )
}

function ConfirmModal({
  title,
  description,
  onCancel,
  onConfirm,
}: {
  title: string
  description: string
  onCancel: () => void
  onConfirm: () => void
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
  )
}

function ToastStack({
  toasts,
  onDismiss,
}: {
  toasts: Toast[]
  onDismiss: (id: number) => void
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
              toast.kind === 'success'
                ? 'border-emerald-300/30 bg-emerald-500/20 text-emerald-100'
                : toast.kind === 'error'
                  ? 'border-rose-300/30 bg-rose-500/20 text-rose-100'
                  : 'border-indigo-300/30 bg-indigo-500/20 text-indigo-100'
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
  )
}

export default App
