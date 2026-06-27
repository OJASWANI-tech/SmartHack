export const currentUser = {
  name: "Dr. Priya Mehta",
  initials: "PM",
  email: "priya.mehta@example.com",
  phone: "+91 98765 43210",
  institution: "IIT Delhi",
  roles: ["evaluator", "mentor"],
  expertise: ["AI/ML", "Product Strategy", "Deep Learning"],
  experience: "8 years",
}

export const assignedTeams = [
  { id:"EVT-201", name:"Team Alpha",   members:4, domain:"AI/ML",   submission:"Submitted",     evalStatus:"Evaluated", score:93.0, submissionFiles:["Solution_v2.pdf","Deck_v2.pptx"], github:"github.com/alpha" },
  { id:"EVT-202", name:"Team Phoenix", members:4, domain:"AI/ML",   submission:"Submitted",     evalStatus:"Evaluated", score:87.0, submissionFiles:["Solution_v2.pdf","Deck_v2.pptx"], github:"github.com/phoenix" },
  { id:"EVT-203", name:"Team Nova",    members:3, domain:"Web Dev",  submission:"Submitted",     evalStatus:"Pending",   score:null, submissionFiles:["Solution_v1.pdf"], github:"github.com/nova" },
  { id:"EVT-204", name:"Team Sigma",   members:4, domain:"IoT",      submission:"Not Submitted", evalStatus:"Locked",    score:null, submissionFiles:[], github:null },
  { id:"EVT-205", name:"Team Zeta",    members:3, domain:"Web Dev",  submission:"Submitted",     evalStatus:"Pending",   score:null, submissionFiles:["Solution_v1.pdf","Deck_v1.pptx"], github:"github.com/zeta" },
]

export const criteria = [
  { id:"c1", label:"Problem Understanding",    max:20, weight:"20%" },
  { id:"c2", label:"Solution Approach",        max:25, weight:"25%" },
  { id:"c3", label:"Technical Implementation", max:25, weight:"25%" },
  { id:"c4", label:"Innovation",               max:20, weight:"20%" },
  { id:"c5", label:"Presentation",             max:10, weight:"10%" },
]

export const savedEvaluations = {
  "EVT-201": { c1:19, c2:23, c3:24, c4:18, c5:9,  feedback:"Strong problem framing and unique solution.", notes:"Solid team, might qualify for finals.", submitted:true },
  "EVT-202": { c1:18, c2:21, c3:22, c4:16, c5:10, feedback:"Good approach, needs more scalability discussion.", notes:"Watch presentation clarity.", submitted:true },
}

export const schedule = [
  { time:"10:00 AM", team:"Team Alpha",   duration:45, link:"meet.google.com/alpha",   status:"done" },
  { time:"11:30 AM", team:"Team Phoenix", duration:45, link:"meet.google.com/phoenix", status:"active" },
  { time:"02:00 PM", team:"Team Nova",    duration:45, link:"meet.google.com/nova",    status:"upcoming" },
  { time:"03:30 PM", team:"Team Sigma",   duration:45, link:"meet.google.com/sigma",   status:"upcoming" },
]

export const menteeTeams = [
  {
    id:"EVT-202", name:"Team Phoenix", domain:"AI/ML",
    members:[
      { name:"Navya P.",  initials:"NP", skills:["React","Python","UI/UX"] },
      { name:"Rohan K.",  initials:"RK", skills:["Node.js","MongoDB"] },
      { name:"Aditi S.",  initials:"AS", skills:["ML","PyTorch"] },
      { name:"Megha R.",  initials:"MR", skills:["Figma","Design"] },
    ],
    submission:"Submitted", submissionVersion:"v2",
    lastSession:"2 days ago", nextSession:"Today 3:00 PM",
    scoreVisible:false,
  },
  {
    id:"EVT-203", name:"Team Nova", domain:"Web Dev",
    members:[
      { name:"Sam T.",   initials:"ST", skills:["React","CSS"] },
      { name:"Kiran M.", initials:"KM", skills:["Node.js","SQL"] },
      { name:"Riya D.",  initials:"RD", skills:["UI/UX","Figma"] },
    ],
    submission:"Pending", submissionVersion:null,
    lastSession:"4 days ago", nextSession:"Aug 16, 2:00 PM",
    scoreVisible:false,
  },
  {
    id:"EVT-205", name:"Team Zeta", domain:"Web Dev",
    members:[
      { name:"Aman K.", initials:"AK", skills:["Vue","Python"] },
      { name:"Preet S.", initials:"PS", skills:["Node.js","AWS"] },
      { name:"Diya R.", initials:"DR", skills:["Design","Figma"] },
    ],
    submission:"Submitted", submissionVersion:"v1",
    lastSession:"1 week ago", nextSession:"Not scheduled",
    scoreVisible:false,
  },
]

export const sessions = [
  { id:"s1", team:"Team Phoenix", date:"Aug 13", time:"3:00 PM", duration:45, status:"completed", notes:"Discussed architecture improvements." },
  { id:"s2", team:"Team Nova",    date:"Aug 16", time:"2:00 PM", duration:45, status:"upcoming",  notes:"" },
  { id:"s3", team:"Team Zeta",    date:"Aug 17", time:"11:00 AM",duration:45, status:"upcoming",  notes:"" },
]

export const sessionRequests = [
  { team:"Team Kappa", requestedDate:"Aug 16", requestedTime:"4:00 PM" },
]

export const resources = [
  { title:"Pitch Deck Template", type:"pdf",  sharedWith:["Team Phoenix","Team Nova","Team Zeta"], link:"#" },
  { title:"Technical Guidelines", type:"link", sharedWith:"all", link:"#" },
  { title:"Evaluation Rubric",    type:"doc",  sharedWith:["Team Phoenix","Team Zeta"], link:"#" },
]

export const teamNotes = {
  "Team Phoenix": "Strong AI/ML foundation. Suggested microservices for scalability. Follow up on deployment strategy.",
  "Team Nova":    "Frontend is solid. Backend needs work. Pushed them to clarify the problem statement.",
  "Team Zeta":    "Early stage. Need to narrow scope significantly.",
}

export const announcements = [
  { id:1, tag:"Important", title:"Evaluation deadline extended", body:"Submit all scores by Aug 16, 11:59 PM.", time:"2 hours ago" },
  { id:2, tag:"Reminder",  title:"Feedback submission reminder", body:"Ensure written feedback is added for all evaluated teams.", time:"1 day ago" },
]
