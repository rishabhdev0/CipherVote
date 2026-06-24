const test = require("node:test");
const assert = require("node:assert/strict");
const {
  validateAuthRegister,
  validateVoterRegistration,
  validateCandidateApplication,
} = require("../src/middleware/input-validation.middleware");

function run(middleware, body) {
  let statusCode = 200;
  let payload = null;
  let nextCalled = false;
  const req = { body: { ...body } };
  const res = {
    status(code) {
      statusCode = code;
      return this;
    },
    json(data) {
      payload = data;
      return this;
    },
  };
  middleware(req, res, () => {
    nextCalled = true;
  });
  return { statusCode, payload, nextCalled, body: req.body };
}

test("auth registration requires a valid wallet and strong-enough password", () => {
  const bad = run(validateAuthRegister, {
    email: "voter@test.local",
    password: "short",
    walletAddress: "not-a-wallet",
    intent: "voter",
  });
  assert.equal(bad.nextCalled, false);
  assert.equal(bad.statusCode, 400);

  const good = run(validateAuthRegister, {
    email: "voter@test.local",
    password: "long-enough-password",
    walletAddress: "0x0000000000000000000000000000000000000001",
    intent: "voter",
  });
  assert.equal(good.nextCalled, true);
});

test("voter registration rejects malformed identity fields", () => {
  const bad = run(validateVoterRegistration, {
    firstName: "<script>",
    lastName: "Pandey",
    dateOfBirth: "9999-99-99",
    gender: "MALE",
    constituency: "Delhi-01",
    voterIdNumber: "ABC123",
  });
  assert.equal(bad.nextCalled, false);
  assert.equal(bad.statusCode, 400);

  const good = run(validateVoterRegistration, {
    firstName: "Rishabh",
    lastName: "Pandey",
    dateOfBirth: "2000-01-01",
    gender: "MALE",
    constituency: "Delhi-01",
    voterIdNumber: "ABC1234567",
  });
  assert.equal(good.nextCalled, true);
});

test("candidate application rejects prohibited and oversized display text", () => {
  const bad = run(validateCandidateApplication, {
    fullName: "Bad <b>Name</b>",
    party: "A".repeat(500),
    constituency: "Delhi-01",
  });
  assert.equal(bad.nextCalled, false);
  assert.equal(bad.statusCode, 400);

  const good = run(validateCandidateApplication, {
    fullName: "Pragya Sharma",
    party: "Independent",
    constituency: "Delhi-01",
    manifesto: "Public service and transparent elections.",
  });
  assert.equal(good.nextCalled, true);
});
