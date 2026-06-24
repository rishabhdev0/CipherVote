const s = (res, data, msg = "Success", code = 200) =>
  res.status(code).json({ success: true, message: msg, data });
const b = (res, msg = "Bad request") =>
  res.status(400).json({ success: false, message: msg });
const u = (res, msg = "Unauthorized") =>
  res.status(401).json({ success: false, message: msg });
const f = (res, msg = "Forbidden") =>
  res.status(403).json({ success: false, message: msg });
const n = (res, msg = "Not found") =>
  res.status(404).json({ success: false, message: msg });
const c = (res, msg = "Conflict") =>
  res.status(409).json({ success: false, message: msg });
module.exports = {
  success: s,
  badRequest: b,
  unauthorized: u,
  forbidden: f,
  notFound: n,
  conflict: c,
};
