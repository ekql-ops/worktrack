import { useState, useEffect, useRef, useCallback } from "react";
import { api, ApiError, getToken, setToken } from "./api";

// ─── Helpers ───────────────────────────────────────────────────────────────
// Shift times now arrive from the API as "HH:MM:SS" and session timestamps as
// ISO instants, so the formatting helpers work off server data rather than
// module-level constants invented at page load.

const fmt24 = t => (t ? String(t).slice(0, 5) : "--:--");

const fmtClock     = d => d.toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit",second:"2-digit"});
const fmtTimestamp = ts => ts ? fmtClock(new Date(ts)) : "—";
const fmtDuration  = ms => {
  const s=Math.floor(ms/1000),h=Math.floor(s/3600),m=Math.floor((s%3600)/60),sec=s%60;
  if(h>0) return `${h}h ${m}m`; if(m>0) return `${m}m ${sec}s`; return `${sec}s`;
};
const fmtDate = d => new Date(d).toLocaleDateString("en-GB",{day:"2-digit",month:"2-digit"});
const fmtDay  = d => new Date(d).toLocaleDateString("en-GB",{weekday:"long"});

/** Combines a shift's date ("2026-09-09") and time ("16:30:00") into a Date. */
const shiftMoment = (date, time) => {
  const [h, m] = String(time || "00:00:00").split(":").map(Number);
  const d = new Date(date + "T00:00:00");
  d.setHours(h, m, 0, 0);
  return d;
};

const secsUntil = when => Math.max(0, Math.floor((when - new Date()) / 1000));

// ─── Error banner ──────────────────────────────────────────────────────────
function ErrorBox({ msg }) {
  if (!msg) return null;
  return (
    <div style={{background:"rgba(255,77,109,0.1)",border:"1px solid rgba(255,77,109,0.25)",borderRadius:10,padding:"10px 14px",fontSize:13,color:"#ff8fa3",marginBottom:16,animation:"fadeIn 0.2s ease"}}>
      {msg}
    </div>
  );
}

