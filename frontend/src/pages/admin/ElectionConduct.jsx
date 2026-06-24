import{useEffect,useMemo,useState}from"react";
import{Link,useParams}from"react-router-dom";
import{AlertTriangle,CalendarClock,CheckCircle2,ClipboardCheck,FileKey2,Gavel,PauseCircle,PlayCircle,RefreshCw,ShieldCheck,UserRoundCheck,UserRoundX,Users,Vote}from"lucide-react";
import Sidebar from"../../components/layout/Sidebar";
import Button from"../../components/ui/Button";
import Badge,{StatusBadge}from"../../components/ui/Badge";
import Alert from"../../components/ui/Alert";
import PartyMark from"../../components/ui/PartyMark";
import{electionService}from"../../services/election.service";
import{candidateService}from"../../services/candidate.service";
import{formatDateTime,formatDuration,formatNumber,formatTimeRemaining,isMinimumElectionWindow}from"../../utils/formatters";

function roomState(election){
  if(election?.status==="ACTIVE")return{label:"Live election room",copy:"Voting is live. Candidate and voter roll changes are locked until the election closes.",tone:"success"};
  if(election?.status==="PAUSED")return{label:"Paused election room",copy:"Voting is paused. Resume only after the issue is resolved.",tone:"warning"};
  if(election?.status==="CLOSED")return{label:"Certification room",copy:"Voting is closed. Review disputes and certify results after the challenge period.",tone:"info"};
  if(election?.status==="RESULTS_DECLARED")return{label:"Certified election",copy:"Results have been certified and published.",tone:"success"};
  return{label:"Election preparation room",copy:"Approve candidates, select voters, rebuild the eligibility root, then activate the election.",tone:"info"};
}

function Step({ok,label,detail,to}){
  const body=<div className="flex items-start gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm"><CheckCircle2 size={18} className={ok?"mt-0.5 text-green-700":"mt-0.5 text-slate-300"}/><div className="min-w-0 flex-1"><p className="font-semibold text-slate-900">{label}</p><p className="mt-1 text-sm text-slate-500">{detail}</p></div></div>;
  return to?<Link to={to}>{body}</Link>:body;
}

