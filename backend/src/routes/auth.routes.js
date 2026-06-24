const r = require("express").Router();
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const { ethers } = require("ethers");
const prisma = require("../config/database");
const {
  generateAccessToken,
  generateRefreshToken,
  verifyRefresh,
} = require("../services/jwt.service");
const { success, badRequest, unauthorized, conflict } = require("../utils/response");
const { generateOTP, getClientIP } = require("../utils/helpers");
const { issueCsrf } = require("../middleware/security.middleware");
const { authenticate } = require("../middleware/auth.middleware");
const {
  setAuthCookies,
  clearAuthCookies,
  parseCookies,
} = require("../utils/cookies");
const { runtimeConfig } = require("../config/env");
const { sendOtpEmail } = require("../services/notification.service");
const audit = require("../services/audit.service");
const {
  validateAuthRegister,
} = require("../middleware/input-validation.middleware");

const TOKEN_DAYS = 7,
  LOCK_MAX = 5,
  LOCK_MINUTES = 15;
const sha = (v) => crypto.createHash("sha256").update(String(v)).digest("hex");
const normWallet = (w) => (w ? ethers.getAddress(w) : null);
const addMinutes = (m) => new Date(Date.now() + m * 60000);
const addDays = (d) => new Date(Date.now() + d * 86400000);
const publicUser = (u) => ({
  id: u.id,
  email: u.email,
  role: u.role,
  walletAddress: u.walletAddress,
});

async function issueTokens(user, req) {
  const payload = { userId: user.id, role: user.role };
  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);
  await prisma.refreshSession.create({
    data: {
      userId: user.id,
      tokenHash: sha(refreshToken),
      userAgent: req.headers["user-agent"],
      ipAddress: getClientIP(req),
      expiresAt: addDays(TOKEN_DAYS),
    },
  });
  return { accessToken, refreshToken };
}

function sendAuth(res, data, message = "Success", code = 200) {
  if (data.tokens) setAuthCookies(res, data.tokens);
  return success(res, data, message, code);
}

async function createOtp(userId, purpose = "REGISTRATION", channel = "EMAIL") {
  const otp =
    process.env.NODE_ENV === "development" && process.env.DEV_OTP
      ? process.env.DEV_OTP
      : generateOTP(6);
  const expiresMinutes = Number(process.env.OTP_EXPIRY_MINUTES || 10);
  await prisma.otpChallenge.updateMany({
    where: { userId, purpose, usedAt: null },
    data: { usedAt: new Date() },
  });
  await prisma.otpChallenge.create({
    data: {
      userId,
      purpose,
      channel,
      otpHash: await bcrypt.hash(otp, 10),
      expiresAt: addMinutes(expiresMinutes),
    },
  });
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (channel === "EMAIL" && user?.email)
    await sendOtpEmail({ to: user.email, otp, purpose, expiresMinutes });
  return otp;
}

async function consumeOtp(userId, purpose, code) {
  const challenge = await prisma.otpChallenge.findFirst({
    where: { userId, purpose, usedAt: null },
    orderBy: { createdAt: "desc" },
  });
  if (!challenge) return { ok: false, message: "OTP not found" };
  if (challenge.expiresAt < new Date())
    return { ok: false, message: "OTP expired" };
  if (challenge.attempts >= challenge.maxAttempts)
    return { ok: false, message: "Too many OTP attempts" };
  const ok = await bcrypt.compare(String(code || ""), challenge.otpHash);
  await prisma.otpChallenge.update({
    where: { id: challenge.id },
    data: { attempts: { increment: 1 }, usedAt: ok ? new Date() : undefined },
  });
  return ok ? { ok: true } : { ok: false, message: "Invalid OTP" };
}

r.get("/csrf", (req, res) => success(res, { csrfToken: issueCsrf(req, res) }));