// ─── Full-screen loading ───────────────────────────────────────────────────
function Loading({ label = "Loading…" }) {
  return (
    <div className="wt" style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:14}}>
      <div style={{width:34,height:34,borderRadius:"50%",border:"3px solid rgba(139,120,255,0.2)",borderTopColor:"#8b78ff",animation:"spin 0.8s linear infinite"}}/>
      <div style={{fontSize:13,color:"rgba(255,255,255,0.4)"}}>{label}</div>
    </div>
  );
}
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
@keyframes spin    {to{transform:rotate(360deg)}}

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
// totalSecs is passed in because shift length now comes from the server
// rather than a constant computed when the module loaded.
function ShiftRing({ secsLeft, late, size = 180, totalSecs = 0 }) {
  const r=size/2-14, circ=2*Math.PI*r;
  const pct=totalSecs>0?Math.min(1,Math.max(0,secsLeft/totalSecs)):0;
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
// ─── LOGIN ─────────────────────────────────────────────────────────────────
// The shift list is behind authentication now, so signing in comes first
// rather than a shift being tapped by an anonymous visitor. Role comes from
// the token, which is why the old employee/admin toggle is gone.
function LoginScreen({ onSignedIn }) {
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [err,  setErr]  = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (busy) return;
    setErr("");
    if (!user.trim() || !pass) { setErr("Fill in both fields."); return; }
    setBusy(true);
    try {
      const res = await api.login(user.trim(), pass);
      setToken(res.token);
      onSignedIn(res.user);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="wt" style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
      <div style={{position:"fixed",inset:0,overflow:"hidden",pointerEvents:"none"}}>
        <div style={{position:"absolute",top:"-20%",right:"-10%",width:500,height:500,borderRadius:"50%",background:"radial-gradient(circle,rgba(139,120,255,0.1) 0%,transparent 70%)"}}/>
      </div>

      <div className="wt-card" style={{padding:28,width:"100%",maxWidth:380,position:"relative"}}>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:22}}>
          <div style={{width:34,height:34,borderRadius:9,background:"linear-gradient(135deg,#8b78ff,#b060f0)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16}}>⏱</div>
          <span style={{fontSize:19,fontWeight:800,color:"#fff",letterSpacing:"-0.2px"}}>WorkTrack</span>
        </div>

        <div style={{fontSize:14,color:"rgba(255,255,255,0.45)",marginBottom:22,lineHeight:1.5}}>
          Sign in to see your shifts and clock in.
        </div>

        <ErrorBox msg={err}/>

        <div style={{marginBottom:14}}>
          <div style={{fontSize:11,fontWeight:700,letterSpacing:"0.09em",color:"rgba(255,255,255,0.35)",textTransform:"uppercase",marginBottom:6}}>Username</div>
          <input className="wt-input" placeholder="e.g. james.wright" value={user} onChange={e=>setUser(e.target.value)} onKeyDown={e=>e.key==="Enter"&&submit()} autoComplete="username"/>
        </div>
        <div style={{marginBottom:22}}>
          <div style={{fontSize:11,fontWeight:700,letterSpacing:"0.09em",color:"rgba(255,255,255,0.35)",textTransform:"uppercase",marginBottom:6}}>Password</div>
          <input className="wt-input" type="password" placeholder="••••••••" value={pass} onChange={e=>setPass(e.target.value)} onKeyDown={e=>e.key==="Enter"&&submit()} autoComplete="current-password"/>
        </div>

        <button className="wt-btn wt-btn-primary" onClick={submit} disabled={busy} style={{opacity:busy?0.7:1}}>
          {busy ? "Signing in…" : "Sign In →"}
        </button>

        <div style={{marginTop:18,fontSize:12,color:"rgba(255,255,255,0.22)",textAlign:"center",lineHeight:1.7}}>
          Demo accounts — james.wright, priya.sharma,<br/>dan.okafor, lucy.chen, or admin<br/>
          password: worktrack-demo
        </div>
        <div style={{marginTop:12,fontSize:11,color:"rgba(255,255,255,0.18)",textAlign:"center",lineHeight:1.6}}>
          The API sleeps when idle — the first sign-in of the day<br/>can take a few seconds to wake it.
        </div>
      </div>
    </div>
  );
}
// ─── SHIFT LIST (employee home before clocking in) ─────────────────────────
function ShiftList({ user, onClockedIn, onSignOut }) {
  const [tick, setTick]     = useState(new Date());
  const [shifts, setShifts] = useState(null);
  const [err, setErr]       = useState("");
  const [busy, setBusy]     = useState(false);
  const [confirm, setConfirm] = useState(null);

  useEffect(() => { const id=setInterval(()=>setTick(new Date()),1000); return ()=>clearInterval(id); },[]);

  useEffect(() => {
    let alive = true;
    api.shifts()
      .then(s => { if (alive) setShifts(s); })
      .catch(e => { if (alive) { setErr(e.message); setShifts([]); } });
    return () => { alive = false; };
  }, []);

  async function doClockIn() {
    setBusy(true); setErr("");
    try {
      const session = await api.clockIn();
      onClockedIn(session);
    } catch (e) {
      setErr(e.message);
      setConfirm(null);
    } finally {
      setBusy(false);
    }
  }

  if (shifts === null) return <Loading label="Loading your shifts…"/>;

  const todays = shifts.find(s => s.isToday);

  return (
    <div className="wt" style={{minHeight:"100vh",padding:"0 0 32px"}}>
      <div style={{position:"fixed",inset:0,overflow:"hidden",pointerEvents:"none"}}>
        <div style={{position:"absolute",top:"-20%",right:"-10%",width:500,height:500,borderRadius:"50%",background:"radial-gradient(circle,rgba(139,120,255,0.1) 0%,transparent 70%)"}}/>
      </div>

      {/* Header */}
      <div style={{background:"rgba(255,255,255,0.025)",borderBottom:"1px solid rgba(255,255,255,0.07)",padding:"20px 20px 16px",position:"sticky",top:0,zIndex:10,backdropFilter:"blur(20px)"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <Avatar initials={user.initials} size={34}/>
            <div>
              <div style={{fontSize:15,fontWeight:700,color:"#fff"}}>{user.fullName}</div>
              <div style={{fontSize:11,color:"rgba(255,255,255,0.35)"}}>ID: {user.employeeRef}</div>
            </div>
          </div>
          <div style={{textAlign:"right"}}>
            <div className="mono" style={{fontSize:14,color:"rgba(255,255,255,0.6)"}}>{fmtClock(tick)}</div>
            <button onClick={onSignOut} style={{background:"none",border:"none",color:"rgba(255,255,255,0.35)",fontSize:11,fontWeight:600,cursor:"pointer",padding:"2px 0",marginTop:1}}>Sign out</button>
          </div>
        </div>
      </div>

      <div style={{padding:"20px 16px"}}>
        <ErrorBox msg={err}/>

        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
          <div>
            <div style={{fontSize:18,fontWeight:800,color:"#fff"}}>Confirmed Shifts</div>
            <div style={{fontSize:12,color:"rgba(255,255,255,0.35)",marginTop:2}}>
              {todays ? "Tap today's shift to clock in" : "No shift scheduled today"}
            </div>
          </div>
          <span className="pill pill-purple">{shifts.length} upcoming</span>
        </div>

        {shifts.length === 0 && (
          <div className="wt-card" style={{padding:40,textAlign:"center",color:"rgba(255,255,255,0.25)",fontSize:14}}>
            Nothing scheduled.
          </div>
        )}

        {shifts.map((shift, i) => {
          const today = shift.isToday;
          return (
            <div
              key={shift.id}
              className={`shift-card${today?" today":""}${today?"":" locked"}`}
              style={{animationDelay:`${i*0.04}s`}}
              onClick={() => today && setConfirm(shift)}
            >
              <div className={`shift-orb ${today?"shift-orb-today":"shift-orb-future"}`}>
                {today ? "📍" : "📅"}
              </div>

              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:15,fontWeight:700,color:"#fff",marginBottom:3}}>{shift.location}</div>
                <div style={{fontSize:12,color:"rgba(255,255,255,0.45)",marginBottom:6,lineHeight:1.5}}>
                  {fmtDay(shift.date)} · {fmt24(shift.startTime)}–{fmt24(shift.endTime)} · {shift.grade}
                </div>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <div style={{
                    fontSize:11,fontWeight:700,padding:"3px 10px",borderRadius:99,
                    background:today?"rgba(139,120,255,0.15)":"rgba(59,130,246,0.1)",
                    color:today?"#b39dff":"#93c5fd",
                    border:`1px solid ${today?"rgba(139,120,255,0.3)":"rgba(59,130,246,0.2)"}`,
                  }}>
                    {today ? "Tap to Clock In" : "Confirmed"}
                  </div>
                  <div style={{fontSize:11,color:"rgba(255,255,255,0.3)",fontWeight:600}}>{fmtDate(shift.date)}</div>
                </div>
              </div>

              <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
                <div className={`shift-dot ${today?"shift-dot-active":"shift-dot-future"}`}
                  style={today ? {animation:"pulse 1.5s ease infinite"} : {}}/>
                {today && <div style={{fontSize:10,color:"rgba(139,120,255,0.7)",fontWeight:700,letterSpacing:"0.04em"}}>NOW</div>}
              </div>
            </div>
          );
        })}
      </div>

      {/* Confirm clock in */}
      {confirm && (
        <div className="modal-bg" onClick={()=>!busy&&setConfirm(null)}>
          <div className="modal-box" onClick={e=>e.stopPropagation()}>
            <div style={{background:"rgba(139,120,255,0.08)",border:"1px solid rgba(139,120,255,0.2)",borderRadius:14,padding:"14px 16px",marginBottom:22}}>
              <div style={{fontSize:13,fontWeight:700,color:"#b39dff",marginBottom:4}}>Clocking in for</div>
              <div style={{fontSize:16,fontWeight:700,color:"#fff"}}>{confirm.location}</div>
              <div style={{fontSize:13,color:"rgba(255,255,255,0.45)",marginTop:3}}>
                {fmtDay(confirm.date)} · {fmtDate(confirm.date)} · {fmt24(confirm.startTime)}–{fmt24(confirm.endTime)} · {confirm.grade}
              </div>
            </div>
            <div style={{display:"flex",gap:10}}>
              <button className="wt-btn wt-btn-ghost" style={{padding:"13px"}} onClick={()=>setConfirm(null)} disabled={busy}>Cancel</button>
              <button className="wt-btn wt-btn-primary" onClick={doClockIn} disabled={busy} style={{opacity:busy?0.7:1}}>
                {busy?"Clocking in…":"Clock In →"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
// ─── EMPLOYEE DASHBOARD (after clocking in) ────────────────────────────────
function EmployeeDash({ user, session, onClockedOut, onSignOut }) {
  const [tick, setTick] = useState(new Date());
  const [confirmOut, setConfirmOut] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr]   = useState("");

  // The shift window comes from the session's own shift, so start, end and
  // progress reflect what the server actually scheduled rather than a
  // constant invented when the page loaded.
  const start = shiftMoment(session.shiftDate, session.shiftStart);
  const end   = shiftMoment(session.shiftDate, session.shiftEnd);
  const totalMs = Math.max(1, end - start);

  useEffect(() => {
    const id = setInterval(() => setTick(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const secs = secsUntil(end);
  const late = tick > end;

  const elapsed  = tick - new Date(session.clockInAt);
  const shiftPct = Math.min(100, Math.max(0, Math.round(((tick - start) / totalMs) * 100)));

  async function doClockOut() {
    setBusy(true); setErr("");
    try {
      await api.clockOut();
      onClockedOut();
    } catch (e) {
      setErr(e.message);
      setConfirmOut(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="wt" style={{minHeight:"100vh",padding:"0 0 32px"}}>
      <div style={{position:"fixed",inset:0,overflow:"hidden",pointerEvents:"none"}}>
        <div style={{position:"absolute",top:"-15%",right:"-10%",width:500,height:500,borderRadius:"50%",background:`radial-gradient(circle,${late?"rgba(255,77,109,0.1)":"rgba(139,120,255,0.1)"} 0%,transparent 70%)`,transition:"background 1s ease"}}/>
      </div>

      <div style={{background:"rgba(255,255,255,0.025)",borderBottom:"1px solid rgba(255,255,255,0.07)",padding:"20px",position:"sticky",top:0,zIndex:10,backdropFilter:"blur(20px)"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <Avatar initials={user.initials} size={38} color={late?"#ff4d6d":"#8b78ff"}/>
            <div>
              <div style={{fontSize:15,fontWeight:700,color:"#fff"}}>{user.fullName}</div>
              <div style={{fontSize:11,color:"rgba(255,255,255,0.35)",fontWeight:500}}>ID: {user.employeeRef}</div>
            </div>
          </div>
          <div style={{textAlign:"right"}}>
            <div className="mono" style={{fontSize:14,color:"rgba(255,255,255,0.55)"}}>{fmtClock(tick)}</div>
            <button onClick={onSignOut} style={{background:"none",border:"none",color:"rgba(255,255,255,0.25)",fontSize:11,fontWeight:600,cursor:"pointer",padding:"2px 0",marginTop:1}}>Sign out</button>
          </div>
        </div>
      </div>

      <div style={{padding:"20px 16px"}}>
        <ErrorBox msg={err}/>

        <div style={{background:"rgba(139,120,255,0.07)",border:"1px solid rgba(139,120,255,0.2)",borderRadius:14,padding:"12px 16px",marginBottom:20,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div>
            <div style={{fontSize:13,fontWeight:700,color:"#b39dff"}}>{session.location}</div>
            <div style={{fontSize:12,color:"rgba(255,255,255,0.4)",marginTop:2}}>
              {fmtDay(session.shiftDate)} · {fmt24(session.shiftStart)}–{fmt24(session.shiftEnd)}
            </div>
          </div>
          <span className="pill pill-green"><span className="pill-dot" style={{background:"#34d399"}}/>ACTIVE</span>
        </div>

        {late && (
          <div className="late-banner">
            <span style={{fontSize:20,animation:"pulse 1.2s ease infinite"}}>🚨</span>
            <div>
              <div style={{fontSize:14,fontWeight:700,color:"#ff8fa3"}}>Still clocked in</div>
              <div style={{fontSize:12,color:"rgba(255,255,255,0.45)",marginTop:2}}>Shift ended at {fmt24(session.shiftEnd)} — please clock out.</div>
            </div>
          </div>
        )}

        <div className="wt-card" style={{padding:28,textAlign:"center",marginBottom:16}}>
          <ShiftRing secsLeft={secs} late={late} size={180} totalSecs={totalMs/1000}/>
          <div style={{marginTop:18,display:"flex",justifyContent:"center",gap:24}}>
            <div style={{textAlign:"center"}}>
              <div className="mono" style={{fontSize:14,fontWeight:500,color:"#fff"}}>{fmt24(session.shiftStart)}</div>
              <div style={{fontSize:10,color:"rgba(255,255,255,0.3)",fontWeight:600,letterSpacing:"0.08em",textTransform:"uppercase",marginTop:2}}>Start</div>
            </div>
            <div style={{width:1,background:"rgba(255,255,255,0.08)"}}/>
            <div style={{textAlign:"center"}}>
              <div className="mono" style={{fontSize:14,fontWeight:500,color:"#fff"}}>{fmt24(session.shiftEnd)}</div>
              <div style={{fontSize:10,color:"rgba(255,255,255,0.3)",fontWeight:600,letterSpacing:"0.08em",textTransform:"uppercase",marginTop:2}}>End</div>
            </div>
          </div>
        </div>

        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:16}}>
          <div className="stat-card">
            <div className="mono" style={{fontSize:19,fontWeight:500,color:"#fff"}}>{fmtTimestamp(session.clockInAt)}</div>
            <div style={{fontSize:11,color:"rgba(255,255,255,0.3)",fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase",marginTop:4}}>Clocked In</div>
          </div>
          <div className="stat-card">
            <div className="mono" style={{fontSize:19,fontWeight:500,color:"#fff"}}>{fmtDuration(elapsed)}</div>
            <div style={{fontSize:11,color:"rgba(255,255,255,0.3)",fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase",marginTop:4}}>On Shift</div>
          </div>
        </div>

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

      {confirmOut && (
        <div className="modal-bg" onClick={()=>!busy&&setConfirmOut(false)}>
          <div className="modal-box" onClick={e=>e.stopPropagation()}>
            <div style={{fontSize:18,fontWeight:700,color:"#fff",marginBottom:8}}>Clock out?</div>
            <div style={{fontSize:14,color:"rgba(255,255,255,0.5)",marginBottom:24}}>This will end your session and record your finish time.</div>
            <div style={{display:"flex",gap:10}}>
              <button className="wt-btn wt-btn-ghost" style={{padding:"11px"}} onClick={()=>setConfirmOut(false)} disabled={busy}>Cancel</button>
              <button className="wt-btn wt-btn-danger" style={{padding:"11px"}} onClick={doClockOut} disabled={busy}>
                {busy?"Clocking out…":"Clock Out"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
// ─── ADMIN DASHBOARD ────────────────────────────────────────────────────────
function AdminDash({ onSignOut }) {
  const [tick, setTick]   = useState(new Date());
  const [tab,  setTab]    = useState("live");
  const [toast,setToast]  = useState("");
  const [rows, setRows]   = useState(null);
  const [err,  setErr]    = useState("");
  const [busyId, setBusyId] = useState(null);

  // Clocks tick every second, but the server is only polled every ten. A
  // per-second poll would be sixty requests a minute for a dashboard whose
  // rows change a handful of times a day.
  const refresh = useCallback(async () => {
    try {
      const all = await api.adminAll();
      setRows(all);
      setErr("");
    } catch (e) {
      setErr(e.message);
      setRows(r => r ?? []);
    }
  }, []);

  useEffect(() => {
    refresh();
    const poll = setInterval(refresh, 10000);
    const clock = setInterval(() => setTick(new Date()), 1000);
    return () => { clearInterval(poll); clearInterval(clock); };
  }, [refresh]);

  async function forceOut(session) {
    setBusyId(session.id);
    try {
      await api.adminForceOut(session.id);
      setToast(`${session.employeeName.split(" ")[0]} clocked out by admin`);
      await refresh();
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusyId(null);
    }
  }

  if (rows === null) return <Loading label="Loading sessions…"/>;

  const active  = rows.filter(s => s.open);
  const history = rows.filter(s => !s.open);
  const avgMs   = history.length
    ? history.reduce((a,s) => a + (new Date(s.clockOutAt) - new Date(s.clockInAt)), 0) / history.length
    : 0;
  const lateCount = active.filter(s => s.overrunning).length;

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
          <button className="sidebar-item" onClick={onSignOut}><span className="sidebar-icon">→</span>Sign Out</button>
        </div>
      </div>

      <div className="admin-main">
        {toast&&<Toast msg={toast} onDone={()=>setToast("")}/>}

        <ErrorBox msg={err}/>

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
                    {active.map(s=>(
                      <tr key={s.id} className="wt-row-hover">
                        <td><div style={{display:"flex",alignItems:"center",gap:10}}><Avatar initials={s.initials} size={30} color={s.overrunning?"#ff4d6d":"#8b78ff"}/><div><div style={{fontWeight:600,color:"#fff",fontSize:14}}>{s.employeeName}</div><div style={{fontSize:11,color:"rgba(255,255,255,0.3)"}}>{s.employeeRef}</div></div></div></td>
                        <td style={{fontSize:13}}>{s.location}<br/><span style={{color:"rgba(255,255,255,0.35)",fontSize:11}}>{fmtDate(s.shiftDate)} · {fmt24(s.shiftStart)}–{fmt24(s.shiftEnd)}</span></td>
                        <td className="mono">{fmtTimestamp(s.clockInAt)}</td>
                        <td className="mono">{fmtDuration(tick - new Date(s.clockInAt))}</td>
                        <td>{s.overrunning?<span className="pill pill-red"><span className="pill-dot" style={{background:"#ff4d6d",animation:"pulse 1s infinite"}}/>OVERTIME</span>:<span className="pill pill-green"><span className="pill-dot" style={{background:"#34d399"}}/>ON SHIFT</span>}</td>
                        <td><button className="wt-btn-sm" disabled={busyId===s.id} style={{background:"rgba(255,77,109,0.12)",color:"#ff8fa3",border:"1px solid rgba(255,77,109,0.25)",opacity:busyId===s.id?0.5:1}} onClick={()=>forceOut(s)}>{busyId===s.id?"…":"Force Out"}</button></td>
                      </tr>
                    ))}
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
                    {history.map((s,i)=>(
                      <tr key={s.id} className="wt-row-hover" style={{animation:`slideIn 0.2s ease ${Math.min(i,10)*0.04}s both`}}>
                        <td><div style={{display:"flex",alignItems:"center",gap:10}}><Avatar initials={s.initials} size={28} color="rgba(255,255,255,0.3)"/><div><div style={{fontWeight:600,color:"#fff",fontSize:14}}>{s.employeeName}</div><div style={{fontSize:11,color:"rgba(255,255,255,0.3)"}}>{s.employeeRef}</div></div></div></td>
                        <td style={{fontSize:13}}>{s.location}<br/><span style={{color:"rgba(255,255,255,0.35)",fontSize:11}}>{fmtDate(s.shiftDate)}</span></td>
                        <td className="mono">{fmtTimestamp(s.clockInAt)}</td>
                        <td className="mono">{fmtTimestamp(s.clockOutAt)}</td>
                        <td className="mono">{fmtDuration(new Date(s.clockOutAt) - new Date(s.clockInAt))}</td>
                        <td>{s.endedBy==="ADMIN"?<span className="pill pill-amber">ADMIN OUT</span>:<span className="pill pill-purple">SELF OUT</span>}</td>
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
function DemoNotice() {
  return (
    <div style={{
      position:"fixed", bottom:0, left:0, right:0, zIndex:9999,
      background:"rgba(12,14,20,0.94)", borderTop:"1px solid rgba(255,255,255,0.12)",
      color:"rgba(255,255,255,0.62)", font:"500 12px/1.5 system-ui, sans-serif",
      padding:"9px 16px", textAlign:"center", backdropFilter:"blur(6px)"
    }}>
      Demo build — seeded sample data, no real employees. Clock-ins are saved to a real database and survive a refresh.
    </div>
  );
}

export default function App() {
  const [user, setUser]       = useState(null);
  const [session, setSession] = useState(null);
  const [booting, setBooting] = useState(true);

  // A token in localStorage means the last visit signed in. Ask the server
  // who it belongs to and whether that person is mid-shift, so a refresh
  // resumes where they were instead of dropping them at the login screen.
  useEffect(() => {
    let alive = true;
    async function restore() {
      if (!getToken()) { if (alive) setBooting(false); return; }
      try {
        const me = await api.me();
        if (!alive) return;
        setUser(me);
        if (me.role === "EMPLOYEE") {
          const open = await api.currentSession();
          if (alive) setSession(open);
        }
      } catch {
        setToken(null);            // expired or rejected
      } finally {
        if (alive) setBooting(false);
      }
    }
    restore();
    return () => { alive = false; };
  }, []);

  function signOut() {
    setToken(null);
    setUser(null);
    setSession(null);
  }

  async function onSignedIn(u) {
    setUser(u);
    if (u.role === "EMPLOYEE") {
      try { setSession(await api.currentSession()); } catch { setSession(null); }
    }
  }

  let screen;
  if (booting)          screen = <Loading label="Waking the server…"/>;
  else if (!user)       screen = <LoginScreen onSignedIn={onSignedIn}/>;
  else if (user.role === "ADMIN")
                        screen = <AdminDash onSignOut={signOut}/>;
  else if (session)     screen = <EmployeeDash user={user} session={session}
                                    onClockedOut={()=>setSession(null)} onSignOut={signOut}/>;
  else                  screen = <ShiftList user={user}
                                    onClockedIn={setSession} onSignOut={signOut}/>;

  return (
    <>
      <StyleInjector/>
      <DemoNotice/>
      {screen}
    </>
  );
}
