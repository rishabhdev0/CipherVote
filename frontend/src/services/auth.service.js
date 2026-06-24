import api from "./api";
export const authService = {
  csrf: () => api.get("/auth/csrf"),
  register: (d) => api.post("/auth/register", d),
  getWalletNonce: (walletAddress) =>
    api.post("/auth/wallet/nonce", { walletAddress }),
  loginWallet: (walletAddress, message, signature) =>
    api.post("/auth/login/wallet", { walletAddress, message, signature }),
  loginEmail: (email, password) =>
    api.post("/auth/login/email", { email, password }),
  verifyOTP: (code, type) => api.post("/auth/otp/verify", { code, type }),
  resendOTP: (type, channel) => api.post("/auth/otp/resend", { type, channel }),
  refreshToken: (r) => api.post("/auth/token/refresh", { refreshToken: r }),
  logout: () => api.post("/auth/logout"),
  getMe: () => api.get("/auth/me"),
};