export default function ElectionConductPage(){
  const{id}=useParams();
  const[loading,setLoading]=useState(true);
  const[busy,setBusy]=useState("");
  const[error,setError]=useState("");
  const[election,setElection]=useState(null);
  const[roll,setRoll]=useState({data:[],total:0});
  const[apps,setApps]=useState({data:[],total:0});
  const load=async()=>{
    setLoading(true);setError("");
    try{
      const[e,r,a]=await Promise.all([
        electionService.getById(id),
        electionService.getElectionRoll(id,{limit:100,status:"SELECTED"}),
        candidateService.list({electionId:id,limit:100})
      ]);
      setElection(e.data.data);
      setRoll(r.data.data);
      setApps(a.data.data);
    }catch(e){setError(e.response?.data?.message||e.message||"Unable to load election conduct room");}
    finally{setLoading(false);}
  };
  useEffect(()=>{load();},[id]);
  const candidates=election?.candidates||[];
  const activeCandidates=candidates.filter(c=>c.isActive);
  const selectedVoters=roll.total||roll.data.length;
  const pendingCandidateApps=apps.data.filter(a=>a.status==="SUBMITTED").length;
  const now=new Date();
  const state=roomState(election);
  const windowOk=isMinimumElectionWindow(election?.startTime,election?.endTime);
  const fullTurnout=selectedVoters>0&&Number(election?.totalVotesCast||0)>=selectedVoters;
  const timeLabel=election?.status==="ACTIVE"?formatTimeRemaining(election.endTime):election?.status==="PAUSED"?formatTimeRemaining(election.endTime):election&&new Date(election.startTime)>now?`Starts in ${formatTimeRemaining(election.startTime).replace(" left","")}`:election?formatTimeRemaining(election.endTime):"Loading";
  const readiness=useMemo(()=>[
    {ok:activeCandidates.length>=2,label:"Candidate list approved",detail:`${activeCandidates.length} active candidates. At least 2 required.`,to:"/admin/candidates"},
    {ok:selectedVoters>0,label:"Voter roll selected",detail:`${formatNumber(selectedVoters)} selected voters for this election.`,to:`/admin/elections/${id}/roll`},
    {ok:!!election?.merkleRoot,label:"Eligibility root built",detail:election?.merkleRoot?`Root ${String(election.merkleRoot).slice(0,18)}...`:"Build the root after voter selection.",to:`/admin/elections/${id}/roll`},
    {ok:!!election?.tallyPublicKey,label:"Ballot privacy key present",detail:election?.tallyPublicKey?"Encrypted ballot tally key configured.":"Tally public key missing."},
    {ok:windowOk,label:"7 day voting window",detail:election?`${formatDuration(election.startTime,election.endTime)} total. Minimum required: 7 full days.`:"Loading"},
    {ok:election?new Date(election.endTime)>now:false,label:"Election window valid",detail:election?`${formatDateTime(election.startTime)} to ${formatDateTime(election.endTime)}`:"Loading"}
  ],[election,activeCandidates.length,selectedVoters,id,windowOk]);
  const ready=readiness.every(r=>r.ok);
  const run=async(name,fn)=>{
    setBusy(name);setError("");
    try{await fn();await load();}
    catch(e){setError(e.response?.data?.message||e.message||"Action failed");}
    finally{setBusy("");}
  };
  const decideCandidate=async(app,decision)=>{
    const reason=decision==="approve"?"Approved from election conduct room":window.prompt("Reason for rejection")||"Rejected from election conduct room";
    await run(`${decision}:${app.id}`,()=>decision==="approve"?candidateService.approve(app.id,reason):candidateService.reject(app.id,reason));
  };
  return <div className="flex min-h-screen bg-bg"><Sidebar/><main className="flex-1 min-w-0 p-5 lg:pl-80 sm:p-8">
    <header className="mb-7 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
      <div><p className="section-label mb-2">{state.label}</p><h1 className="text-3xl font-semibold text-slate-950">{election?.title||"Election"}</h1><p className="mt-1 text-sm text-slate-500">{state.copy}</p></div>
      <div className="flex flex-wrap gap-2"><Link to="/admin/elections" className="btn-ghost">Back</Link><Button variant="ghost" icon={<RefreshCw size={15}/>} onClick={load}>Refresh</Button></div>
    </header>
    {error&&<Alert variant="error" className="mb-5">{error}</Alert>}
    {election?.status==="ACTIVE"&&<Alert variant="success" className="mb-5">Live election is running now. Voters can vote until {formatDateTime(election.endTime)}. Candidate approval and voter roll selection are locked.</Alert>}
    {election?.status==="DRAFT"&&<Alert variant="info" className="mb-5">This election is still in preparation, not live. Select voters and rebuild the eligibility root before activation.</Alert>}
    <section className="mb-6 grid gap-4 md:grid-cols-4">
      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"><p className="text-sm font-medium text-slate-500">Status</p><div className="mt-3"><StatusBadge status={election?.status}/></div><p className="mt-2 text-xs text-slate-500">{state.label}</p></div>
      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"><p className="text-sm font-medium text-slate-500">Candidates</p><p className="mt-3 text-3xl font-semibold text-slate-950">{formatNumber(activeCandidates.length)}</p></div>
      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"><p className="text-sm font-medium text-slate-500">Selected voters</p><p className="mt-3 text-3xl font-semibold text-slate-950">{formatNumber(selectedVoters)}</p></div>
      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"><p className="text-sm font-medium text-slate-500">{election?.status==="ACTIVE"?"Votes cast":"Voting window"}</p><p className="mt-3 text-xl font-semibold text-slate-950">{election?.status==="ACTIVE"?`${formatNumber(election?.totalVotesCast||0)} / ${formatNumber(selectedVoters)}`:timeLabel}</p><p className="mt-1 text-xs text-slate-500">{election?formatDuration(election.startTime,election.endTime):"Loading"} total</p></div>
    </section>
    <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
      <section className="space-y-4">
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2"><ClipboardCheck size={18} className="text-blue-700"/><h2 className="font-semibold text-slate-950">Activation checklist</h2></div>
          <div className="grid gap-3 md:grid-cols-2">{readiness.map(item=><Step key={item.label} {...item}/>)}</div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 p-4"><div><h2 className="font-semibold text-slate-950">Official candidates</h2><p className="text-sm text-slate-500">Approved candidates attached to this election.</p></div><Link to="/admin/candidates" className="btn-ghost btn-sm">Review candidates</Link></div>
          <div className="overflow-x-auto"><table className="table"><thead><tr><th>Name</th><th>Party</th><th>Chain ID</th><th>Status</th></tr></thead><tbody>{loading?Array.from({length:3}).map((_,i)=><tr key={i}><td colSpan={4}><div className="skeleton h-9 rounded"/></td></tr>):candidates.map(c=><tr key={c.id}><td><div className="flex items-center gap-3"><PartyMark party={c.party} logoUrl={c.partyLogoUrl} size="sm"/><span className="font-medium text-slate-950">{c.name}</span></div></td><td>{c.party}</td><td className="font-mono">{c.blockchainId||"pending"}</td><td>{c.isActive?<Badge variant="green">Active</Badge>:<Badge variant="gray">Inactive</Badge>}</td></tr>)}{!loading&&!candidates.length&&<tr><td colSpan={4}><div className="py-8 text-center text-sm text-slate-500">No approved candidates yet.</div></td></tr>}</tbody></table></div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 p-4"><div><h2 className="font-semibold text-slate-950">Candidate applications for this election</h2><p className="text-sm text-slate-500">{election?.status==="DRAFT"?"Choose the eligible candidates before activation. Approved candidates appear above and later in public results.":"Candidate decisions are locked after activation so the ballot cannot change during voting."}</p></div><Badge variant="yellow">{formatNumber(apps.total||apps.data.length)} applications</Badge></div>
          <div className="overflow-x-auto"><table className="table"><thead><tr><th>Applicant</th><th>Party</th><th>Status</th><th>Manifesto</th><th className="text-right">Decision</th></tr></thead><tbody>{loading?Array.from({length:3}).map((_,i)=><tr key={i}><td colSpan={5}><div className="skeleton h-9 rounded"/></td></tr>):apps.data.map(app=><tr key={app.id}><td><div className="flex items-center gap-3"><PartyMark party={app.party} logoUrl={app.partyLogoUrl} size="sm"/><div><p className="font-medium text-slate-950">{app.fullName}</p><p className="text-xs text-slate-500">{app.contactEmail||app.user?.email||"No email"}</p></div></div></td><td>{app.party}</td><td><StatusBadge status={app.status}/></td><td className="max-w-sm text-slate-500">{app.manifesto||"No manifesto provided"}</td><td><div className="flex justify-end gap-2"><Button size="sm" variant="outline-green" icon={<UserRoundCheck size={14}/>} disabled={app.status!=="SUBMITTED"||election?.status!=="DRAFT"} loading={busy===`approve:${app.id}`} onClick={()=>decideCandidate(app,"approve")}>Approve</Button><Button size="sm" variant="outline-red" icon={<UserRoundX size={14}/>} disabled={app.status!=="SUBMITTED"||election?.status!=="DRAFT"} loading={busy===`reject:${app.id}`} onClick={()=>decideCandidate(app,"reject")}>Reject</Button></div></td></tr>)}{!loading&&!apps.data.length&&<tr><td colSpan={5}><div className="py-8 text-center text-sm text-slate-500">No candidate applications assigned to this election yet. Candidates must apply and EC can assign them from Candidate Review.</div></td></tr>}</tbody></table></div>
        </div>
      </section>
      <aside className="space-y-4">
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2"><Gavel size={18} className="text-blue-700"/><h2 className="font-semibold text-slate-950">Lifecycle controls</h2></div>
          <div className="space-y-2">
            <Button fullWidth disabled={!ready||election?.status!=="DRAFT"} loading={busy==="activate"} icon={<PlayCircle size={15}/>} onClick={()=>run("activate",()=>electionService.activate(id,null,true))}>Activate election now</Button>
            <Button fullWidth variant="ghost" disabled={election?.status!=="ACTIVE"} loading={busy==="pause"} icon={<PauseCircle size={15}/>} onClick={()=>run("pause",()=>electionService.pause(id,"Paused from conduct room"))}>Pause active election</Button>
            <Button fullWidth variant="outline-green" disabled={election?.status!=="PAUSED"} loading={busy==="resume"} icon={<PlayCircle size={15}/>} onClick={()=>run("resume",()=>electionService.resume(id))}>Resume election</Button>
            <Button fullWidth variant="outline-red" disabled={!["ACTIVE","PAUSED"].includes(election?.status)} loading={busy==="close"} icon={<Vote size={15}/>} onClick={()=>run("close",()=>electionService.close(id))}>Close voting</Button>
            <Button fullWidth variant="outline-cyan" disabled={election?.status!=="ACTIVE"||!fullTurnout} loading={busy==="quick"} icon={<ShieldCheck size={15}/>} onClick={()=>run("quick",()=>electionService.quickResult(id,"Quick result declared after all selected voters voted"))}>Declare quick result</Button>
            <Button fullWidth variant="outline-cyan" disabled={election?.status!=="CLOSED"} loading={busy==="declare"} icon={<ShieldCheck size={15}/>} onClick={()=>run("declare",()=>electionService.declareResults(id,null,"Certified from conduct room"))}>Certify results</Button>
          </div>
        </section>
        {!ready&&<Alert variant="warning">Activation is blocked until candidates, voter roll, eligibility root, privacy key, and timeline are ready.</Alert>}
        {ready&&election?.status==="DRAFT"&&<Alert variant="success">This election is ready for activation. Vote choice privacy remains separated from EC operations.</Alert>}
        {election?.status==="ACTIVE"&&!fullTurnout&&<Alert variant="info">Quick result unlocks after all selected voters have cast their ballot. Otherwise close/certify after the normal election window.</Alert>}
        {election?.status==="ACTIVE"&&fullTurnout&&<Alert variant="success">All selected voters have voted. EC can declare quick results now; this satisfies the 20 minute quick-result prototype rule.</Alert>}
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-3 font-semibold text-slate-950">Operational links</h2>
          <div className="grid gap-2"><Link className="btn-ghost justify-start" to={`/admin/elections/${id}/roll`}><Users size={15}/>Manage voter roll</Link><Link className="btn-ghost justify-start" to="/admin/candidates"><FileKey2 size={15}/>Review candidates</Link><Link className="btn-ghost justify-start" to={`/elections/${id}/results`}><CalendarClock size={15}/>Public results view</Link></div>
        </section>
      </aside>
    </div>
  </main></div>;
}
