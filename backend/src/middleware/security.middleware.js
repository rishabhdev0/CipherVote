const crypto=require("crypto");
const {runtimeConfig,secureRandomToken}=require("../config/env");
const {parseCookies,csrfCookieOptions}=require("../utils/cookies");

const SAFE_METHODS=new Set(["GET","HEAD","OPTIONS"]);
const CSRF_EXEMPT=new Set(["/api/auth/csrf","/api/health","/api/voters/identity/provider-webhook"]);

function requestId(req,res,next){
  const cfg=runtimeConfig();
  const incoming=req.headers[cfg.requestIdHeader];
  req.id=typeof incoming==="string"&&incoming.length<=128?incoming:crypto.randomUUID();
  res.setHeader(cfg.requestIdHeader,req.id);
  next();
}

function issueCsrf(req,res){
  const cfg=runtimeConfig();
  const token=secureRandomToken(32);
  res.cookie(cfg.csrfCookieName,token,csrfCookieOptions());
  return token;
}

function csrfProtection(req,res,next){
  if(SAFE_METHODS.has(req.method)||CSRF_EXEMPT.has(req.path))return next();
  const cfg=runtimeConfig();
  const cookies=parseCookies(req);
  const cookieToken=cookies[cfg.csrfCookieName];
  const headerToken=req.headers["x-csrf-token"];
  if(!cookieToken||!headerToken||cookieToken!==headerToken){
    return res.status(403).json({success:false,message:"CSRF validation failed",requestId:req.id});
  }
  next();
}

function noStore(req,res,next){
  if(req.path.startsWith("/api/auth")||req.path.startsWith("/api/voting")){
    res.setHeader("Cache-Control","no-store");
    res.setHeader("Pragma","no-cache");
  }
  next();
}

module.exports={requestId,issueCsrf,csrfProtection,noStore};
