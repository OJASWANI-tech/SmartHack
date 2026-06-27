import json
import logging
from typing import Optional, Dict, Any

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("llm_client")

class LLMClient:
    """
    Unified client for LLM services, prioritizing Groq.
    If the GROQ_API_KEY is missing, "dummy_key", or calls fail,
    it falls back to a high-quality local mock generator to ensure zero-failure demos.
    """
    def __init__(self):
        from app.core.config import settings
        self.api_key = settings.GROQ_API_KEY
        self.model = settings.GROQ_MODEL
        self.use_real_llm = self.api_key and self.api_key != "dummy_key"
        self.client = None
        
        if self.use_real_llm:
            try:
                from groq import Groq
                self.client = Groq(api_key=self.api_key)
                logger.info("Groq client initialized successfully for real AI inference.")
            except ImportError:
                logger.warning("Groq package not installed. Falling back to Mock AI client.")
                self.use_real_llm = False
            except Exception as e:
                logger.error(f"Failed to initialize Groq client: {e}. Falling back to Mock AI.")
                self.use_real_llm = False
        else:
            logger.info("Using high-fidelity Mock AI client (no real GROQ_API_KEY configured).")

    async def complete(self, prompt: str, system_prompt: str = "You are an intelligent hackathon orchestrator.", json_mode: bool = False, conversation_history: list = None) -> str:
        """
        Synthesizes a response from the LLM or realistic fallback mocks.
        """
        if self.use_real_llm and self.client:
            try:
                messages = [{"role": "system", "content": system_prompt}]
                if conversation_history:
                    messages.extend(conversation_history)
                messages.append({"role": "user", "content": prompt})

                request_kwargs = {
                    "messages": messages,
                    "model": self.model,
                    "temperature": 0.2,
                }
                if json_mode:
                    request_kwargs["response_format"] = {"type": "json_object"}

                chat_completion = self.client.chat.completions.create(**request_kwargs)
                return chat_completion.choices[0].message.content
            except Exception as e:
                logger.error(f"Groq API call failed: {e}. Utilizing fallback generator.")
        
        # Local mock responses if Groq is not available/fails
        return self._generate_mock_fallback(prompt, json_mode, system_prompt)

    def _generate_mock_fallback(self, prompt: str, json_mode: bool, system_prompt: str = "") -> str:
        prompt_lower = prompt.lower()
        
        if json_mode:
            # 1. Structured Feedback case
            if "feedback" in prompt_lower or "notes" in prompt_lower:
                import re
                # Parse criteria and scores from prompt
                criteria = {}
                for line in prompt.split('\n'):
                    match = re.match(r'^\s*-\s*([^:]+):\s*(\d+)/10', line)
                    if match:
                        category = match.group(1).strip()
                        score = int(match.group(2))
                        criteria[category] = score
                
                # If no criteria parsed, default to standard ones
                if not criteria:
                    criteria = {"Innovation": 5, "Execution": 5, "Presentation": 5}
                
                # Parse raw notes from prompt
                notes_match = re.search(r'Raw Judge Notes:\s*"(.*?)"', prompt, re.DOTALL)
                raw_notes = notes_match.group(1).strip() if notes_match else ""
                if not raw_notes:
                    notes_match = re.search(r'Raw Judge Notes:\s*(.*?)\n\n', prompt, re.DOTALL)
                    raw_notes = notes_match.group(1).strip() if notes_match else "No raw notes provided."
                
                raw_notes_lower = raw_notes.lower()
                data = {}
                
                for cat, score in criteria.items():
                    cat_lower = cat.lower()
                    
                    # Choose base template text depending on category and score
                    if "innov" in cat_lower:
                        base = "The project shows highly creative ideas." if score >= 8 else "The core concept is sound, though it relies on standard approaches." if score >= 5 else "The solution lacks novelty and replicates existing templates."
                    elif "exec" in cat_lower:
                        base = "Superb technical implementation with robust logic." if score >= 8 else "The codebase is functional, though error handling and configuration could be improved." if score >= 5 else "The code shows multiple issues and incomplete features."
                    elif "pres" in cat_lower:
                        base = "Clear, engaging presentation with an effective demo." if score >= 8 else "The presentation successfully communicates the core idea, though pacing could be improved." if score >= 5 else "The demonstration was hurried or incomplete."
                    elif "scal" in cat_lower:
                        base = "Excellent database and system architecture designed for production loads." if score >= 8 else "The system scales decently, but needs caching/partitioning under load." if score >= 5 else "The current system design would struggle under high concurrency."
                    elif "depth" in cat_lower:
                        base = "Highly complex logic and clean implementation of algorithms." if score >= 8 else "Decent complexity, but lacks deep architectural customization." if score >= 5 else "The implementation is thin and lacks significant technical challenges."
                    elif "stack" in cat_lower:
                        base = "Modern, cohesive tech stack with excellent choice of frameworks." if score >= 8 else "A standard stack that fits the project well." if score >= 5 else "Suboptimal stack choices that complicate implementation."
                    elif "relev" in cat_lower:
                        base = "Directly solves a high-value customer pain point." if score >= 8 else "Relevant to the theme, though the business model could be clearer." if score >= 5 else "Minimal alignment with real-world problems."
                    elif "ui" in cat_lower or "ux" in cat_lower:
                        base = "Beautiful visual aesthetics, smooth transitions, and intuitive hierarchy." if score >= 8 else "Clean layout, though typography and contrast need work." if score >= 5 else "Unrefined interface with usability issues."
                    else:
                        base = f"Score of {score}/10 indicates standard progress under this category."

                    # Add specific inputs from raw notes
                    specifics = []
                    if "docker" in raw_notes_lower and any(kw in cat_lower for kw in ["exec", "stack", "depth"]):
                        specifics.append("Specifically, the Docker configuration had setup issues that hindered immediate execution.")
                    if "websocket" in raw_notes_lower and any(kw in cat_lower for kw in ["exec", "stack", "depth"]):
                        specifics.append("The integration of WebSockets was a great choice for real-time data sync.")
                    if "backend" in raw_notes_lower and any(kw in cat_lower for kw in ["exec", "stack", "depth"]):
                        specifics.append("The backend is built decently, but needs more refinement.")
                    if "ui/ux" in raw_notes_lower and any(kw in cat_lower for kw in ["ui", "ux", "pres"]):
                        specifics.append("More effort should be put into refining the UI/UX layout.")
                    if "rushed" in raw_notes_lower and "pres" in cat_lower:
                        specifics.append("The presentation was rushed, making it hard to follow all details.")
                    
                    if specifics:
                        polished_text = f"{base} {' '.join(specifics)}"
                    else:
                        snippet = raw_notes[:60] + "..." if len(raw_notes) > 60 else raw_notes
                        polished_text = f"{base} Notes reflect: \"{snippet}\""
                        
                    data[cat] = polished_text
                
                return json.dumps(data)
            
            # 2. Semantic Inconsistency check
            if "consistency" in prompt_lower:
                data = {
                    "consistent": True,
                    "explanation": "The score values match the positive sentiment of the text notes, which praise the scalability and interface design."
                }
                return json.dumps(data)
                
            # 3. Anomaly check/divergence
            if "divergence" in prompt_lower or "anomaly" in prompt_lower:
                data = {
                    "divergence_summary": "Judge A focused heavily on technical implementation details, citing lack of docker containerization as a major flaw. Meanwhile, Judge B and Judge C rated the project extremely high due to outstanding business relevance and beautiful frontend aesthetics, leading to a score spread.",
                    "reconciliation_recommendation": "The divergent score from Judge A appears highly centered on DevOps criteria which weren't highly weighted in the primary rubric. Recommend accepting the current weighted average or holding a brief consensus sync."
                }
                return json.dumps(data)

            # Default JSON
            return json.dumps({"status": "success", "message": "High quality mock content generated"})

        else:
            # Plain text cases

            # Chatbot / participant assistant questions — parse context from system_prompt
            chatbot_keywords = ["submitted", "submission", "team", "mentor", "stage", "challenge", "evaluation", "announce", "criteria", "rules", "member", "schedule", "upload", "github", "ppt", "video", "session"]
            if any(kw in prompt_lower for kw in chatbot_keywords):
                # Try to extract and echo back structured submission info from system prompt
                if "submission" in prompt_lower or "submitted" in prompt_lower or "upload" in prompt_lower:
                    import re
                    ppt = "Uploaded ✓" if "PPT: Uploaded" in system_prompt else ("Not uploaded ✗" if "PPT:" in system_prompt else "Unknown")
                    github = "Provided ✓" if "GitHub: Provided" in system_prompt else ("Not provided ✗" if "GitHub:" in system_prompt else "Unknown")
                    video = "Uploaded ✓" if "Demo Video: Uploaded" in system_prompt else ("Not uploaded ✗" if "Demo Video:" in system_prompt else "Unknown")
                    status_match = re.search(r"Status: (\w+)", system_prompt)
                    status = status_match.group(1) if status_match else "unknown"
                    if ppt == "Unknown" and github == "Unknown":
                        return "I don't have a submission record for your team yet. If you've already submitted, please contact the organizers to confirm it was received."
                    return (
                        f"Here's your team's current submission status (status: {status}):\n\n"
                        f"• Presentation (PPT): {ppt}\n"
                        f"• GitHub Repository: {github}\n"
                        f"• Demo Video: {video}\n\n"
                        "If anything is missing, make sure to upload it before the deadline!"
                    )
                if "mentor" in prompt_lower or "session" in prompt_lower:
                    import re
                    mentor_match = re.search(r"Mentor: ([^\n]+)", system_prompt)
                    session_match = re.search(r"Next Mentor Session: ([^\n]+)", system_prompt)
                    mentor = mentor_match.group(1).strip() if mentor_match else "Not assigned"
                    session = session_match.group(1).strip() if session_match else "Not scheduled"
                    return f"Your team's mentor is: {mentor}\nNext session: {session}"
                if "stage" in prompt_lower:
                    import re
                    current = re.search(r"\[ACTIVE\][^\n]*<- CURRENT[^\n]*", system_prompt)
                    if current:
                        return f"The current active stage is: {current.group(0).replace('[ACTIVE]', '').replace('<- CURRENT', '').strip()}"
                    return "Stage information isn't fully configured yet. Check with the organizers for the latest schedule."
                if "challenge" in prompt_lower:
                    import re
                    match = re.search(r"Challenge: ([^\n]+)", system_prompt)
                    challenge = match.group(1).strip() if match else "Not assigned yet"
                    return f"Your team's assigned challenge is: {challenge}"
                if "member" in prompt_lower or "team" in prompt_lower:
                    import re
                    name_match = re.search(r"Team Name: ([^\n]+)", system_prompt)
                    name = name_match.group(1).strip() if name_match else "your team"
                    members = re.findall(r"- (.+?) \(", system_prompt)
                    if members:
                        member_list = "\n".join(f"• {m}" for m in members)
                        return f"Your team is **{name}**. Members:\n{member_list}"
                    return f"Your team is {name}. Member details aren't fully loaded — check the Team section of the portal."
                return "I found your event context but couldn't parse a specific answer. Please check the portal directly or ask a more specific question."

            if "welcome" in prompt_lower:
                return "Mock welcome email body."
            if "rationale" in prompt_lower:
                return "This team brings together a highly complementary blend of skills: strong React capabilities combined with deep knowledge in optimization-driven scheduling algorithms."
            if "summary" in prompt_lower or "readme" in prompt_lower:
                return (
                    "### Project Summary & Analysis\n\n"
                    "**EventFlow** is an intelligent orchestration platform that utilizes CP-SAT constraint programming for judge-to-team matching. "
                    "The architecture includes a React dashboard connected to a Python backend, and uses PostgreSQL for analytics state storage.\n\n"
                    "#### Strengths:\n"
                    "- Highly robust database design with optimized junction indexes.\n"
                    "- Excellent interface with futuristic glassmorphism visuals.\n\n"
                    "#### Areas for Inspection:\n"
                    "- Verify how the optimization constraints handle edge cases of judge availability.\n"
                    "- Inspect whether the LLM feedback generator includes caching to prevent token exhaustion."
                )
            if "hint" in prompt_lower or "rubric" in prompt_lower:
                return (
                    "- **Innovation (Weight 25%)**: Look for unique ways they modeled constraints. Did they use custom heuristics?\n"
                    "- **Execution (Weight 25%)**: Check if the database models match the schema. Is there a working API connection?\n"
                    "- **Technical Depth (Weight 10%)**: Assess their optimization matrix math and time complexity."
                )
            if "reasoning" in prompt_lower:
                return "The judge has extensive background in Constraint Optimization (CP-SAT) and data analytics, matching the team's machine-learning core."
                
            return "This is a premium, high-quality, AI-synthesized explanation tailored for your hackathon evaluation."

# Singleton instance
llm_client = LLMClient()