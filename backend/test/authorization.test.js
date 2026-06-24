const test = require("node:test");
const assert = require("node:assert/strict");
const {
  verifiedVoterOnly,
  electionAdminOnly,
  fraudAdminOnly,
  auditReadOnly,
  voterRegistryRead,
  roleAdminOnly,
} = require("../src/middleware/auth.middleware");

function run(mw, req) {
  let statusCode = null,
    payload = null,
    nextCalled = false;
  const res = {
    status: (c) => {
      statusCode = c;
      return {
        json: (p) => {
          payload = p;
        },
      };
    },
  };
  mw(req, res, () => {
    nextCalled = true;
  });
  return { statusCode, payload, nextCalled };
}

test("verifiedVoterOnly requires VERIFIED and not blacklisted", () => {
  assert.equal(
    run(verifiedVoterOnly, {
      voter: { status: "VERIFIED", isBlacklisted: false },
    }).nextCalled,
    true,
  );
  assert.equal(
    run(verifiedVoterOnly, {
      voter: { status: "PENDING", isBlacklisted: false },
    }).statusCode,
    403,
  );
  assert.equal(
    run(verifiedVoterOnly, {
      voter: { status: "VERIFIED", isBlacklisted: true },
    }).statusCode,
    403,
  );
});

test("election admin role is limited to super admin and election commission", () => {
  assert.equal(
    run(electionAdminOnly, { user: { role: "ELECTION_COMMISSION" } })
      .nextCalled,
    true,
  );
  assert.equal(
    run(electionAdminOnly, { user: { role: "SUPER_ADMIN" } }).nextCalled,
    true,
  );
  assert.equal(
    run(electionAdminOnly, { user: { role: "AUDITOR" } }).statusCode,
    403,
  );
});

test("auditor can read audit but cannot mutate roles", () => {
  assert.equal(
    run(auditReadOnly, { user: { role: "AUDITOR" } }).nextCalled,
    true,
  );
  assert.equal(
    run(roleAdminOnly, { user: { role: "AUDITOR" } }).statusCode,
    403,
  );
  assert.equal(
    run(roleAdminOnly, { user: { role: "SUPER_ADMIN" } }).nextCalled,
    true,
  );
});

test("voter registry read allows EC and auditors but blocks ordinary voters", () => {
  assert.equal(
    run(voterRegistryRead, { user: { role: "ELECTION_COMMISSION" } })
      .nextCalled,
    true,
  );
  assert.equal(
    run(voterRegistryRead, { user: { role: "AUDITOR" } }).nextCalled,
    true,
  );
  assert.equal(
    run(voterRegistryRead, { user: { role: "SUPER_ADMIN" } }).nextCalled,
    true,
  );
  assert.equal(
    run(voterRegistryRead, { user: { role: "VOTER" } }).statusCode,
    403,
  );
});

test("fraud admin excludes auditors", () => {
  assert.equal(
    run(fraudAdminOnly, { user: { role: "FRAUD_ANALYST" } }).nextCalled,
    true,
  );
  assert.equal(
    run(fraudAdminOnly, { user: { role: "SUPER_ADMIN" } }).nextCalled,
    true,
  );
  assert.equal(
    run(fraudAdminOnly, { user: { role: "AUDITOR" } }).statusCode,
    403,
  );
});
