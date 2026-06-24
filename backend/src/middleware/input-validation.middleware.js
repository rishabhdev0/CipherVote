const { badRequest } = require("../utils/response");

const constituencies = new Set([
  "ALL",
  "Delhi-01",
  "Delhi-02",
  "Mumbai-01",
  "Mumbai-02",
  "Bangalore-01",
  "Chennai-01",
  "Kolkata-01",
  "Hyderabad-01",
  "Pune-01",
]);
const genders = new Set(["MALE", "FEMALE", "OTHER", "PREFER_NOT_TO_SAY"]);
const roles = new Set(["VOTER", "CANDIDATE"]);
const privacyModes = new Set(["ENCRYPTED_BALLOT", "COMMITMENT_ONLY"]);
const blockedTerms = (process.env.PROHIBITED_CONTENT_TERMS || "")
  .split(",")
  .map((term) => term.trim().toLowerCase())
  .filter(Boolean);

function clean(value) {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ") : value;
}

function fail(errors) {
  const err = new Error(errors.join("; "));
  err.validationErrors = errors;
  throw err;
}

function requireString(body, field, { min = 1, max = 120, pattern, label } = {}) {
  const value = clean(body[field]);
  const name = label || field;
  if (typeof value !== "string" || value.length < min)
    fail([`${name} is required`]);
  if (value.length > max) fail([`${name} is too long`]);
  if (/[<>]/.test(value)) fail([`${name} cannot contain HTML/script characters`]);
  if (blockedTerms.some((term) => value.toLowerCase().includes(term)))
    fail([`${name} contains prohibited language`]);
  if (pattern && !pattern.test(value)) fail([`${name} has invalid format`]);
  body[field] = value;
  return value;
}

function optionalString(body, field, { max = 500, pattern, label } = {}) {
  if (body[field] === undefined || body[field] === null || body[field] === "") {
    body[field] = undefined;
    return undefined;
  }
  return requireString(body, field, { min: 0, max, pattern, label });
}

function validDate(value) {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function validate(schema) {
  return (req, res, next) => {
    try {
      schema(req);
      next();
    } catch (e) {
      return badRequest(res, e.validationErrors?.join("; ") || e.message);
    }
  };
}

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phonePattern = /^\+?[0-9]{7,15}$/;
const walletPattern = /^0x[a-fA-F0-9]{40}$/;
const namePattern = /^[A-Za-z][A-Za-z .'-]{1,79}$/;
const partyPattern = /^[A-Za-z0-9][A-Za-z0-9 .,'&()/-]{1,79}$/;
const voterIdPattern = /^[A-Za-z0-9-]{5,32}$/;

const validateAuthRegister = validate((req) => {
  optionalString(req.body, "email", { max: 254, pattern: emailPattern });
  optionalString(req.body, "phone", { max: 16, pattern: phonePattern });
  requireString(req.body, "password", { min: 8, max: 128, label: "password" });
  requireString(req.body, "walletAddress", {
    min: 42,
    max: 42,
    pattern: walletPattern,
    label: "wallet address",
  });
  optionalString(req.body, "intent", { max: 20 });
  optionalString(req.body, "role", { max: 20 });
  if (req.body.role && !roles.has(req.body.role)) fail(["Invalid role"]);
  if (req.body.intent && !["voter", "candidate"].includes(req.body.intent))
    fail(["Invalid registration intent"]);
});

const validateVoterRegistration = validate((req) => {
  requireString(req.body, "firstName", { max: 80, pattern: namePattern });
  requireString(req.body, "lastName", { max: 80, pattern: namePattern });
  requireString(req.body, "voterIdNumber", {
    max: 32,
    pattern: voterIdPattern,
    label: "voter ID number",
  });
  requireString(req.body, "constituency", { max: 40 });
  if (!constituencies.has(req.body.constituency))
    fail(["Invalid constituency"]);
  requireString(req.body, "gender", { max: 20 });
  if (!genders.has(req.body.gender)) fail(["Invalid gender"]);
  const dob = validDate(req.body.dateOfBirth);
  if (!dob) fail(["Invalid date of birth"]);
  const age = Math.floor((Date.now() - dob.getTime()) / 31557600000);
  if (age < 18 || age > 120) fail(["Voter age must be between 18 and 120"]);
  req.body.dateOfBirth = dob.toISOString();
});

const validateCandidateApplication = validate((req) => {
  optionalString(req.body, "electionId", { max: 64 });
  requireString(req.body, "fullName", { max: 100, pattern: namePattern });
  requireString(req.body, "party", { max: 80, pattern: partyPattern });
  requireString(req.body, "constituency", { max: 40 });
  if (!constituencies.has(req.body.constituency))
    fail(["Invalid constituency"]);
  optionalString(req.body, "manifesto", { max: 3000 });
  optionalString(req.body, "partyLogoUrl", { max: 260000 });
  optionalString(req.body, "contactEmail", { max: 254, pattern: emailPattern });
  optionalString(req.body, "contactPhone", { max: 16, pattern: phonePattern });
  optionalString(req.body, "documentHash", { max: 128 });
});

const validateElectionCreate = validate((req) => {
  requireString(req.body, "title", { max: 120 });
  optionalString(req.body, "description", { max: 2000 });
  requireString(req.body, "constituency", { max: 40 });
  if (!constituencies.has(req.body.constituency))
    fail(["Invalid constituency"]);
  if (!validDate(req.body.startTime) || !validDate(req.body.endTime))
    fail(["Invalid election dates"]);
  optionalString(req.body, "tallyPublicKey", { max: 5000 });
  optionalString(req.body, "privacyMode", { max: 40 });
  if (req.body.privacyMode && !privacyModes.has(req.body.privacyMode))
    fail(["Invalid privacy mode"]);
});

const validateElectionCandidate = validate((req) => {
  requireString(req.body, "name", { max: 100, pattern: namePattern });
  requireString(req.body, "party", { max: 80, pattern: partyPattern });
  optionalString(req.body, "constituency", { max: 40 });
  if (req.body.constituency && !constituencies.has(req.body.constituency))
    fail(["Invalid constituency"]);
  optionalString(req.body, "manifesto", { max: 3000 });
  optionalString(req.body, "partyLogoUrl", { max: 260000 });
});

module.exports = {
  validateAuthRegister,
  validateVoterRegistration,
  validateCandidateApplication,
  validateElectionCreate,
  validateElectionCandidate,
};
