import axios from "axios";
import { API_URL } from "../utils/constants";

const api = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

let csrfToken = null,
  csrfPromise = null;

const unsafe = (m) =>
  ["post", "put", "patch", "delete"].includes((m || "get").toLowerCase());

const loadCsrf = async () => {
  if (csrfToken) return csrfToken;
  if (!csrfPromise)
    csrfPromise = axios
      .get(`${API_URL}/auth/csrf`, { withCredentials: true })
      .then((r) => {
        csrfToken = r.data.data.csrfToken;
        return csrfToken;
      })
      .finally(() => {
        csrfPromise = null;
      });
  return csrfPromise;
};

api.interceptors.request.use(async (config) => {
  if (unsafe(config.method)) config.headers["X-CSRF-Token"] = await loadCsrf();
  return config;
});

api.interceptors.response.use(
  (r) => r,
  async (err) => {
    const orig = err.config || {};
    if (
      err.response?.status === 403 &&
      err.response?.data?.message === "CSRF validation failed" &&
      !orig._csrfRetry
    ) {
      orig._csrfRetry = true;
      csrfToken = null;
      orig.headers = orig.headers || {};
      orig.headers["X-CSRF-Token"] = await loadCsrf();
      return api(orig);
    }
    if (err.response?.status === 401 && !orig._retry) {
      orig._retry = true;
      try {
        await axios.post(
          `${API_URL}/auth/token/refresh`,
          {},
          {
            withCredentials: true,
            headers: { "X-CSRF-Token": await loadCsrf() },
          },
        );
        return api(orig);
      } catch {
        const p = window.location.pathname;
        if (p !== "/login" && p !== "/register" && p !== "/")
          window.location.href = "/login";
      }
    }
    return Promise.reject(err);
  },
);
export default api;
