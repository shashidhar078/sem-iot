import axios from "axios";

export const api = axios.create({
  baseURL: "/api",
});

api.interceptors.request.use((config) => {
  const user = localStorage.getItem("esiot_user");

  if (user) {
    const parsed = JSON.parse(user);
    config.headers["x-user-id"] = parsed.id;
  }

  return config;
});
