import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import type { User, Role } from "../types";

export function Guard({
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
