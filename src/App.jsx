import { useState, useEffect, useRef } from "react";

// ─── Config ────────────────────────────────────────────────────────────────
// 🧪 TESTING MODE — shift window = now → now+30min
const _n = new Date(), _e = new Date(_n.getTime() + 30 * 60 * 1000);
const SHIFT_START = { h: _n.getHours(), m: _n.getMinutes() };
const SHIFT_END   = { h: _e.getHours(), m: _e.getMinutes() };
// PRODUCTION:
// const SHIFT_START = { h: 18, m: 30 };
// const SHIFT_END   = { h: 21, m:  0 };

const ADMIN = { username: "admin", password: "admin123" };
const EMPLOYEES = [
  { username: "james.wright", password: "pass123", name: "James Wright",  initials: "JW", id: "12463" },
  { username: "priya.sharma", password: "pass123", name: "Priya Sharma",  initials: "PS", id: "12464" },
  { username: "dan.okafor",   password: "pass123", name: "Dan Okafor",    initials: "DO", id: "12465" },
  { username: "lucy.chen",    password: "pass123", name: "Lucy Chen",     initials: "LC", id: "12466" },
];

// Generate shifts: Mon–Sat for the next 14 days from today
function generateShifts() {
  const shifts = [];
  const today = new Date();
  today.setHours(0,0,0,0);
  for (let i = 0; i < 14; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const dow = d.getDay(); // 0=Sun,6=Sat
    if (dow === 0) continue; // skip Sunday
    shifts.push({
      id: `shift-${i}`,
      date: new Date(d),
      label: dow === 6 ? "Sat" : "Mon – Fri",
      grade: "Grade 8",
      location: "Manchester Central",
    });
  }
  return shifts;
}

// ─── Helpers ───────────────────────────────────────────────────────────────
const toMins = (h, m) => h * 60 + m;
const fmt12  = (h, m) => { const p = h>=12?"PM":"AM", hh=h%12||12; return `${hh}:${String(m).padStart(2,"0")} ${p}`; };
const fmt24  = (h, m) => `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}`;
const fmtClock     = d => d.toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit",second:"2-digit"});
const fmtTimestamp = ts => ts ? fmtClock(new Date(ts)) : "—";
const fmtDuration  = ms => {
  const s=Math.floor(ms/1000),h=Math.floor(s/3600),m=Math.floor((s%3600)/60),sec=s%60;
  if(h>0) return `${h}h ${m}m`; if(m>0) return `${m}m ${sec}s`; return `${sec}s`;
};
const fmtDate = d => d.toLocaleDateString("en-GB",{day:"2-digit",month:"2-digit"});
const fmtDay  = d => d.toLocaleDateString("en-GB",{weekday:"long"});
const isToday = d => { const t=new Date(); return d.getDate()===t.getDate()&&d.getMonth()===t.getMonth()&&d.getFullYear()===t.getFullYear(); };

const shiftStatus = () => {
  const t=new Date(), cur=toMins(t.getHours(),t.getMinutes());
  const start=toMins(SHIFT_START.h,SHIFT_START.m), end=toMins(SHIFT_END.h,SHIFT_END.m);
  if(cur<start) return "before"; if(cur>=end) return "after"; return "active";
};
const secsUntilEnd = () => {
  const end=new Date(); end.setHours(SHIFT_END.h,SHIFT_END.m,0,0);
  return Math.max(0,Math.floor((end-new Date())/1000));
};
const SHIFT_TOTAL_SECS = (toMins(SHIFT_END.h,SHIFT_END.m)-toMins(SHIFT_START.h,SHIFT_START.m))*60;

