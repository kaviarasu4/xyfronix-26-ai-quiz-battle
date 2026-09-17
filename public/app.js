const API = (window.XYF_CONFIG?.BACKEND_URL || window.location.origin).replace(/\/$/, "");
const socket = io(API, { transports: ["websocket", "polling"] });

let state = {
  participant: null,
  stage: null,
  quiz: null,
  questionIndex: 0,
  selected: null,
  answered: false,
  score: 0,
  position: null,
  timer: null,
  timeLeft: 0
};

const $ = (id) => document.getElementById(id);
const screens = ["home","join","waiting","quiz","result","coordinator","dashboard"];

function show(name){
  screens.forEach(s => $("screen-"+s).classList.toggle("active", s === name));
  window.scrollTo({top:0, behavior:"smooth"});
}
function toast(msg){
  const el = $("toast"); el.textContent = msg; el.classList.add("show");
  setTimeout(()=>el.classList.remove("show"),2200);
}
function setConnection(online){
  const el=$("connection");
  el.textContent=online ? "● LIVE CONNECTED" : "● OFFLINE";
  el.className="connection "+(online?"online":"offline");
}
function esc(s){ return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c])); }

socket.on("connect", ()=>setConnection(true));
socket.on("disconnect", ()=>setConnection(false));

$("go-participant").onclick=()=>show("join");
$("go-coordinator").onclick=()=>show("coordinator");
$("result-home").onclick=()=>location.reload();
document.querySelectorAll("[data-back]").forEach(b=>b.onclick=()=>show(b.dataset.back));

$("join-form").addEventListener("submit", async (e)=>{
  e.preventDefault();
  $("join-error").textContent="";
  const teamName=$("team-name").value.trim();
  const collegeName=$("college-name").value.trim();
  try{
    const r=await fetch(API+"/api/participant/join",{
      method:"POST",headers:{"Content-Type":"application/json"},
      body:JSON.stringify({teamName,collegeName})
    });
    const data=await r.json();
    if(!r.ok) throw new Error(data.error||"Join failed");
    state.participant=data.participant;
    state.score=0; state.position=null;
    sessionStorage.setItem("xyf_participant_id", state.participant.id);
    $("waiting-team").textContent=teamName.toUpperCase();
    $("waiting-college").textContent=collegeName;
    show("waiting");
    socket.emit("participant:join-room",{participantId:state.participant.id});
  }catch(err){ $("join-error").textContent=err.message; }
});

socket.on("quiz:started", (payload)=>{
  if(!state.participant) return;
  if(payload.participantIds && !payload.participantIds.includes(state.participant.id)) return;
  startStage(payload.stage, payload.durationSeconds);
});

socket.on("quiz:finished", (payload)=>{
  if(!state.participant) return;
  finishParticipant(payload.final || false);
});

socket.on("participant:update", (p)=>{
  if(!state.participant || p.id !== state.participant.id) return;
  state.participant=p;
  if(state.stage==="A") state.score=p.stage_a_score||0;
  if(state.stage==="B") state.score=p.stage_b_score||0;
  $("quiz-score").textContent=state.score;
});

async function startStage(stage, durationSeconds){
  state.stage=stage;
  state.questionIndex=0; state.selected=null; state.answered=false;
  state.score=stage==="A"?(state.participant.stage_a_score||0):(state.participant.stage_b_score||0);
  state.timeLeft=durationSeconds;
  $("quiz-team").textContent=state.participant.team_name;
  $("stage-chip").textContent=stage==="A"?"20 QUESTION QUIZ":"25 SCENARIO QUIZ";
  $("quiz-title").textContent=stage==="A"?"AI Prompt Challenge":"AI Scenario Challenge";
  $("quiz-score").textContent=state.score;
  $("feedback").className="feedback hidden";
  $("next-question").classList.add("hidden");
  show("quiz");
  await loadQuestion();
  startTimer();
}

