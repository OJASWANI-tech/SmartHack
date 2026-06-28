/**
 * HackSmart â€” Participant Portal
 * Drop this file into: frontend/src/pages/ParticipantPortal.jsx
 *
 * Features:
 *  - Participant identity header (avatar, name, team, status pill)
 *  - Top navigation bar (no sidebar)
 *  - Full workflow: Home, Journey, Team, Submissions, Announcements
 *  - RAG chatbot powered by Groq API (uses hackathon knowledge base injected as context)
 *
 * To use:
 *  1. Import and render <ParticipantPortal participant={data} /> from App.jsx
 *  2. The chatbot calls /api/chat on your FastAPI backend (see backend stub below)
 *  3. While backend isn't ready, set VITE_USE_MOCK_CHAT=true in .env.local
 */

import { useState, useRef, useEffect } from "react";
import { useParams } from "react-router-dom";

// â”€â”€â”€ HACKATHON KNOWLEDGE BASE (fed to Groq as RAG context) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// In production this comes from your backend's vector store / document retrieval.
// For MVP, this static string covers 95% of participant questions.

const HACKATHON_KB = `
HackSmart HACKATHON 2025 â€” RULES & GUIDELINES

EVENT TIMELINE:
- May 14: Participant intake and roster finalisation
- May 15: Algorithmic team formation, committee approval
- May 16: Teams announced, build phase begins, submission portal opens
- May 17â€“18: Active development period
- May 19: Score consolidation, anomaly review
- May 20: Progression invitations sent to top 8 teams
- May 21: Finals

SUBMISSION REQUIREMENTS:
- Presentation: PDF or PPTX, maximum 20 slides, PDF strongly preferred
- GitHub repository: Must be public, submit URL via portal
- Demo video: MP4 or YouTube link, maximum 5 minutes
- All submissions due by 11:59 PM on May 16 (tonight)
- No extensions will be granted

JUDGING CRITERIA (weighted):
- Innovation: 40% â€” originality, problem-solving approach
- Execution: 35% â€” technical implementation quality, working demo
- Presentation: 25% â€” clarity, storytelling, visual design
- Scores are out of 10 per criterion; weighted average gives final score

TEAM RULES:
- Team size: 3â€“5 members
- Maximum 1 member from the same institution per team
- Mixed skill levels required (beginner + intermediate + advanced)
- Teams are final; reassignments only via committee decision

ANOMALY DETECTION:
- If two judges differ by more than 2 points on any criterion, an anomaly is flagged
- Results are held by the system until the committee resolves the flag
- Committee may override, request re-evaluation, or exclude an outlier score
- Participants are notified once results are finalised

PROGRESSION:
- Top 8 teams (of 24) advance to finals
- Progression invitations appear in your portal and are emailed to team leads
- You must confirm participation within 2 hours of receiving the invitation
- Unconfirmed invitations are offered to the next team

SUPPORT:
- Email: support@HackSmart.in
- Mentor access: via your mentor's email shown in the Team section
- Response time during event: within 2 hours
`;

// â”€â”€â”€ MOCK DATA â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const MOCK_PARTICIPANT = {
  name: "Aryan Mehta",
  first_name: "Aryan",
  email: "aryan.mehta@iitb.ac.in",
  institution: "IIT Bombay",
  domain: "AI / ML",
  experience_level: "intermediate",
  portal_token_scope: "participant",
  avatar_initials: "AM",
  team: {
    id: 7,
    name: "Team Nexus",
    challenge: "Build an AI-powered supply chain optimisation tool with real-time anomaly detection.",
    rationale: "Balanced across ML engineering, backend systems, and product thinking. Diverse institutions reduce group-think. Strong combined execution track record.",
    members: [
      { id: 1, name: "Aryan Mehta",   institution: "IIT Bombay",  skills: "ML, Python",       initials: "AM", color: "#7c6ef530", text: "#a898f8", is_self: true  },
      { id: 2, name: "Sneha Kapoor",  institution: "BITS Pilani", skills: "Backend, Go",       initials: "SK", color: "#22c98a20", text: "#22c98a" },
      { id: 3, name: "Rohan Das",     institution: "NIT Trichy",  skills: "Product, Design",   initials: "RD", color: "#f5a62320", text: "#f5a623" },
      { id: 4, name: "Fatima Sheikh", institution: "IIIT Hyd",    skills: "Data, Visualisation",initials: "FS", color: "#4fa8e820", text: "#4fa8e8" },
    ],
    mentor: {
      name: "Dr. Priya Nair",
      title: "Principal Engineer, Google DeepMind",
      email: "mentor7@HackSmart.in",
      initials: "PN",
      next_session: "Today Â· 3:00 â€“ 4:00 PM",
    },
  },
  current_stage_index: 2,
  stages: [
    { label: "Intake",       status: "complete", date: "May 14",    desc: "Roster imported, skills tagged." },
    { label: "Teams Formed", status: "complete", date: "May 15",    desc: "Placed in Team Nexus. Committee approved." },
    { label: "Announced",    status: "active",   date: "May 16",    desc: "Build phase active. Submit by 11:59 PM." },
    { label: "Evaluate",     status: "upcoming", date: "May 17â€“18", desc: "Judges score on 3 criteria. Anomaly detection runs." },
    { label: "Scores",       status: "upcoming", date: "May 19",    desc: "Results held until committee approves." },
    { label: "Progression",  status: "upcoming", date: "May 20",    desc: "Top 8 teams receive invitations." },
    { label: "Finals",       status: "upcoming", date: "May 21",    desc: "Final presentation round." },
  ],
  rank: 2,
  score: 9.1,
  total_teams: 24,
  qualification_status: "qualified",
  deadlines: [
    { label: "Code + PPT submission", due: "Today Â· 11:59 PM", done: false, urgent: true  },
    { label: "Demo video upload",     due: "Tomorrow Â· 10 AM", done: false, urgent: false },
    { label: "Team registration",     due: "May 15",           done: true,  urgent: false },
  ],
  announcements: [
    { id: 1, title: "Evaluation window open",   body: "Judges are actively reviewing all submissions. Results expected by 6 PM today. Committee will review before publishing.",  time: "2h ago",  type: "urgent" },
    { id: 2, title: "Submission portal closes", body: "Final code + PPT must be submitted before 11:59 PM tonight. Portal locks automatically. No extensions granted.",           time: "5h ago",  type: "urgent" },
    { id: 3, title: "Mentor session scheduled", body: "Dr. Priya Nair available 3â€“4 PM today for live review. Use this time before final submission.",                          time: "8h ago",  type: "info"   },
    { id: 4, title: "Teams announced",          body: "All assignments reviewed and approved by committee. Team details, mentor, and challenge description now visible.",         time: "1d ago",  type: "update" },
  ],
  submissions: {
    ppt:    { status: "pending",   url: null,                                          label: "Presentation (PPT/PDF)",  meta: "Max 20 slides Â· PDF preferred" },
    github: { status: "submitted", url: "https://github.com/team-nexus/supply-ai",     label: "GitHub repository",       meta: "github.com/team-nexus/supply-ai" },
    demo:   { status: "pending",   url: null,                                          label: "Demo video",              meta: "Max 5 min Â· MP4 or YouTube link" },
  },
};

