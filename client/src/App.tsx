import { useEffect, useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import type { User, Toast } from "./types";
import { api } from "./api";
import { ToastStack } from "./components/ToastStack";
import { Guard } from "./components/Guard";
import { LoginPage } from "./pages/LoginPage";
import { AdminDashboard } from "./pages/AdminDashboard";
import { CustomerDashboard } from "./pages/CustomerDashboard";

function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const stored = localStorage.getItem("esiot_user");
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  
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
      api.defaults.headers.common["x-user-id"] = parsed.id;
      api.post("/set-active-user", { userId: parsed.id });
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
          onDismiss={(id) =>
            setToasts((prev) => prev.filter((toast) => toast.id !== id))
          }
        />
      </main>
    </div>
  );
}

export default App;