async function loadQuestion(){
  state.selected=null; state.answered=false;
  $("submit-answer").disabled=true;
  $("feedback").className="feedback hidden";
  $("next-question").classList.add("hidden");
  const r=await fetch(`${API}/api/quiz/${state.stage}/question/${state.questionIndex}?participantId=${encodeURIComponent(state.participant.id)}`);
  const data=await r.json();
  if(!r.ok){ toast(data.error||"Question load failed"); return; }
  state.quiz=data;
  $("question-number").textContent=`Question ${state.questionIndex+1} / ${data.total}`;
  $("question-marks").textContent=`${data.marks} marks`;
  $("question-text").textContent=data.question;
  $("options").innerHTML=data.options.map((opt,i)=>`
    <label class="option">
      <input type="radio" name="answer" value="${i}">
      <span class="letter">${String.fromCharCode(65+i)}</span>
      <span class="option-text">${esc(opt)}</span>
    </label>`).join("");
  document.querySelectorAll(".option").forEach((el,i)=>{
    el.onclick=()=>{
      if(state.answered) return;
      state.selected=i;
      document.querySelectorAll(".option").forEach(x=>x.classList.remove("selected"));
      el.classList.add("selected");
      $("submit-answer").disabled=false;
    };
  });
}

$("submit-answer").onclick=async()=>{
  if(state.selected===null || state.answered) return;
  $("submit-answer").disabled=true;
  try{
    const r=await fetch(API+"/api/quiz/answer",{
      method:"POST",headers:{"Content-Type":"application/json"},
      body:JSON.stringify({
        participantId:state.participant.id, stage:state.stage,
        questionIndex:state.questionIndex, selectedOption:state.quiz.optionMap[state.selected]
      })
    });
    const data=await r.json();
    if(!r.ok) throw new Error(data.error||"Submission failed");
    state.answered=true;
    state.score=data.score;
    state.position=data.position;
    $("quiz-score").textContent=data.score;
    $("quiz-position").textContent=ordinal(data.position);
    showFeedback(data);
  }catch(err){
    $("submit-answer").disabled=false; toast(err.message);
  }
};

function showFeedback(data){
  const f=$("feedback");
  f.className="feedback "+(data.correct?"correct":"wrong");
  f.innerHTML=`<b>${data.correct?"✓ CORRECT":"✕ WRONG"} · +${data.marksAwarded} marks</b>
    ${data.correct?"":"<div>Correct answer: <strong>"+esc(data.correctAnswer)+"</strong></div>"}
    <small>Current score: ${data.score} · Current position: ${ordinal(data.position)}</small>`;
  $("next-question").classList.remove("hidden");
  $("submit-answer").classList.add("hidden");
}
$("next-question").onclick=async()=>{
  if(state.questionIndex >= state.quiz.total-1){
    finishParticipant(false); return;
  }
  state.questionIndex++;
  $("submit-answer").classList.remove("hidden");
  await loadQuestion();
};

