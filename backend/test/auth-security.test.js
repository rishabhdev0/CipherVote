const test = require("node:test");
const assert = require("node:assert/strict");

process.env.JWT_SECRET = "test-access-secret";
process.env.JWT_REFRESH_SECRET = "test-refresh-secret";

const {
  generateAccessToken,
  generateRefreshToken,
  verifyAccess,
  verifyRefresh,
} = require("../src/services/jwt.service");
const {
  parseCookies,
  setAuthCookies,
  clearAuthCookies,
} = require("../src/utils/cookies");
const {
  csrfProtection,
  issueCsrf,
} = require("../src/middleware/security.middleware");

function fakeResponse() {
  const cookies = [];
  const cleared = [];
  const headers = {};
  return {
    cookies,
    cleared,
    headers,
    statusCode: null,
    body: null,
    cookie: (name, value, options) => cookies.push({ name, value, options }),
    clearCookie: (name, options) => cleared.push({ name, options }),
    setHeader: (name, value) => {
      headers[name.toLowerCase()] = value;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
}

function runCsrf(req) {
  const res = fakeResponse();
  let nextCalled = false;
  csrfProtection(req, res, () => {
    nextCalled = true;
  });
  return { res, nextCalled };
}

test("JWT access and refresh tokens are typed and not interchangeable", () => {
  const payload = { userId: "user-1", role: "VOTER" };
  const access = generateAccessToken(payload);
  const refresh = generateRefreshToken(payload);

  assert.equal(verifyAccess(access).type, "access");
  assert.equal(verifyRefresh(refresh).type, "refresh");
  assert.throws(
    () => verifyAccess(refresh),
    /invalid signature|Invalid token type/i,
  );
  assert.throws(
    () => verifyRefresh(access),
    /invalid signature|Invalid token type/i,
  );
});

test("auth cookies are httpOnly and CSRF cookie is readable by the client", () => {
  const res = fakeResponse();
  setAuthCookies(res, {
    accessToken: "access-token",
    refreshToken: "refresh-token",
  });

  assert.equal(res.cookies.length, 2);
  assert.equal(
    res.cookies.every((c) => c.options.httpOnly === true),
    true,
  );
  assert.equal(
    res.cookies.every((c) => c.options.sameSite === "lax"),
    true,
  );

  const csrfRes = fakeResponse();
  const token = issueCsrf({ headers: {} }, csrfRes);
  assert.match(token, /^[0-9a-f]{64}$/);
  assert.equal(csrfRes.cookies[0].options.httpOnly, false);
});

test("clearAuthCookies removes both auth cookies", () => {
  const res = fakeResponse();
  clearAuthCookies(res);
  assert.deepEqual(res.cleared.map((c) => c.name).sort(), [
    "cv_access",
    "cv_refresh",
  ]);
});

test("parseCookies handles multiple cookie values", () => {
  assert.deepEqual(
    parseCookies({
      headers: { cookie: "cv_access=a%20b; cv_refresh=r; theme=dark" },
    }),
    {
      cv_access: "a b",
      cv_refresh: "r",
      theme: "dark",
    },
  );
});

test("CSRF middleware allows safe methods and rejects missing or mismatched tokens", () => {
  assert.equal(
    runCsrf({ method: "GET", path: "/api/voting", headers: {} }).nextCalled,
    true,
  );

  const missing = runCsrf({ method: "POST", path: "/api/voting", headers: {} });
  assert.equal(missing.res.statusCode, 403);
  assert.equal(missing.res.body.success, false);

  const mismatch = runCsrf({
    method: "POST",
    path: "/api/voting",
    headers: { cookie: "cv_csrf=a", "x-csrf-token": "b" },
  });
  assert.equal(mismatch.res.statusCode, 403);

  const ok = runCsrf({
    method: "POST",
    path: "/api/voting",
    headers: { cookie: "cv_csrf=same", "x-csrf-token": "same" },
  });
  assert.equal(ok.nextCalled, true);
});