// â”€â”€â”€ RAG CHATBOT â€” calls Groq API via your FastAPI backend â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function askRAG(question, history) {
  // In production: POST to your FastAPI /chat endpoint which calls Groq
  // For MVP demo with no backend: set import.meta.env.VITE_USE_MOCK_CHAT = "true"

  if (import.meta.env.VITE_USE_MOCK_CHAT === "true") {
    return mockChatResponse(question);
  }

  const res = await fetch(`${import.meta.env.VITE_API_URL}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      question,
      history: history.slice(-6), // last 3 turns for context
      knowledge_base: HACKATHON_KB,
    }),
  });

  if (!res.ok) throw new Error("Chat service unavailable");
  const data = await res.json();
  return data.answer;
}

// Mock responses for when backend isn't ready yet
function mockChatResponse(q) {
  const lower = q.toLowerCase();
  if (lower.includes("ppt") || lower.includes("presentation") || lower.includes("format"))
    return "Submit as **PDF or PPTX** â€” PDF is strongly preferred to avoid font issues. Maximum 20 slides. Upload via the Submissions tab. Deadline is tonight at 11:59 PM.";
  if (lower.includes("scor") || lower.includes("judg") || lower.includes("criteria") || lower.includes("weight"))
    return "Judging is weighted across 3 criteria:\n\nâ€¢ **Innovation** â€” 40%\nâ€¢ **Execution** â€” 35%\nâ€¢ **Presentation** â€” 25%\n\nEach criterion is scored 0â€“10 by each judge independently.";
  if (lower.includes("qualif") || lower.includes("progress") || lower.includes("finals") || lower.includes("advance"))
    return "Top 8 teams (of 24) advance to finals on May 21. You'll receive a progression invitation in this portal and by email. You must confirm within **2 hours** â€” unconfirmed invitations go to the next team.";
  if (lower.includes("anomaly") || lower.includes("flag") || lower.includes("diverge"))
    return "If two judges differ by more than 2 points on any criterion, the system flags it as an anomaly. Results are held until the committee resolves the flag â€” they may override, request re-evaluation, or exclude an outlier score.";
  if (lower.includes("deadline") || lower.includes("when") || lower.includes("due") || lower.includes("submit"))
    return "All submissions (code, PPT, demo video) are due **tonight at 11:59 PM**. The portal locks automatically. No extensions are granted under any circumstances.";
  if (lower.includes("team") && (lower.includes("size") || lower.includes("rule") || lower.includes("how many")))
    return "Teams are 3â€“5 members. A maximum of 1 member from the same institution per team. Skill mix must span beginner + intermediate + advanced levels. Teams are final after committee approval.";
  return "Based on the hackathon guidelines, I'd recommend checking the Submissions tab for deadlines and the Journey tab for your event stage. For anything else, email **support@HackSmart.in** â€” response time is within 2 hours during the event.";
}

// â”€â”€â”€ FASTAPI BACKEND STUB (add this to your backend/routes/chat.py) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
/*
from fastapi import APIRouter
from groq import Groq
from pydantic import BaseModel

router = APIRouter()
client = Groq()

class ChatRequest(BaseModel):
    question: str
    history: list
    knowledge_base: str

@router.post("/chat")
async def chat(req: ChatRequest):
    messages = []
    for h in req.history:
        messages.append({"role": h["role"], "content": h["content"]})
    messages.append({"role": "user", "content": req.question})

    response = client.messages.create(
        model="llama-3.1-8b-instant",
        max_tokens=500,
        system=f"""You are the HackSmart hackathon assistant.
Answer questions using ONLY the information in this knowledge base.
If something isn't covered, say so and direct them to support@HackSmart.in.
Be concise, friendly, and helpful.

KNOWLEDGE BASE:
{req.knowledge_base}""",
        messages=messages,
    )
    return {"answer": response.content[0].text}
*/

// â”€â”€â”€ COLOUR TOKENS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const C = {
  bg:     "#0d0d14", bg2: "#13131e", bg3: "#1a1a28",
  border: "#ffffff12", border2: "#ffffff22",
  text:   "#f0f0f8",  text2: "#9898b8", text3: "#5a5a78",
  purple: "#7c6ef5",  purpleDim: "#7c6ef520", purpleLight: "#a898f8",
  green:  "#22c98a",  greenDim:  "#22c98a18",
  amber:  "#f5a623",  amberDim:  "#f5a62318",
  red:    "#f05252",  redDim:    "#f0525218",
  blue:   "#4fa8e8",  blueDim:   "#4fa8e818",
};

// â”€â”€â”€ TINY SHARED COMPONENTS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function Pill({ color, children }) {
  const map = {
    green:  { bg: C.greenDim,  fg: C.green  },
    purple: { bg: C.purpleDim, fg: C.purpleLight },
    amber:  { bg: C.amberDim,  fg: C.amber  },
    red:    { bg: C.redDim,    fg: C.red    },
    blue:   { bg: C.blueDim,   fg: C.blue   },
  };
  const { bg, fg } = map[color] || map.purple;
  return (
    <span style={{ display:"inline-flex", alignItems:"center", gap:3, fontSize:10,
      fontWeight:600, padding:"2px 8px", borderRadius:20, background:bg, color:fg }}>
      {children}
    </span>
  );
}

function Card({ children, style }) {
  return (
    <div style={{ background:C.bg2, border:`1px solid ${C.border}`, borderRadius:12,
      padding:"13px 15px", ...style }}>
      {children}
    </div>
  );
}

function CardTitle({ children }) {
  return (
    <div style={{ fontSize:10, fontWeight:600, textTransform:"uppercase",
      letterSpacing:".06em", color:C.text3, marginBottom:10 }}>
      {children}
    </div>
  );
}

function Btn({ children, primary, onClick, style }) {
  return (
    <button onClick={onClick} style={{
      fontSize:11, padding:"4px 12px", borderRadius:7,
      border:`1px solid ${primary ? C.purple : C.border2}`,
      background: primary ? C.purple : "transparent",
      color: primary ? "#fff" : C.text2,
      cursor:"pointer", transition:"opacity .15s", ...style,
    }}
    onMouseEnter={e => e.currentTarget.style.opacity=".8"}
    onMouseLeave={e => e.currentTarget.style.opacity="1"}>
      {children}
    </button>
  );
}

// â”€â”€â”€ PARTICIPANT IDENTITY HEADER â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function IdentityHeader({ participant }) {
  const statusColor = participant.qualification_status === "qualified" ? C.green : C.amber;
  const statusDim   = participant.qualification_status === "qualified" ? C.greenDim : C.amberDim;
  const statusLabel = participant.qualification_status === "qualified" ? "Qualified" : "Pending";

  return (
    <div style={{
      background: `linear-gradient(135deg, #1a1630 0%, #0f0f1c 60%, #0d1520 100%)`,
      borderBottom: `1px solid ${C.border}`,
      padding: "14px 20px",
      display: "flex", alignItems: "center", gap: 14,
    }}>
      {/* Large avatar */}
      <div style={{
        width: 52, height: 52, borderRadius: "50%",
        background: `linear-gradient(135deg, ${C.purple}, #a656f5)`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 18, fontWeight: 700, color: "#fff", flexShrink: 0,
        boxShadow: `0 0 0 3px ${C.purpleDim}`,
      }}>
        {participant.avatar_initials}
      </div>

      {/* Name + details */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
          <span style={{ fontSize:16, fontWeight:700, color:C.text }}>
            {participant.name}
          </span>
          <span style={{
            fontSize:10, fontWeight:600, padding:"2px 8px", borderRadius:20,
            background:statusDim, color:statusColor,
          }}>
            âœ“ {statusLabel}
          </span>
          <span style={{
            fontSize:10, padding:"2px 8px", borderRadius:20,
            background:"#ffffff0a", color:C.text3, fontWeight:500,
          }}>
            Participant
          </span>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:12, marginTop:3, flexWrap:"wrap" }}>
          <span style={{ fontSize:11, color:C.text3 }}>{participant.email}</span>
          <span style={{ width:3, height:3, borderRadius:"50%", background:C.text3 }}></span>
          <span style={{ fontSize:11, color:C.text3 }}>{participant.institution}</span>
          <span style={{ width:3, height:3, borderRadius:"50%", background:C.text3 }}></span>
          <span style={{ fontSize:11, color:C.text3 }}>{participant.domain}</span>
        </div>
      </div>

      {/* Team chip */}
      {participant.team && (
        <div style={{
          display:"flex", alignItems:"center", gap:8,
          background:C.purpleDim, border:`1px solid ${C.purple}40`,
          borderRadius:10, padding:"8px 12px", flexShrink:0,
        }}>
          <div style={{
            width:30, height:30, borderRadius:"50%",
            background:C.purple, display:"flex", alignItems:"center",
            justifyContent:"center", fontSize:11, fontWeight:700, color:"#fff",
          }}>
            TN
          </div>
          <div>
            <div style={{ fontSize:12, fontWeight:600, color:C.purpleLight }}>
              {participant.team.name}
            </div>
            <div style={{ fontSize:10, color:C.text3 }}>
              Rank #{participant.rank} Â· Score {participant.score}
            </div>
          </div>
        </div>
      )}

      {/* Stage indicator */}
      <div style={{
        background:"#ffffff06", border:`1px solid ${C.border}`,
        borderRadius:10, padding:"8px 12px", flexShrink:0, textAlign:"center",
      }}>
        <div style={{ fontSize:18, fontWeight:700, color:C.purpleLight, lineHeight:1 }}>
          {participant.current_stage_index + 1}
          <span style={{ fontSize:12, fontWeight:400, color:C.text3 }}>/{participant.stages.length}</span>
        </div>
        <div style={{ fontSize:10, color:C.text3, marginTop:2 }}>Stage</div>
      </div>
    </div>
  );
}