function startTimer(){
  clearInterval(state.timer);
  renderTimer();
  state.timer=setInterval(()=>{
    state.timeLeft--;
    renderTimer();
    if(state.timeLeft<=0){
      clearInterval(state.timer);
      autoFinish();
    }
  },1000);
}
function renderTimer(){
  const m=Math.floor(state.timeLeft/60), s=state.timeLeft%60;
  const el=$("timer");
  el.textContent=`${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
  el.classList.toggle("warning",state.timeLeft<=60 && state.timeLeft>20);
  el.classList.toggle("danger",state.timeLeft<=20);
}
async function autoFinish(){
  try{
    await fetch(API+"/api/quiz/finish",{
      method:"POST",headers:{"Content-Type":"application/json"},
      body:JSON.stringify({participantId:state.participant.id,stage:state.stage})
    });
  }catch(e){}
  finishParticipant(false);
}
async function finishParticipant(final){
  clearInterval(state.timer);
  try{
    const r=await fetch(`${API}/api/participant/${state.participant.id}/summary`);
    const data=await r.json();
    const s=state.stage==="A"?data.stageA:data.stageB;
    $("result-team").textContent=state.participant.team_name;
    $("result-score").textContent=s.score;
    $("result-correct").textContent=s.correct;
    $("result-position").textContent=ordinal(s.position);
    $("result-note").textContent=final ? "Event completed." : (state.stage==="A" ? "Waiting for the next quiz from the coordinator." : "Your submission has been recorded.");
    show("result");
  }catch(e){ show("result"); }
}

function ordinal(n){
  if(!n) return "—";
  const v=n%100;
  if(v>=11 && v<=13) return n+"th";
  return n+(["th","st","nd","rd"][Math.min(n%10,3)]||"th");
}

/* Coordinator */
$("coord-form").addEventListener("submit", async(e)=>{
  e.preventDefault(); $("coord-error").textContent="";
  try{
    const r=await fetch(API+"/api/coordinator/login",{
      method:"POST",headers:{"Content-Type":"application/json"},
      body:JSON.stringify({code:$("coord-code").value.trim()})
    });
    const data=await r.json();
    if(!r.ok) throw new Error(data.error||"Invalid code");
    sessionStorage.setItem("xyf_coord_token",data.token);
    show("dashboard");
    loadDashboard();
    socket.emit("coordinator:join");
  }catch(err){ $("coord-error").textContent=err.message; }
});

async function authFetch(url,opts={}){
  opts.headers={...(opts.headers||{}),"x-coordinator-token":sessionStorage.getItem("xyf_coord_token")||""};
  return fetch(API+url,opts);
}
async function loadDashboard(){
  const r=await authFetch("/api/coordinator/state"); if(!r.ok){show("coordinator");return}
  const data=await r.json(); renderDashboard(data);
}
socket.on("dashboard:update", data=>renderDashboard(data));

function renderDashboard(data){
  const p=data.participants||[];
  $("stat-total").textContent=p.length;
  $("stat-live").textContent=p.filter(x=>x.status==="live").length;
  $("stat-submitted").textContent=p.filter(x=>x.status==="submitted").length;
  $("stat-status").textContent=(data.quiz.status||"waiting").toUpperCase();
  $("dash-stage-title").textContent=data.quiz.activeStage==="A"?"20 Question Quiz":data.quiz.activeStage==="B"?"25 Scenario Quiz":"Waiting to start";
  $("dash-stage-chip").textContent=data.quiz.activeStage ? `STAGE ${data.quiz.activeStage}` : "IDLE";

  const stage=data.quiz.activeStage;
  const list=[...p].sort((a,b)=>{
    const as=stage==="B"?a.stage_b_score:a.stage_a_score;
    const bs=stage==="B"?b.stage_b_score:b.stage_a_score;
    return bs-as || new Date(a.joined_at)-new Date(b.joined_at);
  });
  $("leaderboard-body").innerHTML=list.map((x,i)=>{
    const score=stage==="B"?x.stage_b_score:x.stage_a_score;
    const correct=stage==="B"?x.stage_b_correct:x.stage_a_correct;
    const used=stage==="B"?x.stage_b_used:x.stage_a_used;
    return `<tr>
      <td>${i+1}</td><td>${esc(x.team_name)}</td><td>${esc(x.college_name)}</td>
      <td>${score}</td><td>${correct}/${used}</td>
      <td class="status-${x.status}">${x.status.toUpperCase()}</td>
      <td>${x.completed_at ? new Date(x.completed_at).toLocaleTimeString() : "—"}</td>
      <td><button class="btn danger btn-delete" data-delete-id="${esc(x.id)}" type="button">DELETE</button></td>
    </tr>`;
  }).join("");
  document.querySelectorAll("[data-delete-id]").forEach(btn => {
    btn.onclick = () => deleteParticipant(btn.dataset.deleteId);
  });
}

async function deleteParticipant(id){
  if(!confirm("Delete this participant from the live monitor? This removes their stored answers/results too.")) return;
  const r=await authFetch(`/api/coordinator/participant/${encodeURIComponent(id)}`,{method:"DELETE"});
  const data=await r.json().catch(()=>({}));
  if(!r.ok){ toast(data.error||"Delete failed"); return; }
  toast("Participant deleted");
}
$("start-a").onclick=()=>startQuizCoordinator("A");
$("start-b").onclick=()=>startQuizCoordinator("B");
$("finish-live").onclick=async()=>{
  if(!confirm("Finish the current quiz for all participants?")) return;
  await authFetch("/api/coordinator/finish",{method:"POST"});
};
async function startQuizCoordinator(stage){
  const r=await authFetch("/api/coordinator/start",{
    method:"POST",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({stage})
  });
  const data=await r.json();
  if(!r.ok){toast(data.error||"Could not start");return}
  toast("Quiz started for all waiting participants");
}
$("export-csv").onclick=async()=>{
  const r=await authFetch("/api/coordinator/export");
  if(!r.ok){toast("Export failed");return}
  const blob=await r.blob();
  const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download="xyfronix-ai-prompt-battle-results.csv"; a.click(); URL.revokeObjectURL(a.href);
};

/* Restore a participant session after refresh */
(async()=>{
  const id=sessionStorage.getItem("xyf_participant_id");
  if(!id) return;
  try{
    const r=await fetch(`${API}/api/participant/${id}`);
    if(!r.ok) return;
    state.participant=await r.json();
    $("waiting-team").textContent=state.participant.team_name.toUpperCase();
    $("waiting-college").textContent=state.participant.college_name;
    socket.emit("participant:join-room",{participantId:id});
  }catch(e){}
})();
