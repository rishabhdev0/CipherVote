const baseUrl=process.env.E2E_BASE_URL;
const email=process.env.E2E_EMAIL;
const password=process.env.E2E_PASSWORD;

if(!baseUrl||!email||!password){
  console.error("Set E2E_BASE_URL, E2E_EMAIL, and E2E_PASSWORD to run the smoke flow.");
  process.exit(2);
}

let cookieJar="";
function rememberCookies(res){
  const raw=res.headers.getSetCookie?res.headers.getSetCookie():[];
  const cookies=raw.map(v=>v.split(";")[0]).filter(Boolean);
  if(cookies.length)cookieJar=[cookieJar,...cookies].filter(Boolean).join("; ");
}

async function request(path,options={}){
  const res=await fetch(`${baseUrl.replace(/\/$/,"")}${path}`,{
    ...options,
    headers:{...(options.headers||{}),cookie:cookieJar}
  });
  rememberCookies(res);
  const text=await res.text();
  let body;
  try{body=JSON.parse(text);}catch{body=text;}
  if(!res.ok)throw new Error(`${options.method||"GET"} ${path} failed ${res.status}: ${text}`);
  return{res,body};
}

(async()=>{
  const csrf=await request("/api/auth/csrf");
  const token=csrf.body.data.csrfToken;
  await request("/api/auth/login/email",{
    method:"POST",
    headers:{"content-type":"application/json","x-csrf-token":token},
    body:JSON.stringify({email,password})
  });
  await request("/api/auth/me");
  await request("/api/elections");
  await request("/api/voters/me").catch(()=>null);
  console.log("E2E smoke flow passed: csrf, login, session, elections, voter profile probe.");
})();
