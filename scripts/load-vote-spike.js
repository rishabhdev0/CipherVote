const crypto=require("crypto");

const baseUrl=process.env.LOAD_TEST_BASE_URL;
const csrf=process.env.LOAD_TEST_CSRF_TOKEN;
const cookie=process.env.LOAD_TEST_COOKIE;
const electionId=process.env.LOAD_TEST_ELECTION_ID;
const candidateId=process.env.LOAD_TEST_CANDIDATE_ID;
const concurrency=Number(process.env.LOAD_TEST_CONCURRENCY||20);
const total=Number(process.env.LOAD_TEST_TOTAL||100);

if(!baseUrl||!csrf||!cookie||!electionId||!candidateId){
  console.error("Set LOAD_TEST_BASE_URL, LOAD_TEST_CSRF_TOKEN, LOAD_TEST_COOKIE, LOAD_TEST_ELECTION_ID, and LOAD_TEST_CANDIDATE_ID.");
  process.exit(2);
}

async function castVote(index){
  const body={
    electionId,
    candidateId,
    deviceFingerprint:crypto.createHash("sha256").update(`load-device-${index%10}`).digest("hex"),
    proof:{a:["0","0"],b:[["0","0"],["0","0"]],c:["0","0"],publicSignals:[electionId,candidateId,`load-nullifier-${index}`,"0"]}
  };
  const res=await fetch(`${baseUrl.replace(/\/$/,"")}/api/voting/cast`,{
    method:"POST",
    headers:{
      "content-type":"application/json",
      "x-csrf-token":csrf,
      "cookie":cookie,
      "user-agent":"CipherVote load harness"
    },
    body:JSON.stringify(body)
  });
  return{status:res.status,body:await res.text()};
}

(async()=>{
  const started=Date.now();
  const results=[];
  for(let i=0;i<total;i+=concurrency){
    const batch=Array.from({length:Math.min(concurrency,total-i)},(_,j)=>castVote(i+j));
    results.push(...await Promise.all(batch));
  }
  const counts=results.reduce((acc,r)=>{acc[r.status]=(acc[r.status]||0)+1;return acc;},{});
  console.log(JSON.stringify({total,concurrency,elapsedMs:Date.now()-started,statusCounts:counts},null,2));
  if((counts[500]||0)>0)process.exit(1);
})();
