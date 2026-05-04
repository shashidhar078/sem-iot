export type Role = "admin" | "customer";

export type User = {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: Role;
  balance: number;
};

export type CartItem = {
  uid: string;
  name: string;
  price: number;
  quantity: number;
  lineTotal: number;
};

export type CartResponse = {
  items: CartItem[];
  total: number;
};

export type Bill = {
  billId: string;
  customerName: string;
  customerPhone: string;
  items: CartItem[];
  total: number;
  createdAt: string;
};

export type Product = {
  uid: string;
  name: string;
  price: number;
  quantity: number;
  category: string;
  status?: string;
};

export type Toast = {
  id: number;
  kind: "success" | "error" | "info";
  message: string;
};
