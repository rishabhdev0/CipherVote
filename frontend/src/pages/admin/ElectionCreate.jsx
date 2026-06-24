import{useMemo,useState}from"react";
import{useNavigate}from"react-router-dom";
import{CalendarClock,CheckCircle2,ClipboardList,KeyRound,Landmark,MapPin,Plus,ShieldCheck}from"lucide-react";
import Sidebar from"../../components/layout/Sidebar";
import Input,{Select,Textarea}from"../../components/ui/Input";
import Button from"../../components/ui/Button";
import Alert from"../../components/ui/Alert";
import{electionService}from"../../services/election.service";
import{formatDuration,isMinimumElectionWindow}from"../../utils/formatters";

const constituencies=["ALL","Delhi-01","Delhi-02","Mumbai-01","Mumbai-02","Bangalore-01","Chennai-01","Kolkata-01","Hyderabad-01","Pune-01"];

function localValue(date){
  const d=new Date(date);
  d.setMinutes(d.getMinutes()-d.getTimezoneOffset());
  return d.toISOString().slice(0,16);
}

export default function ElectionCreatePage(){
  const navigate=useNavigate();
  const now=Date.now();
  const defaults=useMemo(()=>({
    title:"",
    description:"",
    constituency:"Delhi-01",
    startTime:localValue(now),
    endTime:localValue(now+7*24*60*60*1000),
    challengeStartsAt:localValue(now-30*60*1000),
    challengeEndsAt:localValue(now-60*1000),
    privacyMode:"ENCRYPTED_BALLOT",
    tallyPublicKey:"dev-tally-public-key-replace-before-production"
  }),[]);
  const[form,setForm]=useState(defaults);
  const[loading,setLoading]=useState(false);
  const[error,setError]=useState("");
  const change=e=>setForm(v=>({...v,[e.target.name]:e.target.value}));
  const start=new Date(form.startTime),end=new Date(form.endTime),challengeEnd=new Date(form.challengeEndsAt);
  const windowOk=isMinimumElectionWindow(form.startTime,form.endTime);
  const readiness=[
    {label:"Election title",ok:form.title.trim().length>=4},
    {label:"Region selected",ok:!!form.constituency},
    {label:"Voting starts before it ends",ok:start<end},
    {label:"Voting window is at least 7 full days",ok:windowOk},
    {label:"Challenge period ends before activation window",ok:challengeEnd<start},
    {label:"Encrypted ballot public key set",ok:form.privacyMode!=="ENCRYPTED_BALLOT"||form.tallyPublicKey.trim().length>10}
  ];
  const ready=readiness.every(i=>i.ok);
  const submit=async e=>{
    e.preventDefault();setLoading(true);setError("");
    try{
      const payload={...form,startTime:new Date(form.startTime).toISOString(),endTime:new Date(form.endTime).toISOString(),challengeStartsAt:new Date(form.challengeStartsAt).toISOString(),challengeEndsAt:new Date(form.challengeEndsAt).toISOString()};
      const res=await electionService.create(payload);
      navigate(`/admin/elections/${res.data.data.id}/conduct`);
    }catch(err){setError(err.response?.data?.message||err.message||"Election creation failed");}
    finally{setLoading(false);}
  };
  return <div className="flex min-h-screen bg-bg"><Sidebar/><main className="flex-1 min-w-0 p-5 lg:pl-80 sm:p-8">
    <header className="mb-7">
      <p className="section-label mb-2">Election Commission workflow</p>
      <h1 className="text-3xl font-semibold text-slate-950">Create Election</h1>
      <p className="mt-1 max-w-2xl text-sm text-slate-500">Create the official election shell. Local test elections default to a ready-now voting window; candidates and voters are still approved before activation.</p>
    </header>
    {error&&<Alert variant="error" className="mb-5">{error}</Alert>}
    <form onSubmit={submit} className="grid gap-6 xl:grid-cols-[1fr_360px]">
      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-6 flex items-center gap-3"><div className="rounded-lg bg-blue-50 p-2 text-blue-700"><Landmark size={20}/></div><div><h2 className="font-semibold text-slate-950">Basic election record</h2><p className="text-sm text-slate-500">This becomes the EC-controlled election workspace.</p></div></div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Election title" name="title" value={form.title} onChange={change} required placeholder="Delhi Assembly Election 2026"/>
          <Select label="Region / constituency" name="constituency" value={form.constituency} onChange={change} options={constituencies.map(c=>({value:c,label:c}))} required/>
          <Input label="Voting starts" type="datetime-local" name="startTime" value={form.startTime} onChange={change} icon={<CalendarClock size={14}/>} required/>
          <Input label="Voting ends" type="datetime-local" name="endTime" value={form.endTime} onChange={change} icon={<CalendarClock size={14}/>} hint={`Duration: ${formatDuration(form.startTime,form.endTime)}. Minimum required: 7 full days.`} required/>
          <Input label="Public challenge starts" type="datetime-local" name="challengeStartsAt" value={form.challengeStartsAt} onChange={change}/>
          <Input label="Public challenge ends" type="datetime-local" name="challengeEndsAt" value={form.challengeEndsAt} onChange={change}/>
        </div>
        <Textarea className="mt-4" label="Election description" name="description" value={form.description} onChange={change} rows={5} placeholder="Purpose, authority, constituency notes, and public instructions."/>
        <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-800"><KeyRound size={16} className="text-blue-700"/>Privacy configuration</div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Select label="Ballot privacy mode" name="privacyMode" value={form.privacyMode} onChange={change} options={[{value:"ENCRYPTED_BALLOT",label:"Encrypted ballot"},{value:"PLAINTEXT_DEV_ONLY",label:"Plaintext dev only"}]}/>
            <Input label="Tally public key" name="tallyPublicKey" value={form.tallyPublicKey} onChange={change} hint="Replace dev key before any real election."/>
          </div>
        </div>
      </section>
      <aside className="space-y-4">
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2"><ClipboardList size={18} className="text-blue-700"/><h2 className="font-semibold text-slate-950">Creation readiness</h2></div>
          <div className="space-y-3">{readiness.map(item=><div key={item.label} className="flex items-center gap-2 text-sm"><CheckCircle2 size={16} className={item.ok?"text-green-700":"text-slate-300"}/><span className={item.ok?"text-slate-700":"text-slate-400"}>{item.label}</span></div>)}</div>
        </section>
        <Alert variant="info">After creation, EC must approve candidates, select voters, rebuild eligibility root, then activate the election.</Alert>
        <div className="flex flex-col gap-2"><Button type="submit" disabled={!ready} loading={loading} icon={<Plus size={15}/>} fullWidth>Create election</Button><Button type="button" variant="ghost" onClick={()=>navigate("/admin/elections")} fullWidth>Cancel</Button></div>
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800"><ShieldCheck size={16} className="mb-2"/>Production mode can require governance approval and timelock before creation or activation.</div>
      </aside>
    </form>
  </main></div>;
}