// â”€â”€â”€ TOP NAV â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const NAV_ITEMS = [
  { id:"home",        label:"Home",          icon:"ti-home"      },
  { id:"journey",     label:"Journey",       icon:"ti-timeline"  },
  { id:"team",        label:"My Team",       icon:"ti-users"     },
  { id:"submit",      label:"Submit",        icon:"ti-upload"    },
  { id:"announce",    label:"Announcements", icon:"ti-bell",  badge:true },
  { id:"chat",        label:"Ask AI",        icon:"ti-robot"     },
];

function TopNav({ active, onNavigate }) {
  return (
    <div style={{
      background:C.bg2, borderBottom:`1px solid ${C.border}`,
      padding:"0 20px", display:"flex", alignItems:"center", height:48,
    }}>
      {/* Brand */}
      <div style={{
        display:"flex", alignItems:"center", gap:8,
        paddingRight:16, borderRight:`1px solid ${C.border}`, marginRight:8, flexShrink:0,
      }}>
        <div style={{
          width:28, height:28, borderRadius:8, background:C.purple,
          display:"flex", alignItems:"center", justifyContent:"center",
          fontSize:12, fontWeight:700, color:"#fff",
        }}>EF</div>
        <div>
          <div style={{ fontSize:13, fontWeight:600, color:C.text }}>HackSmart</div>
          <div style={{ fontSize:10, color:C.text3 }}>Hackathon 2025</div>
        </div>
      </div>

      {/* Nav items */}
      <div style={{ display:"flex", alignItems:"center", gap:2 }}>
        {NAV_ITEMS.map(item => (
          <button key={item.id} onClick={() => onNavigate(item.id)} style={{
            display:"flex", alignItems:"center", gap:6,
            padding:"6px 11px", borderRadius:8, border:"none", cursor:"pointer",
            fontSize:12, fontWeight:500, transition:"all .15s", position:"relative",
            background: active===item.id ? C.purpleDim : "transparent",
            color:       active===item.id ? C.purpleLight : C.text2,
          }}
          onMouseEnter={e => { if(active!==item.id){ e.currentTarget.style.background="#ffffff08"; e.currentTarget.style.color=C.text; }}}
          onMouseLeave={e => { if(active!==item.id){ e.currentTarget.style.background="transparent"; e.currentTarget.style.color=C.text2; }}}>
            <i className={`ti ${item.icon}`} style={{ fontSize:14 }} aria-hidden="true" />
            {item.label}
            {item.badge && (
              <span style={{
                position:"absolute", top:4, right:4, width:6, height:6,
                borderRadius:"50%", background:C.red, border:`1.5px solid ${C.bg2}`,
              }} />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

// â”€â”€â”€ STAGE STRIP â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function StageStrip({ stages, currentIndex }) {
  const active = stages[currentIndex];
  return (
    <div style={{
      background:"linear-gradient(90deg,#1e1630,#131325)",
      borderBottom:`1px solid ${C.border}`,
      padding:"8px 20px", display:"flex", alignItems:"center", gap:14,
    }}>
      <div style={{ display:"flex", alignItems:"center", gap:8, flex:1, minWidth:0, flexWrap:"wrap" }}>
        <span style={{ width:8, height:8, borderRadius:"50%", background:C.purple, flexShrink:0,
          boxShadow:`0 0 8px ${C.purple}` }} />
        <span style={{ fontSize:11, fontWeight:600, color:C.purpleLight, textTransform:"uppercase",
          letterSpacing:".04em" }}>Stage {currentIndex+1} Â· {active.label}</span>
        <span style={{ width:1, height:14, background:C.border2 }} />
        <span style={{ fontSize:11, color:C.text2 }}>{active.desc}</span>
        <span style={{ width:1, height:14, background:C.border2 }} />
        <span style={{ fontSize:11, color:C.amber, fontWeight:500 }}>â± 16h remaining</span>
      </div>
      {/* Mini progress dots */}
      <div style={{ display:"flex", alignItems:"center", gap:0, flexShrink:0 }}>
        {stages.map((s, i) => (
          <div key={i} style={{ display:"flex", alignItems:"center" }}>
            <div style={{
              width:18, height:18, borderRadius:"50%", display:"flex",
              alignItems:"center", justifyContent:"center", fontSize:9,
              fontWeight:600, position:"relative",
              background: s.status==="complete" ? C.purple
                        : s.status==="active"   ? "transparent" : "#ffffff0a",
              border: s.status==="active" ? `2px solid ${C.purple}` : "none",
              color:   s.status==="complete" ? "#fff"
                      : s.status==="active"   ? C.purpleLight : C.text3,
              boxShadow: s.status==="active" ? `0 0 10px ${C.purpleDim}` : "none",
            }}>
              {s.status==="complete" ? "âœ“" : i+1}
            </div>
            {i < stages.length-1 && (
              <div style={{ width:20, height:1.5,
                background: s.status==="complete" ? C.purple : C.border }} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// â”€â”€â”€ HOME VIEW â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function HomeView({ participant }) {
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
      {/* Stat row */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:10 }}>
        {[
          { label:"Current stage", value:`${participant.current_stage_index+1}/7`, color:C.purpleLight },
          { label:"Submissions due", value:"2", color:C.amber },
        ].map((s,i) => (
          <div key={i} style={{ background:C.bg3, border:`1px solid ${C.border}`,
            borderRadius:12, padding:"12px 14px" }}>
            <div style={{ fontSize:22, fontWeight:700, color:s.color, lineHeight:1 }}>{s.value}</div>
            <div style={{ fontSize:10, color:C.text3, marginTop:4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
        {/* Deadlines */}
        <Card>
          <CardTitle>Deadlines</CardTitle>
          {participant.deadlines.map((d,i) => (
            <div key={i} style={{ display:"flex", alignItems:"center", gap:10,
              padding:"7px 0", borderBottom: i<participant.deadlines.length-1 ? `1px solid ${C.border}` : "none" }}>
              <div style={{ width:3, height:28, borderRadius:2, flexShrink:0,
                background: d.done ? C.green : d.urgent ? C.red : C.amber }} />
              <div style={{ flex:1 }}>
                <div style={{ fontSize:12, color:C.text, fontWeight:500 }}>{d.label}</div>
                <div style={{ fontSize:10, color:C.text3, marginTop:1 }}>{d.due}</div>
              </div>
              <Pill color={d.done?"green":d.urgent?"red":"amber"}>
                {d.done?"âœ“ Done":d.urgent?"Urgent":"Pending"}
              </Pill>
            </div>
          ))}
        </Card>

        {/* Recent announcements */}
        <Card>
          <CardTitle>Recent announcements</CardTitle>
          {participant.announcements.slice(0,2).map((a,i) => (
            <div key={i} style={{ padding:"7px 0",
              borderBottom: i<1 ? `1px solid ${C.border}` : "none" }}>
              <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:3 }}>
                <Pill color={a.type==="urgent"?"red":a.type==="info"?"blue":"green"}>
                  {a.type==="urgent"?"Urgent":a.type==="info"?"Info":"Update"}
                </Pill>
                <span style={{ fontSize:12, fontWeight:600, color:C.text }}>{a.title}</span>
              </div>
              <div style={{ fontSize:11, color:C.text2, lineHeight:1.5 }}>{a.body}</div>
              <div style={{ fontSize:10, color:C.text3, marginTop:3 }}>{a.time}</div>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}

// â”€â”€â”€ JOURNEY VIEW â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function JourneyView({ participant }) {
  return (
    <Card style={{ maxWidth:580 }}>
      <CardTitle>Event lifecycle Â· your position</CardTitle>
      {participant.stages.map((s,i) => {
        const isLast = i === participant.stages.length - 1;
        const isDone = s.status === "complete";
        const isActive = s.status === "active";
        return (
          <div key={i} style={{ display:"flex", gap:12, paddingBottom: isLast?0:16 }}>
            <div style={{ display:"flex", flexDirection:"column", alignItems:"center", width:22, flexShrink:0 }}>
              <div style={{
                width:22, height:22, borderRadius:"50%",
                background: isDone ? C.purple : isActive ? "transparent" : "#ffffff0a",
                border: isActive ? `2px solid ${C.purple}` : "none",
                display:"flex", alignItems:"center", justifyContent:"center",
                fontSize:10, fontWeight:600, flexShrink:0,
                color: isDone?"#fff": isActive?C.purpleLight : C.text3,
                boxShadow: isActive ? `0 0 10px ${C.purpleDim}` : "none",
              }}>
                {isDone ? "âœ“" : i+1}
              </div>
              {!isLast && (
                <div style={{ width:1.5, flex:1, marginTop:4,
                  background: isDone ? C.purple : C.border }} />
              )}
            </div>
            <div style={{ paddingTop:2, paddingBottom: isLast?0:4, flex:1 }}>
              <div style={{ fontSize:12, fontWeight: isActive?600:isDone?500:400,
                color: isActive ? C.purpleLight : isDone ? C.text : C.text3 }}>
                {s.label}{isActive && " â€” you are here"}
              </div>
              <div style={{ fontSize:11, color:C.text3, marginTop:2, lineHeight:1.5 }}>{s.desc}</div>
              <div style={{ fontSize:10, color:C.text3, marginTop:3 }}>{s.date} Â· {
                isDone?"Completed": isActive?"Active":  "Upcoming"
              }</div>
            </div>
          </div>
        );
      })}
    </Card>
  );
}

// â”€â”€â”€ TEAM VIEW â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function TeamView({ participant }) {
  const { team } = participant;
  return (
    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
      <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
        <Card>
          <CardTitle>{team.name} Â· Challenge</CardTitle>
          <div style={{ fontSize:12, color:C.text2, lineHeight:1.6, marginBottom:10 }}>{team.challenge}</div>
          <div style={{ background:C.bg3, border:`1px solid ${C.border}`,
            borderLeft:`2px solid ${C.purple}`, borderRadius:8, padding:"10px 12px" }}>
            <div style={{ fontSize:10, fontWeight:600, color:C.purpleLight,
              textTransform:"uppercase", letterSpacing:".05em", marginBottom:4 }}>AI rationale</div>
            <div style={{ fontSize:11, color:C.text3, lineHeight:1.6 }}>{team.rationale}</div>
          </div>
        </Card>
        <Card>
          <CardTitle>Members</CardTitle>
          {team.members.map((m,i) => (
            <div key={i} style={{ display:"flex", alignItems:"center", gap:10,
              padding:"7px 0", borderBottom: i<team.members.length-1?`1px solid ${C.border}`:"none" }}>
              <div style={{ width:30, height:30, borderRadius:"50%", background:m.color,
                display:"flex", alignItems:"center", justifyContent:"center",
                fontSize:10, fontWeight:700, color:m.text, flexShrink:0 }}>{m.initials}</div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:12, fontWeight:500, color:m.is_self?C.purpleLight:C.text,
                  display:"flex", alignItems:"center", gap:6 }}>
                  {m.name}
                  {m.is_self && <Pill color="purple">you</Pill>}
                </div>
                <div style={{ fontSize:10, color:C.text3, marginTop:1 }}>{m.institution} Â· {m.skills}</div>
              </div>
            </div>
          ))}
        </Card>
      </div>
      <Card>
        <CardTitle>Mentor</CardTitle>
        <div style={{ display:"flex", alignItems:"center", gap:10,
          paddingBottom:12, borderBottom:`1px solid ${C.border}`, marginBottom:12 }}>
          <div style={{ width:42, height:42, borderRadius:"50%",
            background:C.greenDim, display:"flex", alignItems:"center", justifyContent:"center",
            fontSize:14, fontWeight:700, color:C.green, flexShrink:0 }}>{team.mentor.initials}</div>
          <div>
            <div style={{ fontSize:13, fontWeight:600, color:C.text }}>{team.mentor.name}</div>
            <div style={{ fontSize:11, color:C.text3, marginTop:1 }}>{team.mentor.title}</div>
            <div style={{ fontSize:11, color:C.purpleLight, marginTop:3 }}>{team.mentor.email}</div>
          </div>
        </div>
        <div style={{ background:C.bg3, border:`1px solid ${C.border}`,
          borderRadius:8, padding:"10px 12px", marginBottom:10 }}>
          <div style={{ fontSize:10, color:C.text3, marginBottom:3 }}>Next session</div>
          <div style={{ fontSize:12, fontWeight:600, color:C.text }}>{team.mentor.next_session}</div>
          <div style={{ fontSize:11, color:C.text3, marginTop:1 }}>Live review of your submission</div>
        </div>
        <div style={{ fontSize:11, color:C.text3, lineHeight:1.6 }}>
          For async questions, email your mentor directly. Response time typically within 2 hours during event hours.
        </div>
      </Card>
    </div>
  );
}

// â”€â”€â”€ SUBMISSIONS VIEW â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function SubmissionsView({ participant }) {
  const subs = participant.submissions;
  const items = [
    { key:"ppt",    icon:"ðŸ“„", ...subs.ppt    },
    { key:"github", icon:"ðŸ™", ...subs.github },
    { key:"demo",   icon:"ðŸŽ¬", ...subs.demo   },
  ];
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
      <div style={{ background:C.redDim, border:`1px solid ${C.red}`,
        borderRadius:10, padding:"10px 14px", display:"flex", alignItems:"center", gap:10 }}>
        <span style={{ fontSize:16, flexShrink:0 }}>âš ï¸</span>
        <div>
          <div style={{ fontSize:12, fontWeight:600, color:C.red }}>Submission deadline: Today 11:59 PM</div>
          <div style={{ fontSize:11, color:`${C.red}90`, marginTop:1 }}>PPT and demo video still pending. GitHub already submitted.</div>
        </div>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
        <Card>
          <CardTitle>Submission checklist</CardTitle>
          {items.map((s,i) => (
            <div key={i} style={{ display:"flex", alignItems:"center", gap:10,
              padding:"8px 0", borderBottom: i<items.length-1?`1px solid ${C.border}`:"none" }}>
              <div style={{ width:32, height:32, borderRadius:8,
                background:C.bg3, border:`1px solid ${C.border}`,
                display:"flex", alignItems:"center", justifyContent:"center",
                fontSize:15, flexShrink:0 }}>{s.icon}</div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:12, fontWeight:500, color:C.text }}>{s.label}</div>
                <div style={{ fontSize:10, color:C.text3, marginTop:1 }}>{s.meta}</div>
              </div>
              <Pill color={s.status==="submitted"?"green":"amber"}>
                {s.status==="submitted"?"âœ“ Done":"Pending"}
              </Pill>
              {s.status!=="submitted" && <Btn primary>Upload</Btn>}
            </div>
          ))}
        </Card>
        <Card>
          <CardTitle>GitHub submission</CardTitle>
          <div style={{ fontSize:11, color:C.text3, marginBottom:8 }}>
            Paste your public repository URL. Make sure the repo is public before submitting.
          </div>
          <input defaultValue={subs.github.url||""} placeholder="https://github.com/your-team/project"
            style={{ width:"100%", background:C.bg3, border:`1px solid ${C.border2}`,
              borderRadius:8, padding:"7px 10px", fontSize:11, color:C.text,
              marginBottom:8, outline:"none", boxSizing:"border-box" }} />
          <Btn style={{ width:"100%", padding:7, justifyContent:"center" }}>
            Update GitHub link
          </Btn>
          <div style={{ marginTop:12, paddingTop:12, borderTop:`1px solid ${C.border}` }}>
            <div style={{ fontSize:10, color:C.text3, marginBottom:8,
              fontWeight:600, textTransform:"uppercase", letterSpacing:".05em" }}>
              Judging criteria
            </div>
            {[["Innovation","40%",C.purple,40],["Execution","35%",C.green,35],["Presentation","25%",C.blue,25]].map(([l,p,c,w],i)=>(
              <div key={i} style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6 }}>
                <span style={{ fontSize:11, color:C.text2, flex:1 }}>{l}</span>
                <div style={{ width:60, height:3, background:C.border, borderRadius:2, overflow:"hidden" }}>
                  <div style={{ width:`${w}%`, height:"100%", background:c, borderRadius:2 }} />
                </div>
                <span style={{ fontSize:10, color:C.text3, width:28, textAlign:"right" }}>{p}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

// â”€â”€â”€ ANNOUNCEMENTS VIEW â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function AnnouncementsView({ participant }) {
  const typeColor = { urgent:"red", info:"blue", update:"green" };
  return (
    <Card>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
        <CardTitle style={{ marginBottom:0 }}>Announcements</CardTitle>
        <Pill color="red">2 unread</Pill>
      </div>
      {participant.announcements.map((a,i)=>(
        <div key={i} style={{ padding:"9px 0",
          borderBottom: i<participant.announcements.length-1?`1px solid ${C.border}`:"none" }}>
          <div style={{ display:"flex", alignItems:"center", gap:7, marginBottom:4 }}>
            <Pill color={typeColor[a.type]||"purple"}>
              {a.type==="urgent"?"Urgent":a.type==="info"?"Info":"Update"}
            </Pill>
            <span style={{ fontSize:12, fontWeight:600, color:C.text }}>{a.title}</span>
          </div>
          <div style={{ fontSize:11, color:C.text2, lineHeight:1.6 }}>{a.body}</div>
          <div style={{ fontSize:10, color:C.text3, marginTop:4 }}>{a.time} Â· Sent by HackSmart system</div>
        </div>
      ))}
    </Card>
  );
}

// â”€â”€â”€ RAG CHATBOT VIEW â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function ChatView({ participant }) {
  const [messages, setMessages] = useState([
    { role:"assistant", content:`Hi ${participant.first_name}! I'm your HackSmart AI assistant, trained on all the hackathon rules, judging criteria, submission guidelines, and FAQs.\n\nWhat do you need help with?` },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const bottomRef = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:"smooth" }); }, [messages]);

  async function send() {
    const q = input.trim();
    if (!q || loading) return;
    setInput("");
    setError(null);
    const newMsgs = [...messages, { role:"user", content:q }];
    setMessages(newMsgs);
    setLoading(true);
    try {
      const answer = await askRAG(q, newMsgs);
      setMessages(m => [...m, { role:"assistant", content:answer }]);
    } catch(e) {
      setError("Chat service unavailable. Email support@HackSmart.in for help.");
    } finally {
      setLoading(false);
    }
  }

  const QUICK = [
    "What format for PPT submission?",
    "How is scoring calculated?",
    "What happens when we qualify?",
    "What is anomaly detection?",
    "When is the submission deadline?",
  ];

  return (
    <div style={{ maxWidth:620 }}>
      {/* Model info banner */}
      <div style={{ background:C.bg3, border:`1px solid ${C.border}`,
        borderRadius:10, padding:"8px 14px", marginBottom:10,
        display:"flex", alignItems:"center", gap:8 }}>
        <span style={{ width:8, height:8, borderRadius:"50%",
          background:C.green, boxShadow:`0 0 6px ${C.green}`, flexShrink:0 }} />
        <span style={{ fontSize:11, color:C.text2 }}>
          <strong style={{ color:C.text }}>HackSmart AI</strong> Â· Powered by Groq Â· Trained on hackathon rules, judging guidelines, and FAQs
        </span>
        <span style={{ marginLeft:"auto", fontSize:10, color:C.text3 }}>RAG model</span>
      </div>

      <div style={{ background:C.bg2, border:`1px solid ${C.border}`,
        borderRadius:12, display:"flex", flexDirection:"column", height:420 }}>

        {/* Messages */}
        <div style={{ flex:1, overflowY:"auto", padding:"14px 16px",
          display:"flex", flexDirection:"column", gap:10 }}>
          {messages.map((m,i) => (
            <div key={i} style={{ maxWidth:"88%", alignSelf: m.role==="user"?"flex-end":"flex-start" }}>
              {m.role==="assistant" && (
                <div style={{ display:"flex", alignItems:"center", gap:5, marginBottom:3 }}>
                  <div style={{ width:16, height:16, borderRadius:"50%", background:C.purple,
                    display:"flex", alignItems:"center", justifyContent:"center",
                    fontSize:8, fontWeight:700, color:"#fff" }}>AI</div>
                  <span style={{ fontSize:10, color:C.text3 }}>HackSmart AI</span>
                </div>
              )}
              <div style={{
                padding:"8px 12px", borderRadius:10, fontSize:11, lineHeight:1.7,
                background: m.role==="user" ? C.purple : C.bg3,
                border: m.role==="user" ? "none" : `1px solid ${C.border}`,
                color: m.role==="user" ? "#fff" : C.text2,
                whiteSpace:"pre-wrap",
              }}>
                {m.content}
              </div>
            </div>
          ))}
          {loading && (
            <div style={{ alignSelf:"flex-start", display:"flex", alignItems:"center", gap:5 }}>
              <div style={{ width:16, height:16, borderRadius:"50%", background:C.purple,
                display:"flex", alignItems:"center", justifyContent:"center", fontSize:8, color:"#fff" }}>AI</div>
              <div style={{ background:C.bg3, border:`1px solid ${C.border}`,
                borderRadius:10, padding:"8px 12px", fontSize:11, color:C.text3 }}>
                Thinkingâ€¦
              </div>
            </div>
          )}
          {error && (
            <div style={{ fontSize:11, color:C.red, padding:"6px 10px",
              background:C.redDim, borderRadius:8, border:`1px solid ${C.red}40` }}>
              {error}
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Quick questions */}
        <div style={{ padding:"8px 14px", borderTop:`1px solid ${C.border}` }}>
          <div style={{ display:"flex", gap:5, flexWrap:"wrap", marginBottom:8 }}>
            {QUICK.map((q,i) => (
              <Btn key={i} onClick={() => { setInput(q); }}>
                {q}
              </Btn>
            ))}
          </div>
          <div style={{ display:"flex", gap:7 }}>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key==="Enter" && !e.shiftKey && send()}
              placeholder="Ask anything about the hackathonâ€¦"
              style={{ flex:1, background:C.bg3, border:`1px solid ${C.border2}`,
                borderRadius:8, padding:"7px 11px", fontSize:11, color:C.text,
                outline:"none", boxSizing:"border-box" }}
              onFocus={e => e.target.style.borderColor=C.purple}
              onBlur={e => e.target.style.borderColor=C.border2}
            />
            <button onClick={send} disabled={loading}
              style={{ width:34, height:34, borderRadius:8, background:C.purple,
                border:"none", color:"#fff", cursor:loading?"not-allowed":"pointer",
                display:"flex", alignItems:"center", justifyContent:"center",
                fontSize:14, opacity:loading?0.5:1, flexShrink:0 }}>
              âž¤
            </button>
          </div>
        </div>
      </div>

      <div style={{ marginTop:8, fontSize:10, color:C.text3, textAlign:"center" }}>
        AI responses are based on the hackathon knowledge base. For official rulings, contact support@HackSmart.in
      </div>
    </div>
  );
}

// â”€â”€â”€ ROOT COMPONENT â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export default function ParticipantPortal({ participant = MOCK_PARTICIPANT }) {
  const [activeView, setActiveView] = useState("home");

  const { token } = useParams();

  useEffect(() => {
    async function verifyToken() {
      try {
        const res = await fetch(
          "http://127.0.0.1:8000/protected/participant/dashboard",
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const data = await res.json();

      } catch (err) {
     
      }
    }

    if (token) {
      verifyToken();
    }
  }, [token]);

  const VIEWS = {
    home: HomeView,
    journey: JourneyView,
    team: TeamView,
    submit: SubmissionsView,
    announce: AnnouncementsView,
    chat: ChatView,
  };

  const View = VIEWS[activeView] || HomeView;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: C.bg,
        fontFamily: "-apple-system,BlinkMacSystemFont,'Inter',sans-serif",
        color: C.text,
      }}
    >
      <IdentityHeader participant={participant} />
      <TopNav active={activeView} onNavigate={setActiveView} />
      <StageStrip
        stages={participant.stages}
        currentIndex={participant.current_stage_index}
      />

      <div style={{ padding: "16px 20px" }}>
        <View participant={participant} />
      </div>
    </div>
  );
}

