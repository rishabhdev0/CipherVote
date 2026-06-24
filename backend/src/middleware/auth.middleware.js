const { verifyAccess } = require("../services/jwt.service");
const prisma = require("../config/database");
const { parseCookies } = require("../utils/cookies");
const { runtimeConfig } = require("../config/env");

const getBearer = (req) => {
  const auth = req.headers.authorization;
  if (auth?.startsWith("Bearer ")) return auth.split(" ")[1];
  const cfg = runtimeConfig();
  return parseCookies(req)[cfg.accessCookieName];
};

const authenticate = async (req, res, next) => {
  try {
    const token = getBearer(req);
    if (!token)
      return res.status(401).json({ success: false, message: "No token" });
    const decoded = verifyAccess(token);
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId || decoded.id },
    });
    if (!user)
      return res
        .status(401)
        .json({ success: false, message: "User not found" });
    req.user = user;

    req.token = decoded;
    req.voter = await prisma.voter.findFirst({
      where: { userId: user.id },
      include: { user: true },
    });
    next();
  } catch (e) {
    return res.status(401).json({ success: false, message: "Invalid token" });
  }
};

const optionalAuthenticate = async (req, res, next) => {
  try {
    const token = getBearer(req);
    if (!token) return next();
    const decoded = verifyAccess(token);
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId || decoded.id },
    });
    if (!user) return next();
    req.user = user;
    req.token = decoded;
    req.voter = await prisma.voter.findFirst({
      where: { userId: user.id },
      include: { user: true },
    });
  } catch {}
  return next();
};

const verifiedVoterOnly = (req, res, next) => {
  const v = req.voter;
  if (!v)
    return res.status(403).json({ success: false, message: "Voter required" });
  if (v.status !== "VERIFIED")
    return res
      .status(403)
      .json({ success: false, message: "Verified voter required" });
  if (v.isBlacklisted)
    return res
      .status(403)
      .json({ success: false, message: "Voter blacklisted" });
  next();
};

const electionAdminOnly = (req, res, next) => {
  if (!["SUPER_ADMIN", "ELECTION_COMMISSION"].includes(req.user?.role))
    return res
      .status(403)
      .json({ success: false, message: "Election admin required" });
  next();
};

const fraudAdminOnly = (req, res, next) => {
  if (!["SUPER_ADMIN", "FRAUD_ANALYST"].includes(req.user?.role))
    return res
      .status(403)
      .json({ success: false, message: "Fraud admin required" });
  next();
};

const auditReadOnly = (req, res, next) => {
  if (!["SUPER_ADMIN", "AUDITOR"].includes(req.user?.role))
    return res
      .status(403)
      .json({ success: false, message: "Audit read permission required" });
  next();
};

const voterRegistryRead = (req, res, next) => {
  if (
    !["SUPER_ADMIN", "ELECTION_COMMISSION", "AUDITOR"].includes(req.user?.role)
  )
    return res
      .status(403)
      .json({
        success: false,
        message: "Voter registry read permission required",
      });
  next();
};

const roleAdminOnly = (req, res, next) => {
  if (req.user?.role !== "SUPER_ADMIN")
    return res
      .status(403)
      .json({ success: false, message: "Role admin permission required" });
  next();
};

const chainOpsOnly = (req, res, next) => {
  if (!["SUPER_ADMIN", "ELECTION_COMMISSION"].includes(req.user?.role))
    return res
      .status(403)
      .json({
        success: false,
        message: "Chain operations permission required",
      });
  next();
};

const superAdminOnly = (req, res, next) => {
  if (req.user?.role !== "SUPER_ADMIN")
    return res
      .status(403)
      .json({ success: false, message: "Super admin required" });
  next();
};

module.exports = {
  authenticate,
  optionalAuthenticate,
  verifiedVoterOnly,
  electionAdminOnly,
  fraudAdminOnly,
  auditReadOnly,
  voterRegistryRead,
  roleAdminOnly,
  chainOpsOnly,
  superAdminOnly,
};