// ─── CSS ───────────────────────────────────────────────────────────────────
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
body{background:#07060f;}

@keyframes fadeUp  {from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
@keyframes fadeIn  {from{opacity:0}to{opacity:1}}
@keyframes pulse   {0%,100%{opacity:1}50%{opacity:0.4}}
@keyframes slideUp {from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}
@keyframes slideIn {from{opacity:0;transform:translateX(16px)}to{opacity:1;transform:translateX(0)}}
@keyframes lateGlow{0%,100%{box-shadow:0 0 0 0 rgba(255,77,109,0)}50%{box-shadow:0 0 24px 4px rgba(255,77,109,0.3)}}
@keyframes toastIn {from{opacity:0;transform:translateY(30px) scale(0.95)}to{opacity:1;transform:translateY(0) scale(1)}}
@keyframes tapBounce{0%{transform:scale(1)}50%{transform:scale(0.97)}100%{transform:scale(1)}}
@keyframes checkPop{0%{transform:scale(0)}60%{transform:scale(1.2)}100%{transform:scale(1)}}

.wt{font-family:'DM Sans',system-ui,sans-serif;color:#e4e2f0;min-height:100vh;background:#07060f;}
.mono{font-family:'DM Mono',monospace;}

/* Inputs */
.wt-input{width:100%;background:rgba(255,255,255,0.05);border:1.5px solid rgba(255,255,255,0.09);border-radius:12px;padding:13px 16px;font-size:15px;color:#fff;outline:none;font-family:'DM Sans',sans-serif;transition:border-color 0.2s,background 0.2s;}
.wt-input::placeholder{color:rgba(255,255,255,0.2);}
.wt-input:focus{border-color:rgba(139,120,255,0.6);background:rgba(139,120,255,0.07);}

/* Buttons */
.wt-btn{width:100%;border:none;border-radius:12px;padding:14px;font-size:15px;font-weight:700;cursor:pointer;font-family:'DM Sans',sans-serif;transition:transform 0.12s,opacity 0.12s,box-shadow 0.2s;}
.wt-btn:active{transform:scale(0.97);}
.wt-btn-primary{background:linear-gradient(135deg,#8b78ff,#b060f0);color:#fff;box-shadow:0 4px 24px rgba(139,120,255,0.35);}
.wt-btn-primary:hover{box-shadow:0 6px 32px rgba(139,120,255,0.55);}
.wt-btn-danger{background:linear-gradient(135deg,#ff4d6d,#e0003a);color:#fff;box-shadow:0 4px 20px rgba(255,77,109,0.3);}
.wt-btn-ghost{background:rgba(255,255,255,0.07);color:rgba(255,255,255,0.7);border:1.5px solid rgba(255,255,255,0.1);}
.wt-btn-sm{padding:7px 16px;font-size:12px;font-weight:700;border:none;border-radius:8px;cursor:pointer;font-family:'DM Sans',sans-serif;transition:all 0.15s;}

/* Cards */
.wt-card{background:rgba(255,255,255,0.035);border:1px solid rgba(255,255,255,0.085);border-radius:20px;backdrop-filter:blur(20px);}

/* Toggle */
.toggle-track{display:flex;background:rgba(255,255,255,0.06);border-radius:12px;padding:5px;gap:4px;border:1px solid rgba(255,255,255,0.07);}
.toggle-opt{flex:1;padding:10px;border:none;border-radius:9px;font-size:13px;font-weight:700;cursor:pointer;font-family:'DM Sans',sans-serif;transition:all 0.2s;letter-spacing:0.02em;}
.toggle-opt.active{background:rgba(139,120,255,0.85);color:#fff;box-shadow:0 2px 12px rgba(139,120,255,0.4);}
.toggle-opt.inactive{background:transparent;color:rgba(255,255,255,0.35);}

/* Pills */
.pill{display:inline-flex;align-items:center;gap:5px;padding:4px 11px;border-radius:99px;font-size:11px;font-weight:700;letter-spacing:0.07em;}
.pill-dot{width:6px;height:6px;border-radius:50%;}
.pill-purple{background:rgba(139,120,255,0.15);color:#b39dff;border:1px solid rgba(139,120,255,0.25);}
.pill-green{background:rgba(52,211,153,0.12);color:#6ee7b7;border:1px solid rgba(52,211,153,0.25);}
.pill-red{background:rgba(255,77,109,0.12);color:#ff8fa3;border:1px solid rgba(255,77,109,0.25);}
.pill-amber{background:rgba(251,191,36,0.12);color:#fde68a;border:1px solid rgba(251,191,36,0.25);}
.pill-blue{background:rgba(59,130,246,0.12);color:#93c5fd;border:1px solid rgba(59,130,246,0.25);}

/* Stat cards */
.stat-card{background:rgba(255,255,255,0.035);border:1px solid rgba(255,255,255,0.07);border-radius:16px;padding:20px 22px;}

/* Tables */
table{width:100%;border-collapse:collapse;}
th{font-size:11px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:rgba(255,255,255,0.3);padding:10px 18px;text-align:left;border-bottom:1px solid rgba(255,255,255,0.07);}
td{padding:14px 18px;font-size:14px;color:rgba(255,255,255,0.75);border-bottom:1px solid rgba(255,255,255,0.045);}
tr:last-child td{border-bottom:none;}
.wt-row-hover:hover{background:rgba(255,255,255,0.03);}

/* Shift card */
.shift-card{
  display:flex;align-items:center;gap:14px;
  background:rgba(255,255,255,0.035);border:1px solid rgba(255,255,255,0.085);
  border-radius:16px;padding:16px 18px;margin-bottom:10px;
  cursor:pointer;transition:all 0.18s;position:relative;overflow:hidden;
  animation:fadeUp 0.3s ease both;
}
.shift-card:hover{background:rgba(255,255,255,0.06);border-color:rgba(139,120,255,0.3);transform:translateY(-1px);}
.shift-card:active{transform:scale(0.99);}
.shift-card.today{border-color:rgba(139,120,255,0.45);background:rgba(139,120,255,0.07);}
.shift-card.today:hover{border-color:rgba(139,120,255,0.7);background:rgba(139,120,255,0.12);}
.shift-card.locked{opacity:0.35;cursor:not-allowed;pointer-events:none;}

.shift-orb{width:44px;height:44px;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0;}
.shift-orb-today{background:linear-gradient(135deg,rgba(139,120,255,0.3),rgba(176,96,240,0.2));border:1px solid rgba(139,120,255,0.4);}
.shift-orb-future{background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.08);}

.shift-dot{width:10px;height:10px;border-radius:50%;flex-shrink:0;}
.shift-dot-active{background:#8b78ff;box-shadow:0 0 8px rgba(139,120,255,0.8);}
.shift-dot-future{background:rgba(255,255,255,0.15);border:1.5px solid rgba(255,255,255,0.2);}

/* Admin */
.admin-layout{display:flex;min-height:100vh;}
.admin-sidebar{width:220px;flex-shrink:0;background:rgba(255,255,255,0.025);border-right:1px solid rgba(255,255,255,0.07);padding:28px 18px;display:flex;flex-direction:column;gap:6px;}
.admin-main{flex:1;padding:32px;overflow-y:auto;}
.sidebar-item{display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:10px;font-size:13px;font-weight:600;color:rgba(255,255,255,0.45);cursor:pointer;transition:all 0.15s;border:none;background:transparent;font-family:'DM Sans',sans-serif;width:100%;}
.sidebar-item:hover{background:rgba(255,255,255,0.06);color:rgba(255,255,255,0.75);}
.sidebar-item.active{background:rgba(139,120,255,0.15);color:#b39dff;}
.sidebar-icon{font-size:16px;width:20px;text-align:center;}

/* Modal */
.modal-bg{position:fixed;inset:0;background:rgba(0,0,0,0.75);display:flex;align-items:flex-end;justify-content:center;z-index:100;animation:fadeIn 0.15s ease;padding:20px;}
.modal-box{background:#13111f;border:1px solid rgba(255,255,255,0.12);border-radius:24px;padding:28px;width:100%;max-width:420px;animation:slideUp 0.25s ease;}

/* Toast */
.toast{position:fixed;bottom:28px;left:50%;transform:translateX(-50%);background:#1e1b2e;border:1px solid rgba(255,255,255,0.12);border-radius:12px;padding:12px 22px;font-size:14px;font-weight:500;color:#e4e2f0;animation:toastIn 0.3s ease;z-index:200;white-space:nowrap;box-shadow:0 8px 32px rgba(0,0,0,0.5);}

/* Late */
.late-banner{background:rgba(255,77,109,0.1);border:1px solid rgba(255,77,109,0.3);border-radius:14px;padding:14px 18px;margin-bottom:20px;animation:lateGlow 2s ease infinite;display:flex;align-items:center;gap:12px;}

::-webkit-scrollbar{width:6px;}
::-webkit-scrollbar-track{background:transparent;}
::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.1);border-radius:3px;}
`;

function StyleInjector() {
  useEffect(() => {
    const el = document.createElement("style");
    el.textContent = CSS;
    document.head.appendChild(el);
    return () => document.head.removeChild(el);
  }, []);
  return null;
}

function Toast({ msg, onDone }) {
  useEffect(() => { const t = setTimeout(onDone, 2600); return () => clearTimeout(t); }, []);
  return <div className="toast">{msg}</div>;
}

function Avatar({ initials, size = 36, color = "#8b78ff" }) {
  return (
    <div style={{
      width:size,height:size,borderRadius:"50%",
      background:`linear-gradient(135deg,${color}33,${color}22)`,
      border:`1.5px solid ${color}44`,
      display:"flex",alignItems:"center",justifyContent:"center",
      fontSize:size*0.33,fontWeight:700,color,flexShrink:0,
      fontFamily:"'DM Sans',sans-serif",
    }}>{initials}</div>
  );
}

// ─── Shift Ring ────────────────────────────────────────────────────────────
function ShiftRing({ secsLeft, late, size = 180 }) {
  const r=size/2-14, circ=2*Math.PI*r;
  const pct=Math.max(0,secsLeft/SHIFT_TOTAL_SECS);
  const dash=circ*pct;
  const stroke=late?"#ff4d6d":pct<0.15?"#fbbf24":"#8b78ff";

  const h=Math.floor(secsLeft/3600),m=Math.floor((secsLeft%3600)/60),s=secsLeft%60;
  const label=late?"OVERTIME":h>0?`${h}:${String(m).padStart(2,"0")}`:`${m}:${String(s).padStart(2,"0")}`;
  const sub=late?"Clock out now":h>0?"hrs remaining":"min remaining";

  return (
    <div style={{position:"relative",width:size,height:size,margin:"0 auto"}}>
      <svg width={size} height={size} style={{transform:"rotate(-90deg)"}}>
        <defs><filter id="glow2"><feGaussianBlur stdDeviation="3" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="9"/>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={stroke} strokeWidth="9" strokeLinecap="round"
          strokeDasharray={`${dash} ${circ}`} filter="url(#glow2)"
          style={{transition:"stroke-dasharray 0.8s cubic-bezier(.4,0,.2,1),stroke 0.5s ease"}}/>
      </svg>
      <div style={{position:"absolute",top:0,left:0,right:0,bottom:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",animation:late?"pulse 1.2s ease infinite":"none"}}>
        <div className="mono" style={{fontSize:late?20:30,fontWeight:500,color:late?"#ff8fa3":"#fff",letterSpacing:"-0.5px",lineHeight:1,transition:"color 0.4s"}}>{label}</div>
        <div style={{fontSize:10,color:"rgba(255,255,255,0.35)",marginTop:4,fontWeight:600,letterSpacing:"0.08em",textTransform:"uppercase"}}>{sub}</div>
      </div>
    </div>
  );
}

// ─── LOGIN MODAL (appears after tapping a shift) ───────────────────────────
function LoginModal({ shift, onSuccess, onClose }) {
  const [user, setUser]   = useState("");
  const [pass, setPass]   = useState("");
  const [err,  setErr]    = useState("");
  const [loading, setLoad] = useState(false);

  function submit() {
    setErr(""); setLoad(true);
    setTimeout(() => {
      setLoad(false);
      if (!user.trim() || !pass) { setErr("Fill in both fields."); return; }
      const acc = EMPLOYEES.find(a => a.username === user && a.password === pass);
      if (!acc) { setErr("Username or password is incorrect."); return; }
      onSuccess({ ...acc, role:"employee", loginTime:Date.now(), shift });
    }, 380);
  }

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal-box" onClick={e=>e.stopPropagation()}>
        {/* Shift summary */}
        <div style={{background:"rgba(139,120,255,0.08)",border:"1px solid rgba(139,120,255,0.2)",borderRadius:14,padding:"14px 16px",marginBottom:22}}>
          <div style={{fontSize:13,fontWeight:700,color:"#b39dff",marginBottom:4}}>Clocking in for</div>
          <div style={{fontSize:16,fontWeight:700,color:"#fff"}}>{shift.location}</div>
          <div style={{fontSize:13,color:"rgba(255,255,255,0.45)",marginTop:3}}>
            {fmtDay(shift.date)} · {fmtDate(shift.date)} · {fmt24(SHIFT_START.h,SHIFT_START.m)}–{fmt24(SHIFT_END.h,SHIFT_END.m)} · {shift.grade}
          </div>
        </div>

        {err && (
          <div style={{background:"rgba(255,77,109,0.1)",border:"1px solid rgba(255,77,109,0.25)",borderRadius:10,padding:"10px 14px",fontSize:13,color:"#ff8fa3",marginBottom:16,animation:"fadeIn 0.2s ease"}}>
            {err}
          </div>
        )}

        <div style={{marginBottom:14}}>
          <div style={{fontSize:11,fontWeight:700,letterSpacing:"0.09em",color:"rgba(255,255,255,0.35)",textTransform:"uppercase",marginBottom:6}}>Username</div>
          <input className="wt-input" placeholder="e.g. james.wright" value={user} onChange={e=>setUser(e.target.value)} onKeyDown={e=>e.key==="Enter"&&submit()} autoComplete="username"/>
        </div>
        <div style={{marginBottom:22}}>
          <div style={{fontSize:11,fontWeight:700,letterSpacing:"0.09em",color:"rgba(255,255,255,0.35)",textTransform:"uppercase",marginBottom:6}}>Password</div>
          <input className="wt-input" type="password" placeholder="••••••••" value={pass} onChange={e=>setPass(e.target.value)} onKeyDown={e=>e.key==="Enter"&&submit()} autoComplete="current-password"/>
        </div>

        <div style={{display:"flex",gap:10}}>
          <button className="wt-btn wt-btn-ghost" style={{padding:"13px"}} onClick={onClose}>Cancel</button>
          <button className="wt-btn wt-btn-primary" style={{opacity:loading?0.7:1}} onClick={submit} disabled={loading}>
            {loading?"Checking…":"Clock In →"}
          </button>
        </div>

        <div style={{marginTop:16,fontSize:12,color:"rgba(255,255,255,0.2)",textAlign:"center",lineHeight:1.6}}>
          Demo: james.wright / priya.sharma / dan.okafor / lucy.chen · pass123
        </div>
      </div>
    </div>
  );
}

// ─── SHIFT LIST (employee home before clocking in) ─────────────────────────
function ShiftList({ onLogin }) {
  const [tick, setTick]       = useState(new Date());
  const [role, setRole]       = useState("employee");
  const [adminUser, setAdminUser] = useState("");
  const [adminPass, setAdminPass] = useState("");
  const [adminErr, setAdminErr]   = useState("");
  const [adminLoad, setAdminLoad] = useState(false);
  const [selectedShift, setSelectedShift] = useState(null);

  useEffect(() => { const id=setInterval(()=>setTick(new Date()),1000); return ()=>clearInterval(id); },[]);

  const shifts  = generateShifts();
  const status  = shiftStatus();

  function tapShift(shift) {
    if (!isToday(shift.date)) return;
    if (status !== "active") return;
    setSelectedShift(shift);
  }

  function adminLogin() {
    setAdminErr(""); setAdminLoad(true);
    setTimeout(() => {
      setAdminLoad(false);
      if (adminUser === ADMIN.username && adminPass === ADMIN.password)
        return onLogin({ role:"admin", name:"Admin", username:"admin" });
      setAdminErr("Incorrect admin credentials.");
    }, 380);
  }

  const statusColor = status==="active"?"#6ee7b7":status==="before"?"#fde68a":"#ff8fa3";
  const statusText  = status==="active"
    ? `Open · ends ${fmt24(SHIFT_END.h,SHIFT_END.m)}`
    : status==="before" ? `Opens ${fmt24(SHIFT_START.h,SHIFT_START.m)}`
    : "Shift ended";

  return (
    <div className="wt" style={{minHeight:"100vh",padding:"0 0 32px"}}>
      {/* Background orb */}
      <div style={{position:"fixed",inset:0,overflow:"hidden",pointerEvents:"none"}}>
        <div style={{position:"absolute",top:"-20%",right:"-10%",width:500,height:500,borderRadius:"50%",background:"radial-gradient(circle,rgba(139,120,255,0.1) 0%,transparent 70%)"}}/>
      </div>

      {/* Header */}
      <div style={{
        background:"rgba(255,255,255,0.025)",borderBottom:"1px solid rgba(255,255,255,0.07)",
        padding:"20px 20px 16px",position:"sticky",top:0,zIndex:10,backdropFilter:"blur(20px)"
      }}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <div style={{width:32,height:32,borderRadius:9,background:"linear-gradient(135deg,#8b78ff,#b060f0)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:15}}>⏱</div>
            <span style={{fontSize:17,fontWeight:800,color:"#fff",letterSpacing:"-0.2px"}}>WorkTrack</span>
          </div>
          <div style={{textAlign:"right"}}>
            <div className="mono" style={{fontSize:14,color:"rgba(255,255,255,0.6)"}}>{fmtClock(tick)}</div>
            <div style={{fontSize:11,color:statusColor,fontWeight:600,marginTop:1}}>● {statusText}</div>
          </div>
        </div>

        {/* Role toggle */}
        <div className="toggle-track">
          <button className={`toggle-opt ${role==="employee"?"active":"inactive"}`} onClick={()=>{setRole("employee");setAdminErr("");}}>My Shifts</button>
          <button className={`toggle-opt ${role==="admin"?"active":"inactive"}`}    onClick={()=>{setRole("admin");setAdminErr("");}}>Admin</button>
        </div>
      </div>

      <div style={{padding:"20px 16px"}}>

        {/* ── Employee: shift list ── */}
        {role==="employee" && (
          <>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
              <div>
                <div style={{fontSize:18,fontWeight:800,color:"#fff"}}>Confirmed Shifts</div>
                <div style={{fontSize:12,color:"rgba(255,255,255,0.35)",marginTop:2}}>Tap today's shift to clock in</div>
              </div>
              <span className="pill pill-purple">{shifts.length} upcoming</span>
            </div>

            {shifts.map((shift, i) => {
              const today = isToday(shift.date);
              const canTap = today && status === "active";
              const locked = !today || status !== "active";
              return (
                <div
                  key={shift.id}
                  className={`shift-card${today?" today":""}${locked?" locked":""}`}
                  style={{animationDelay:`${i*0.04}s`}}
                  onClick={() => tapShift(shift)}
                >
                  {/* Left orb */}
                  <div className={`shift-orb ${today?"shift-orb-today":"shift-orb-future"}`}>
                    {today ? "📍" : "📅"}
                  </div>

                  {/* Info */}
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:15,fontWeight:700,color:"#fff",marginBottom:3}}>{shift.location}</div>
                    <div style={{fontSize:12,color:"rgba(255,255,255,0.45)",marginBottom:6,lineHeight:1.5}}>
                      {shift.label} · {fmt24(SHIFT_START.h,SHIFT_START.m)}–{fmt24(SHIFT_END.h,SHIFT_END.m)} · {shift.grade}
                    </div>
                    <div style={{display:"flex",alignItems:"center",gap:8}}>
                      <div style={{
                        fontSize:11,fontWeight:700,padding:"3px 10px",borderRadius:99,
                        background:today?"rgba(139,120,255,0.15)":"rgba(59,130,246,0.1)",
                        color:today?"#b39dff":"#93c5fd",
                        border:`1px solid ${today?"rgba(139,120,255,0.3)":"rgba(59,130,246,0.2)"}`,
                      }}>
                        {today ? (status==="active"?"Tap to Clock In":status==="before"?`Opens ${fmt24(SHIFT_START.h,SHIFT_START.m)}`:"Shift Ended") : "Confirmed"}
                      </div>
                      <div style={{fontSize:11,color:"rgba(255,255,255,0.3)",fontWeight:600}}>{fmtDate(shift.date)}</div>
                    </div>
                  </div>

                  {/* Right indicator */}
                  <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
                    <div className={`shift-dot ${today && status==="active"?"shift-dot-active":"shift-dot-future"}`}
                      style={today && status==="active" ? {animation:"pulse 1.5s ease infinite"} : {}}/>
                    {today && status==="active" && (
                      <div style={{fontSize:10,color:"rgba(139,120,255,0.7)",fontWeight:700,letterSpacing:"0.04em"}}>NOW</div>
                    )}
                  </div>
                </div>
              );
            })}
          </>
        )}

        {/* ── Admin login ── */}
        {role==="admin" && (
          <div style={{animation:"fadeIn 0.2s ease"}}>
            <div style={{fontSize:18,fontWeight:800,color:"#fff",marginBottom:4}}>Admin Access</div>
            <div style={{fontSize:13,color:"rgba(255,255,255,0.35)",marginBottom:24}}>Sign in to view and manage all sessions.</div>

            {adminErr && (
              <div style={{background:"rgba(255,77,109,0.1)",border:"1px solid rgba(255,77,109,0.25)",borderRadius:10,padding:"10px 14px",fontSize:13,color:"#ff8fa3",marginBottom:16,animation:"fadeIn 0.2s ease"}}>
                {adminErr}
              </div>
            )}

            <div style={{marginBottom:14}}>
              <div style={{fontSize:11,fontWeight:700,letterSpacing:"0.09em",color:"rgba(255,255,255,0.35)",textTransform:"uppercase",marginBottom:6}}>Username</div>
              <input className="wt-input" placeholder="admin" value={adminUser} onChange={e=>setAdminUser(e.target.value)} onKeyDown={e=>e.key==="Enter"&&adminLogin()} autoComplete="username"/>
            </div>
            <div style={{marginBottom:22}}>
              <div style={{fontSize:11,fontWeight:700,letterSpacing:"0.09em",color:"rgba(255,255,255,0.35)",textTransform:"uppercase",marginBottom:6}}>Password</div>
              <input className="wt-input" type="password" placeholder="••••••••" value={adminPass} onChange={e=>setAdminPass(e.target.value)} onKeyDown={e=>e.key==="Enter"&&adminLogin()} autoComplete="current-password"/>
            </div>
            <button className="wt-btn wt-btn-primary" onClick={adminLogin} disabled={adminLoad} style={{opacity:adminLoad?0.7:1}}>
              {adminLoad?"Checking…":"Open Admin Panel →"}
            </button>
            <div style={{marginTop:16,fontSize:12,color:"rgba(255,255,255,0.2)",textAlign:"center"}}>
              admin / admin123
            </div>
          </div>
        )}
      </div>

      {/* Login modal */}
      {selectedShift && (
        <LoginModal
          shift={selectedShift}
          onSuccess={u => { setSelectedShift(null); onLogin(u); }}
          onClose={() => setSelectedShift(null)}
        />
      )}
    </div>
  );
}

// ─── EMPLOYEE DASHBOARD (after clocking in) ────────────────────────────────
function EmployeeDash({ user, onLogout }) {
  const [tick, setTick] = useState(new Date());
  const [secs, setSecs] = useState(secsUntilEnd());
  const [late, setLate] = useState(false);
  const [confirmOut, setConfirmOut] = useState(false);
  const lateRef = useRef(false);

  useEffect(() => {
    const id = setInterval(() => {
      setTick(new Date());
      const s = secsUntilEnd(); setSecs(s);
      if (s===0 && !lateRef.current) { lateRef.current=true; setLate(true); }
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const elapsed  = Date.now() - user.loginTime;
  const shiftPct = Math.min(100, Math.round((elapsed / (SHIFT_TOTAL_SECS * 1000)) * 100));

  function doLogout() { onLogout({ ...user, logoutTime: Date.now() }); }

  return (
    <div className="wt" style={{minHeight:"100vh",padding:"0 0 32px"}}>
      <div style={{position:"fixed",inset:0,overflow:"hidden",pointerEvents:"none"}}>
        <div style={{position:"absolute",top:"-15%",right:"-10%",width:500,height:500,borderRadius:"50%",background:`radial-gradient(circle,${late?"rgba(255,77,109,0.1)":"rgba(139,120,255,0.1)"} 0%,transparent 70%)`,transition:"background 1s ease"}}/>
      </div>

      {/* Header */}
      <div style={{background:"rgba(255,255,255,0.025)",borderBottom:"1px solid rgba(255,255,255,0.07)",padding:"20px",position:"sticky",top:0,zIndex:10,backdropFilter:"blur(20px)"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <Avatar initials={user.initials} size={38} color={late?"#ff4d6d":"#8b78ff"}/>
            <div>
              <div style={{fontSize:15,fontWeight:700,color:"#fff"}}>{user.name}</div>
              <div style={{fontSize:11,color:"rgba(255,255,255,0.35)",fontWeight:500}}>ID: {user.id}</div>
            </div>
          </div>
          <div style={{textAlign:"right"}}>
            <div className="mono" style={{fontSize:14,color:"rgba(255,255,255,0.55)"}}>{fmtClock(tick)}</div>
            <div style={{fontSize:11,color:"rgba(255,255,255,0.25)",marginTop:1}}>WorkTrack</div>
          </div>
        </div>
      </div>

      <div style={{padding:"20px 16px"}}>
        {/* Shift info bar */}
        <div style={{background:"rgba(139,120,255,0.07)",border:"1px solid rgba(139,120,255,0.2)",borderRadius:14,padding:"12px 16px",marginBottom:20,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div>
            <div style={{fontSize:13,fontWeight:700,color:"#b39dff"}}>{user.shift?.location}</div>
            <div style={{fontSize:12,color:"rgba(255,255,255,0.4)",marginTop:2}}>
              {fmtDay(user.shift?.date)} · {fmt24(SHIFT_START.h,SHIFT_START.m)}–{fmt24(SHIFT_END.h,SHIFT_END.m)}
            </div>
          </div>
          <span className="pill pill-green"><span className="pill-dot" style={{background:"#34d399"}}/>ACTIVE</span>
        </div>

        {/* Late banner */}
        {late && (
          <div className="late-banner">
            <span style={{fontSize:20,animation:"pulse 1.2s ease infinite"}}>🚨</span>
            <div>
              <div style={{fontSize:14,fontWeight:700,color:"#ff8fa3"}}>Still clocked in</div>
              <div style={{fontSize:12,color:"rgba(255,255,255,0.45)",marginTop:2}}>Shift ended at {fmt24(SHIFT_END.h,SHIFT_END.m)} — please clock out.</div>
            </div>
          </div>
        )}

        {/* Ring */}
        <div className="wt-card" style={{padding:28,textAlign:"center",marginBottom:16}}>
          <ShiftRing secsLeft={secs} late={late} size={180}/>
          <div style={{marginTop:18,display:"flex",justifyContent:"center",gap:24}}>
            <div style={{textAlign:"center"}}>
              <div className="mono" style={{fontSize:14,fontWeight:500,color:"#fff"}}>{fmt24(SHIFT_START.h,SHIFT_START.m)}</div>
              <div style={{fontSize:10,color:"rgba(255,255,255,0.3)",fontWeight:600,letterSpacing:"0.08em",textTransform:"uppercase",marginTop:2}}>Start</div>
            </div>
            <div style={{width:1,background:"rgba(255,255,255,0.08)"}}/>
            <div style={{textAlign:"center"}}>
              <div className="mono" style={{fontSize:14,fontWeight:500,color:"#fff"}}>{fmt24(SHIFT_END.h,SHIFT_END.m)}</div>
              <div style={{fontSize:10,color:"rgba(255,255,255,0.3)",fontWeight:600,letterSpacing:"0.08em",textTransform:"uppercase",marginTop:2}}>End</div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:16}}>
          <div className="stat-card">
            <div className="mono" style={{fontSize:19,fontWeight:500,color:"#fff"}}>{fmtTimestamp(user.loginTime)}</div>
            <div style={{fontSize:11,color:"rgba(255,255,255,0.3)",fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase",marginTop:4}}>Clocked In</div>
          </div>
          <div className="stat-card">
            <div className="mono" style={{fontSize:19,fontWeight:500,color:"#fff"}}>{fmtDuration(elapsed)}</div>
            <div style={{fontSize:11,color:"rgba(255,255,255,0.3)",fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase",marginTop:4}}>On Shift</div>
          </div>
        </div>

        {/* Progress */}
        <div className="wt-card" style={{padding:"14px 18px",marginBottom:16}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
            <span style={{fontSize:12,color:"rgba(255,255,255,0.4)",fontWeight:600}}>Shift progress</span>
            <span className="mono" style={{fontSize:12,color:"rgba(255,255,255,0.5)"}}>{shiftPct}%</span>
          </div>
          <div style={{height:6,background:"rgba(255,255,255,0.07)",borderRadius:99,overflow:"hidden"}}>
            <div style={{height:"100%",borderRadius:99,background:late?"linear-gradient(90deg,#ff4d6d,#e0003a)":"linear-gradient(90deg,#8b78ff,#b060f0)",width:`${shiftPct}%`,transition:"width 0.8s ease,background 0.5s ease"}}/>
          </div>
        </div>

        <button
          className="wt-btn wt-btn-danger"
          style={{animation:late?"pulse 1.5s ease infinite":"none"}}
          onClick={()=>setConfirmOut(true)}
        >
          Clock Out
        </button>
      </div>

      {/* Confirm clock out */}
      {confirmOut && (
        <div className="modal-bg" onClick={()=>setConfirmOut(false)}>
          <div className="modal-box" onClick={e=>e.stopPropagation()}>
            <div style={{fontSize:18,fontWeight:700,color:"#fff",marginBottom:8}}>Clock out?</div>
            <div style={{fontSize:14,color:"rgba(255,255,255,0.5)",marginBottom:24}}>This will end your session and record your finish time.</div>
            <div style={{display:"flex",gap:10}}>
              <button className="wt-btn wt-btn-ghost" style={{padding:"11px"}} onClick={()=>setConfirmOut(false)}>Cancel</button>
              <button className="wt-btn wt-btn-danger" style={{padding:"11px"}} onClick={doLogout}>Clock Out</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── ADMIN DASHBOARD ────────────────────────────────────────────────────────
function AdminDash({ onLogout, sessions, setSessions }) {
  const [tick, setTick]  = useState(new Date());
  const [tab,  setTab]   = useState("live");
  const [toast,setToast] = useState("");
  const [,forceUpdate]   = useState(0);

  useEffect(()=>{const id=setInterval(()=>{setTick(new Date());forceUpdate(x=>x+1);},1000);return()=>clearInterval(id);},[]);

  function forceOut(username, name) {
    setSessions(p=>p.map(s=>s.username===username&&!s.logoutTime?{...s,logoutTime:Date.now(),forcedOut:true}:s));
    setToast(`${name.split(" ")[0]} clocked out by admin`);
  }

  const active  = sessions.filter(s=>!s.logoutTime);
  const history = sessions.filter(s=> s.logoutTime);
  const avgMs   = history.length ? history.reduce((a,s)=>a+(s.logoutTime-s.loginTime),0)/history.length : 0;
  const lateCount = active.filter(()=>secsUntilEnd()===0).length;

  const TABS=[{id:"live",icon:"⚡",label:"Live"},{id:"history",icon:"📋",label:"History"}];

  return (
    <div className="wt admin-layout">
      <div className="admin-sidebar">
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:28,paddingLeft:4}}>
          <div style={{width:28,height:28,borderRadius:7,background:"linear-gradient(135deg,#8b78ff,#b060f0)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14}}>⏱</div>
          <span style={{fontSize:15,fontWeight:800,color:"#fff"}}>WorkTrack</span>
        </div>
        <div style={{fontSize:10,fontWeight:700,letterSpacing:"0.1em",color:"rgba(255,255,255,0.2)",textTransform:"uppercase",marginBottom:8,paddingLeft:12}}>Views</div>
        {TABS.map(t=>(
          <button key={t.id} className={`sidebar-item ${tab===t.id?"active":""}`} onClick={()=>setTab(t.id)}>
            <span className="sidebar-icon">{t.icon}</span>{t.label}
            {t.id==="live"&&active.length>0&&(
              <span style={{marginLeft:"auto",background:lateCount?"#ff4d6d":"#8b78ff",color:"#fff",borderRadius:99,fontSize:10,fontWeight:800,padding:"1px 7px"}}>{active.length}</span>
            )}
          </button>
        ))}
        <div style={{marginTop:"auto"}}>
          <div className="mono" style={{fontSize:13,color:"rgba(255,255,255,0.35)",marginBottom:12,paddingLeft:4}}>{fmtClock(tick)}</div>
          <button className="sidebar-item" onClick={onLogout}><span className="sidebar-icon">→</span>Sign Out</button>
        </div>
      </div>

      <div className="admin-main">
        {toast&&<Toast msg={toast} onDone={()=>setToast("")}/>}

        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:14,marginBottom:28}}>
          {[
            {label:"Clocked In",val:active.length,color:"#b39dff"},
            {label:"Overtime",  val:lateCount,    color:lateCount?"#ff8fa3":"rgba(255,255,255,0.4)"},
            {label:"Completed", val:history.length,color:"#6ee7b7"},
            {label:"Avg Session",val:avgMs?fmtDuration(avgMs):"—",color:"#fde68a"},
          ].map(s=>(
            <div key={s.label} className="stat-card">
              <div className="mono" style={{fontSize:22,fontWeight:500,color:s.color,lineHeight:1}}>{s.val}</div>
              <div style={{fontSize:11,color:"rgba(255,255,255,0.3)",fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase",marginTop:5}}>{s.label}</div>
            </div>
          ))}
        </div>

        {tab==="live"&&(
          <div style={{animation:"fadeIn 0.2s ease"}}>
            <div style={{fontSize:16,fontWeight:700,color:"#fff",marginBottom:16,display:"flex",alignItems:"center",gap:8}}>
              <div style={{width:8,height:8,borderRadius:"50%",background:"#6ee7b7",boxShadow:"0 0 10px #6ee7b7",animation:"pulse 2s ease infinite"}}/>
              Active Sessions
            </div>
            <div className="wt-card" style={{overflow:"hidden"}}>
              {active.length===0?(
                <div style={{padding:40,textAlign:"center",color:"rgba(255,255,255,0.2)",fontSize:14}}>No employees clocked in right now.</div>
              ):(
                <table>
                  <thead><tr><th>Employee</th><th>Shift</th><th>In</th><th>Duration</th><th>Status</th><th>Action</th></tr></thead>
                  <tbody>
                    {active.map(s=>{
                      const el=Date.now()-s.loginTime;
                      const isLate=secsUntilEnd()===0;
                      return(
                        <tr key={s.username} className="wt-row-hover">
                          <td><div style={{display:"flex",alignItems:"center",gap:10}}><Avatar initials={s.initials} size={30} color={isLate?"#ff4d6d":"#8b78ff"}/><div><div style={{fontWeight:600,color:"#fff",fontSize:14}}>{s.name}</div><div style={{fontSize:11,color:"rgba(255,255,255,0.3)"}}>{s.id}</div></div></div></td>
                          <td style={{fontSize:13}}>{s.shift?.location?.split(" ").slice(-2).join(" ")}<br/><span style={{color:"rgba(255,255,255,0.35)",fontSize:11}}>{s.shift&&fmtDate(s.shift.date)}</span></td>
                          <td className="mono">{fmtTimestamp(s.loginTime)}</td>
                          <td className="mono">{fmtDuration(el)}</td>
                          <td>{isLate?<span className="pill pill-red"><span className="pill-dot" style={{background:"#ff4d6d",animation:"pulse 1s infinite"}}/>OVERTIME</span>:<span className="pill pill-green"><span className="pill-dot" style={{background:"#34d399"}}/>ON SHIFT</span>}</td>
                          <td><button className="wt-btn-sm" style={{background:"rgba(255,77,109,0.12)",color:"#ff8fa3",border:"1px solid rgba(255,77,109,0.25)"}} onClick={()=>forceOut(s.username,s.name)}>Force Out</button></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {tab==="history"&&(
          <div style={{animation:"fadeIn 0.2s ease"}}>
            <div style={{fontSize:16,fontWeight:700,color:"#fff",marginBottom:16}}>Session History</div>
            <div className="wt-card" style={{overflow:"hidden"}}>
              {history.length===0?(
                <div style={{padding:40,textAlign:"center",color:"rgba(255,255,255,0.2)",fontSize:14}}>No completed sessions yet.</div>
              ):(
                <table>
                  <thead><tr><th>Employee</th><th>Shift</th><th>In</th><th>Out</th><th>Duration</th><th>Note</th></tr></thead>
                  <tbody>
                    {[...history].reverse().map((s,i)=>(
                      <tr key={i} className="wt-row-hover" style={{animation:`slideIn 0.2s ease ${i*0.04}s both`}}>
                        <td><div style={{display:"flex",alignItems:"center",gap:10}}><Avatar initials={s.initials} size={28} color="rgba(255,255,255,0.3)"/><div><div style={{fontWeight:600,color:"#fff",fontSize:14}}>{s.name}</div><div style={{fontSize:11,color:"rgba(255,255,255,0.3)"}}>{s.id}</div></div></div></td>
                        <td style={{fontSize:13}}>{s.shift?.location?.split(" ").slice(-2).join(" ")}<br/><span style={{color:"rgba(255,255,255,0.35)",fontSize:11}}>{s.shift&&fmtDate(s.shift.date)}</span></td>
                        <td className="mono">{fmtTimestamp(s.loginTime)}</td>
                        <td className="mono">{fmtTimestamp(s.logoutTime)}</td>
                        <td className="mono">{fmtDuration(s.logoutTime-s.loginTime)}</td>
                        <td>{s.forcedOut?<span className="pill pill-amber">ADMIN OUT</span>:<span className="pill pill-purple">SELF OUT</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── ROOT ──────────────────────────────────────────────────────────────────
export default function App() {
  const [user,     setUser]     = useState(null);
  const [sessions, setSessions] = useState([]);

  function login(u) {
    setUser(u);
    if (u.role==="employee") setSessions(p=>[...p,{...u}]);
  }

  function empLogout(record) {
    setSessions(p=>p.map(s=>s.username===record.username&&!s.logoutTime?record:s));
    setUser(null);
  }

  return (
    <>
      <StyleInjector/>
      {!user
        ? <ShiftList onLogin={login}/>
        : user.role==="admin"
          ? <AdminDash onLogout={()=>setUser(null)} sessions={sessions} setSessions={setSessions}/>
          : <EmployeeDash user={user} onLogout={empLogout}/>
      }
    </>
  );
}