r.post("/register", validateAuthRegister, async (req, res) => {
  try {
    const { email, phone, password, walletAddress, intent, role } = req.body;
    if (!walletAddress) return badRequest(res, "Wallet required");
    const wallet = normWallet(walletAddress);
    const requestedRole =
      intent === "candidate" || role === "CANDIDATE" ? "CANDIDATE" : "VOTER";
    const exists = await prisma.user.findFirst({
      where: {
        OR: [{ walletAddress: wallet }, { email: email || undefined }].filter(
          Boolean,
        ),
      },
    });
    if (exists) return badRequest(res, "Already registered");
    const hash = password
      ? await bcrypt.hash(password, Number(process.env.BCRYPT_ROUNDS || 10))
      : null;
    const user = await prisma.user.create({
      data: {
        email: email || undefined,
        phone: phone || undefined,
        passwordHash: hash,
        walletAddress: wallet,
        role: requestedRole,
        isEmailVerified: false,
      },
    });
    const otp = email
      ? await createOtp(user.id, "REGISTRATION", "EMAIL")
      : null;
    const tokens = await issueTokens(user, req);
    await audit.authLog(req, "REGISTER", "User registered", {
      userId: user.id,
      walletAddress: wallet,
      role: requestedRole,
    });
    return sendAuth(
      res,
      {
        userId: user.id,
        tokens,
        devOTP: process.env.NODE_ENV === "development" ? otp : undefined,
      },
      "Registered",
      201,
    );
  } catch (e) {
    if (e.code === "P2002") {
      const field = Array.isArray(e.meta?.target)
        ? e.meta.target.join(", ")
        : "email or wallet";
      return conflict(res, `Account already exists with this ${field}`);
    }
    return badRequest(res, e.message);
  }
});

r.post("/wallet/nonce", async (req, res) => {
  try {
    const wallet = normWallet(req.body.walletAddress);
    const user = await prisma.user.findUnique({
      where: { walletAddress: wallet },
    });
    if (!user) return unauthorized(res, "Wallet not registered");
    const nonce = crypto.randomBytes(32).toString("hex");
    const message = [
      "CipherVote wallet authentication",
      `Wallet: ${wallet}`,
      `Nonce: ${nonce}`,
      `Issued At: ${new Date().toISOString()}`,
      "Sign this message to prove wallet ownership.",
    ].join("\n");
    await prisma.walletNonce.create({
      data: {
        userId: user.id,
        walletAddress: wallet,
        nonceHash: sha(nonce),
        message,
        expiresAt: addMinutes(5),
      },
    });
    await audit.log({
      userId: user.id,
      action: "WALLET_NONCE_CREATED",
      resource: "AUTH",
      description: "Wallet login nonce issued",
      ipAddress: getClientIP(req),
      metadata: { walletAddress: wallet },
    });
    return success(res, {
      walletAddress: wallet,
      message,
      expiresAt: addMinutes(5),
    });
  } catch (e) {
    return badRequest(res, e.message);
  }
});

r.post("/login/wallet", async (req, res) => {
  try {
    const wallet = normWallet(req.body.walletAddress);
    const { message, signature } = req.body;
    if (!message || !signature)
      return badRequest(res, "Message and signature required");
    const recovered = ethers.verifyMessage(message, signature);
    if (normWallet(recovered) !== wallet)
      return unauthorized(res, "Invalid wallet signature");
    const challenge = await prisma.walletNonce.findFirst({
      where: { walletAddress: wallet, message, usedAt: null },
      orderBy: { createdAt: "desc" },
    });
    if (!challenge || challenge.expiresAt < new Date())
      return unauthorized(res, "Nonce expired or already used");
    const consumed = await prisma.walletNonce.updateMany({
      where: {
        id: challenge.id,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      data: { usedAt: new Date() },
    });
    if (consumed.count !== 1)
      return unauthorized(res, "Nonce expired or already used");
    const user = await prisma.user.findUnique({
      where: { walletAddress: wallet },
    });
    if (!user) return unauthorized(res, "Not registered");
    const tokens = await issueTokens(user, req);
    await audit.log({
      userId: user.id,
      action: "WALLET_LOGIN",
      resource: "AUTH",
      description: "Wallet signature login succeeded",
      ipAddress: getClientIP(req),
      metadata: { walletAddress: wallet },
    });
    return sendAuth(res, { tokens, user: publicUser(user) });
  } catch (e) {
    return unauthorized(res, e.message || "Wallet login failed");
  }
});

r.post("/login/email", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.passwordHash)
      return unauthorized(res, "Invalid credentials");
    if (user.loginLockedUntil && user.loginLockedUntil > new Date())
      return unauthorized(res, "Account temporarily locked");
    const ok = await bcrypt.compare(password || "", user.passwordHash);
    if (!ok) {
      const next = (user.failedLoginAttempts || 0) + 1;
      await prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: next,
          loginLockedUntil: next >= LOCK_MAX ? addMinutes(LOCK_MINUTES) : null,
        },
      });
      await audit.log({
        userId: user.id,
        action: "EMAIL_LOGIN_FAILED",
        resource: "AUTH",
        description: "Email login failed",
        severity: next >= LOCK_MAX ? "HIGH" : "INFO",
        ipAddress: getClientIP(req),
        metadata: { attempts: next, locked: next >= LOCK_MAX },
      });
      return unauthorized(res, "Invalid credentials");
    }
    await prisma.user.update({
      where: { id: user.id },
      data: { failedLoginAttempts: 0, loginLockedUntil: null },
    });
    const tokens = await issueTokens(user, req);
    await audit.log({
      userId: user.id,
      action: "EMAIL_LOGIN",
      resource: "AUTH",
      description: "Email login succeeded",
      ipAddress: getClientIP(req),
    });
    return sendAuth(res, { tokens, user: publicUser(user) });
  } catch (e) {
    return badRequest(res, e.message);
  }
});

