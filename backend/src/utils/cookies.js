const { runtimeConfig } = require("../config/env");

function parseCookies(req) {
  const header = req.headers.cookie;
  if (!header) return {};
  return header.split(";").reduce((acc, part) => {
    const idx = part.indexOf("=");
    if (idx < 0) return acc;
    const key = part.slice(0, idx).trim();
    const value = part.slice(idx + 1).trim();
    if (key) acc[key] = decodeURIComponent(value);
    return acc;
  }, {});
}

function cookieOptions(maxAge) {
  const cfg = runtimeConfig();
  return {
    httpOnly: true,
    secure: cfg.cookieSecure,
    sameSite: cfg.cookieSameSite,
    domain: cfg.cookieDomain,
    path: "/",
    maxAge,
  };
}

function csrfCookieOptions(maxAge = 24 * 60 * 60 * 1000) {
  const cfg = runtimeConfig();
  return {
    httpOnly: false,
    secure: cfg.cookieSecure,
    sameSite: cfg.cookieSameSite,
    domain: cfg.cookieDomain,
    path: "/",
    maxAge,
  };
}

function setAuthCookies(res, tokens) {
  const cfg = runtimeConfig();
  res.cookie(
    cfg.accessCookieName,
    tokens.accessToken,
    cookieOptions(15 * 60 * 1000),
  );
  res.cookie(
    cfg.refreshCookieName,
    tokens.refreshToken,
    cookieOptions(7 * 24 * 60 * 60 * 1000),
  );
}

function clearAuthCookies(res) {
  const cfg = runtimeConfig();
  res.clearCookie(cfg.accessCookieName, {
    path: "/",
    domain: cfg.cookieDomain,
  });
  res.clearCookie(cfg.refreshCookieName, {
    path: "/",
    domain: cfg.cookieDomain,
  });
}

module.exports = {
  parseCookies,
  cookieOptions,
  csrfCookieOptions,
  setAuthCookies,
  clearAuthCookies,
};