r.get("/me", authenticate, async (req, res) => {
  try {
    return success(res, {
      user: publicUser(req.user),
      voter: req.voter || null,
    });
  } catch (e) {
    return unauthorized(res, "Invalid token");
  }
});

r.post("/otp/verify", authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await consumeOtp(
      userId,
      req.body.type || "REGISTRATION",
      req.body.code,
    );
    await audit.log({
      userId,
      action: result.ok ? "OTP_VERIFIED" : "OTP_FAILED",
      resource: "AUTH",
      description: result.message || "OTP verification",
      severity: result.ok ? "INFO" : "MEDIUM",
      ipAddress: getClientIP(req),
      metadata: { purpose: req.body.type || "REGISTRATION" },
    });
    if (!result.ok) return badRequest(res, result.message);
    if ((req.body.type || "REGISTRATION") === "REGISTRATION")
      await prisma.user.update({
        where: { id: userId },
        data: { isEmailVerified: true },
      });
    return success(res, { verified: true });
  } catch (e) {
    return unauthorized(res, "Invalid token");
  }
});

r.post("/otp/resend", authenticate, async (req, res) => {
  try {
    const otp = await createOtp(
      req.user.id,
      req.body.type || "REGISTRATION",
      req.body.channel || "EMAIL",
    );
    await audit.log({
      userId: req.user.id,
      action: "OTP_RESENT",
      resource: "AUTH",
      description: "OTP resent",
      ipAddress: getClientIP(req),
      metadata: {
        purpose: req.body.type || "REGISTRATION",
        channel: req.body.channel || "EMAIL",
      },
    });
    return success(res, {
      sent: true,
      devOTP: process.env.NODE_ENV === "development" ? otp : undefined,
    });
  } catch (e) {
    return unauthorized(res);
  }
});

r.post("/logout", async (req, res) => {
  try {
    const cfg = runtimeConfig();
    const cookies = parseCookies(req);
    const refreshToken =
      (req.body || {}).refreshToken || cookies[cfg.refreshCookieName];
    if (refreshToken)
      await prisma.refreshSession.updateMany({
        where: { tokenHash: sha(refreshToken), revokedAt: null },
        data: { revokedAt: new Date() },
      });
    clearAuthCookies(res);
    return success(res, {}, "Logged out");
  } catch {
    clearAuthCookies(res);
    return success(res, {}, "Logged out");
  }
});

r.post("/token/refresh", async (req, res) => {
  try {
    const cfg = runtimeConfig();
    const cookies = parseCookies(req);
    const refreshToken =
      (req.body || {}).refreshToken || cookies[cfg.refreshCookieName];
    const d = verifyRefresh(refreshToken);
    const old = await prisma.refreshSession.findUnique({
      where: { tokenHash: sha(refreshToken) },
    });
    if (!old || old.revokedAt || old.expiresAt < new Date())
      return unauthorized(res);
    const user = await prisma.user.findUnique({
      where: { id: d.userId || d.id },
    });
    if (!user) return unauthorized(res);
    const tokens = await issueTokens(user, req);
    const replacement = await prisma.refreshSession.findUnique({
      where: { tokenHash: sha(tokens.refreshToken) },
    });
    await prisma.refreshSession.update({
      where: { id: old.id },
      data: {
        revokedAt: new Date(),
        rotatedAt: new Date(),
        replacedById: replacement?.id,
      },
    });
    return sendAuth(res, { tokens });
  } catch (e) {
    return unauthorized(res);
  }
});

module.exports = r;
